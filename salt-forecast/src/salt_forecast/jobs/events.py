"""주요 사건(거시 일정) — 일정 수집 → 반응 → 워크포워드 통계 (FC-REQ-005).

as_of 는 **UTC 자정으로 내린다** — 일봉이 00:00 UTC 에 닫히므로 하루 안의 어느 시각에 돌려도 같은 통계다(멱등).
일정 소스 하나가 실패해도 이미 저장된 일정으로 통계는 계산한다. 실패는 source_status 에 남는다.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, date, datetime

import httpx

from salt_forecast.config import settings
from salt_forecast.domain.events import HORIZONS, KINDS, Reaction, ReactionStats, reaction, stats
from salt_forecast.ingest import events as sources
from salt_forecast.ingest.http import Pacer, SourceError
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, symbols_arg
from salt_forecast.store.db import engine
from salt_forecast.store.events import events_known, upsert_events, upsert_reactions, upsert_stats
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.runs import mark_source

JOB = "events"
SINCE = date(2021, 1, 1)


def _day_floor(at: datetime) -> datetime:
    return datetime(at.year, at.month, at.day, tzinfo=UTC)


def main(argv: list[str] | None = None) -> int:
    p = base_parser("주요 사건 일정 · 반응 통계")
    p.add_argument("--skip-ingest", action="store_true", help="일정 수집을 건너뛰고 통계만")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        cfg = settings()
        eng = engine()
        now = parse_as_of(args.as_of)
        as_of = _day_floor(now)
        total = 0

        if not args.skip_ingest:
            failed: dict[str, str] = {}

            def guarded(source: str, fn: Callable[[], int]) -> int:
                try:
                    return fn()
                except SourceError as e:
                    failed[source] = str(e)
                    log.warning("일정 수집 실패", extra={"fields": {"job": JOB, "source": source, "error": str(e)}})
                    return 0

            def save(evs: list[sources.ScheduledEvent]) -> int:
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
            if not args.dry_run:
                for source in ("fred_release", "federalreserve"):
                    mark_source(eng, source, ok=source not in failed, error=failed.get(source))

        wanted = symbols_arg(args.symbols) or cfg.event_symbol_list()
        known = [e for e in events_known(eng, as_of) if e.event_at <= as_of]
        bars_by_symbol = load_ohlcv_series(eng, "upbit", "1d", wanted)
        all_reactions: list[Reaction] = []
        all_stats: list[ReactionStats] = []
        for symbol in wanted:
            bars = bars_by_symbol.get(symbol)
            if bars is None:
                log.warning("일봉 없음", extra={"fields": {"job": JOB, "symbol": symbol}})
                continue
            reactions = [r for e in known if (r := reaction(bars, e, as_of)) is not None]
            all_reactions += reactions
            all_stats += [stats(bars, kind, reactions, h, as_of) for kind in KINDS for h in HORIZONS]

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
                    "renderable": [f"{s.kind}:{s.horizon_days}d:{s.sample}" for s in all_stats if s.renderable],
                    "blocked": [
                        f"{s.kind}:{s.horizon_days}d:{s.blocked_reason}" for s in all_stats if not s.renderable
                    ],
                }
            },
        )
        return total

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
