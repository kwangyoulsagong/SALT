"""주요 사건 — 일정 수집 → 반응 → 워크포워드 통계 (FC-REQ-005 · 국내 FC-REQ-021).

as_of 는 **UTC 자정으로 내린다** — 일봉이 00:00 UTC 에 닫히므로 하루 안의 어느 시각에 돌려도 같은 통계다(멱등).
국내 일봉은 07:00 UTC(16:00 KST)에 닫히니 같은 as_of 에선 전 거래일까지 — 다음 날 실행이 그날 봉을 넣는다.
일정 소스 하나가 실패해도 이미 저장된 일정으로 통계는 계산한다. 실패는 source_status 에 남는다.

| 묶음 | 일봉 | 사건 종류 |
|---|---|---|
| 코인(`event_symbols`, 비우면 업비트 일봉 전부) | 업비트 1d | 미국 거시 3 |
| 국내(`kr_event_symbols` 또는 보유 · 관심 + 거래대금 상위 + `KR-EW`) | KIS 1d | 국내 4 + 미국 거시 3(FR-8) |
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from datetime import UTC, date, datetime, timedelta

import httpx
import numpy as np
from numpy.typing import NDArray

from salt_forecast.config import settings
from salt_forecast.domain import kr_market_proxy
from salt_forecast.domain.events import (
    HORIZONS,
    KINDS,
    KR_KINDS,
    Reaction,
    ReactionStats,
    ScheduledEvent,
    first_of_months,
    quad_expiry_days,
    reaction,
    scheduled,
    stats,
)
from salt_forecast.domain.kr_breaks import up_limit_breaks
from salt_forecast.domain.series import OhlcvSeries
from salt_forecast.ingest import events as sources
from salt_forecast.ingest import kr_events as kr_sources
from salt_forecast.ingest import krx_daily
from salt_forecast.ingest.http import Pacer, SourceError
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, symbols_arg
from salt_forecast.store.db import engine
from salt_forecast.store.events import events_known, upsert_events, upsert_reactions, upsert_stats
from salt_forecast.store.kr_stock import kr_tracked_symbols, krx_closed_dates
from salt_forecast.store.prices import load_ohlcv_series, top_by_value
from salt_forecast.store.prices import symbols as price_symbols
from salt_forecast.store.runs import mark_source

JOB = "events"
SINCE = date(2021, 1, 1)
# 규칙 일정은 앞으로 이만큼 — 다가오는 일정 목록(최대 35일, SRV-REQ-041 FR-5)보다 넉넉히
RULE_AHEAD = timedelta(days=120)
# 거래대금 상위 — 최근 20 거래일 ≈ 30 일
TOP_DAYS = 30


def _day_floor(at: datetime) -> datetime:
    return datetime(at.year, at.month, at.day, tzinfo=UTC)


def _break_cum(bars: OhlcvSeries) -> NDArray[np.int64]:
    return np.cumsum(up_limit_breaks(bars.close)).astype(np.int64)


def _compute(
    bars: OhlcvSeries,
    events: Sequence[ScheduledEvent],
    kinds: Sequence[str],
    as_of: datetime,
    break_cum: NDArray[np.int64] | None,
) -> tuple[list[Reaction], list[ReactionStats]]:
    """종목 하나 — 시장 사건(`symbol == ''`) 과 이 종목 사건만(종목 사건은 2단계, FR-13)."""
    mine = [e for e in events if e.kind in kinds and e.symbol in ("", bars.symbol)]
    reactions = [r for e in mine if (r := reaction(bars, e, as_of, break_cum)) is not None]
    return reactions, [stats(bars, kind, reactions, h, as_of, break_cum) for kind in kinds for h in HORIZONS]


def main(argv: list[str] | None = None) -> int:
    p = base_parser("주요 사건 일정 · 반응 통계")
    p.add_argument("--skip-ingest", action="store_true", help="일정 수집을 건너뛰고 통계만")
    p.add_argument("--skip-kr", action="store_true", help="국내 묶음을 건너뛴다")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        cfg = settings()
        eng = engine()
        now = parse_as_of(args.as_of)
        as_of = _day_floor(now)
        total = 0
        rejected_cpi = 0

        if not args.skip_ingest:
            failed: dict[str, str] = {}

            def guarded(source: str, fn: Callable[[], int]) -> int:
                try:
                    return fn()
                except SourceError as e:
                    failed[source] = str(e)
                    log.warning("일정 수집 실패", extra={"fields": {"job": JOB, "source": source, "error": str(e)}})
                    return 0

            def save(evs: list[ScheduledEvent]) -> int:
                return len(evs) if args.dry_run else upsert_events(eng, evs, now)

            with httpx.Client(headers={"Accept": "application/json"}) as client:
                if cfg.fred_api_key is None:
                    failed["fred_release"] = "FORECAST_FRED_API_KEY 없음"
                else:
                    key = cfg.fred_api_key.get_secret_value()
                    pacer = Pacer(1.5)
                    for kind in sources.FRED_RELEASES:
                        total += guarded(
                            "fred_release",
                            lambda kind=kind: save(
                                sources.fred_release_events(client, cfg.fred_url, key, pacer, kind, SINCE)
                            ),
                        )
                total += guarded("federalreserve", lambda: save(sources.fomc_events(client, Pacer(0.5))))

                if not args.skip_kr:
                    # 한국은행 · 국가데이터처 — 명시 한도가 없어 하루 1회 · 초당 1(security-sources.md §1)
                    today = now.date()
                    total += guarded("bok", lambda: save(kr_sources.bok_events(client, Pacer(1.0), today.year + 1)))

                    def cpi() -> int:
                        nonlocal rejected_cpi
                        evs, rejected_cpi = kr_sources.cpi_events(client, Pacer(1.0))
                        return save(evs)

                    total += guarded("mods", cpi)

            if not args.skip_kr:
                # 규칙 일정 — 외부 호출 없음. 휴장일은 서버의 KRX 공시 표(미래 포함)
                ahead = now.date() + RULE_AHEAD
                closed = set(krx_closed_dates(eng))
                rule = [scheduled("kr_trade", d, "rule", "매월 1일 09:00 KST") for d in first_of_months(SINCE, ahead)]
                rule += [
                    scheduled("kr_quad_expiry", d, "rule", "3·6·9·12월 둘째 목요일(휴장이면 직전 거래일)")
                    for d in quad_expiry_days(SINCE, ahead, closed)
                ]
                total += save(rule)
            if not args.dry_run:
                names = ["fred_release", "federalreserve"] + ([] if args.skip_kr else ["bok", "mods"])
                for source in names:
                    mark_source(eng, source, ok=source not in failed, error=failed.get(source))

        known = [e for e in events_known(eng, as_of) if e.event_at <= as_of]
        all_reactions: list[Reaction] = []
        all_stats: list[ReactionStats] = []

        wanted = symbols_arg(args.symbols) or cfg.event_symbol_list() or price_symbols(eng, "upbit", "1d")
        bars_by_symbol = load_ohlcv_series(eng, "upbit", "1d", wanted)
        for symbol in wanted:
            bars = bars_by_symbol.get(symbol)
            if bars is None:
                log.warning("일봉 없음", extra={"fields": {"job": JOB, "symbol": symbol}})
                continue
            rs, ss = _compute(bars, known, KINDS, as_of, None)
            all_reactions += rs
            all_stats += ss

        kr_wanted: list[str] = []
        if not args.skip_kr:
            kr_bars = {
                s: b.as_of(int(as_of.timestamp()))
                for s, b in load_ohlcv_series(eng, krx_daily.SOURCE, krx_daily.INTERVAL).items()
            }
            kr_wanted = cfg.kr_event_symbol_list() or sorted(
                set(kr_tracked_symbols(eng))
                | set(top_by_value(eng, krx_daily.SOURCE, krx_daily.INTERVAL, as_of, TOP_DAYS, cfg.kr_event_top))
            )
            kr_kinds = KR_KINDS + KINDS
            for symbol in kr_wanted:
                bars = kr_bars.get(symbol)
                if bars is None or bars.available_at.size == 0:
                    log.warning("국내 일봉 없음", extra={"fields": {"job": JOB, "symbol": symbol}})
                    continue
                rs, ss = _compute(bars, known, kr_kinds, as_of, _break_cum(bars))
                all_reactions += rs
                all_stats += ss
            proxy = kr_market_proxy.equal_weight_index(kr_bars)
            if proxy.available_at.size:
                rs, ss = _compute(proxy, known, kr_kinds, as_of, None)
                all_reactions += rs
                all_stats += ss
                kr_wanted.append(proxy.symbol)

        if not args.dry_run:
            total += upsert_reactions(eng, all_reactions, now)
            total += upsert_stats(eng, all_stats)
        log.info(
            "사건 통계",
            extra={
                "fields": {
                    "job": JOB,
                    "as_of": as_of.isoformat(),
                    "events": len(known),
                    "reactions": len(all_reactions),
                    "kr_symbols": len(kr_wanted),
                    "cpi_board_rejected": rejected_cpi,
                    "renderable": sorted({f"{s.kind}:{s.horizon_days}d" for s in all_stats if s.renderable}),
                    "renderable_rows": sum(1 for s in all_stats if s.renderable),
                    "blocked": {
                        reason: sum(1 for s in all_stats if s.blocked_reason == reason)
                        for reason in sorted({s.blocked_reason for s in all_stats if s.blocked_reason})
                    },
                }
            },
        )
        return total

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
