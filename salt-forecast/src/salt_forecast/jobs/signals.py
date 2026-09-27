"""시장 신호 — 펀딩비 쏠림 · 김치 프리미엄 0 교차 → 지금 상태 · 사건 · 사건 뒤 반응 통계 (FC-REQ-007).

as_of 는 UTC 자정으로 내린다 — 일봉이 00:00 UTC 에 닫히므로 하루 안의 어느 시각에 돌려도 같은 값이다(멱등).
대상은 업비트 원화 종목 중 바이낸스 펀딩비나 USDT 현물이 있는 것. 반응 통계는 주요 사건과 같은 규칙
(`domain/events.py` — 워크포워드 · 표본 10 · 빗나간 때)으로 `event_reaction_stats` 에 쌓는다.
"""

from __future__ import annotations

import math
from datetime import UTC, datetime

from salt_forecast.domain.events import HORIZONS, Reaction, ReactionStats, ScheduledEvent, reaction, stats
from salt_forecast.domain.series import DAY
from salt_forecast.domain.signals import (
    KINDS,
    SignalEvent,
    daily_signals,
    funding_events,
    funding_state,
    fx_on_grid,
    kimchi_regime,
    open_interest,
)
from salt_forecast.ingest import ecb
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job, symbols_arg
from salt_forecast.store.db import engine
from salt_forecast.store.events import upsert_stats
from salt_forecast.store.prices import load_close_series, load_ohlcv_series
from salt_forecast.store.series import load_vintaged
from salt_forecast.store.signals import SignalRow, load_points, upsert_signal_events, upsert_signals

JOB = "signals"
# 마지막 봉이 이보다 오래되면 "지금 상태"를 쓰지 않는다 — 상장 폐지 · 수집 중단 종목
STALE_AFTER = 2 * DAY


def _dt(epoch: int) -> datetime:
    return datetime.fromtimestamp(epoch, UTC)


def main(argv: list[str] | None = None) -> int:
    args = base_parser("시장 신호(펀딩비 쏠림 · 김치 프리미엄)").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        as_of = datetime(now.year, now.month, now.day, tzinfo=UTC)
        at = int(as_of.timestamp())

        bars_by_symbol = load_ohlcv_series(eng, "upbit", "1d", symbols_arg(args.symbols))
        usdt_by_symbol = load_close_series(eng, "binance", "1d")
        funding = load_points(eng, "binance", "funding", as_of)
        oi = load_points(eng, "binance", "oi_usd", as_of)
        fx_series = load_vintaged(eng, ecb.SOURCE).get(ecb.SERIES)
        grid = sorted({int(t) for b in bars_by_symbol.values() for t in b.available_at if t <= at})
        fx = fx_on_grid(fx_series, grid) if fx_series is not None else None

        states: list[SignalRow] = []
        events: list[tuple[Reaction, float]] = []
        all_stats: list[ReactionStats] = []
        for symbol, full in bars_by_symbol.items():
            base = symbol.removeprefix("KRW-")
            usdt = usdt_by_symbol.get(f"{base}USDT")
            f_points = funding.get(base)
            if usdt is None and f_points is None:
                continue
            bars = full.as_of(at)
            if not len(bars.available_at):
                continue
            d = daily_signals(bars, usdt.as_of(at) if usdt is not None else None, f_points, fx)
            regime = kimchi_regime(d)
            found: list[SignalEvent] = funding_events(d) + regime.events

            reactions: list[Reaction] = []
            for ev in found:
                when = _dt(ev.event_at)
                r = reaction(bars, ScheduledEvent(ev.kind, when, when, "derived", symbol), as_of)
                if r is not None:
                    reactions.append(r)
                    events.append((r, ev.value))
            kinds = [k for k in KINDS if (k.startswith("funding") and f_points) or (k.startswith("kimchi") and usdt)]
            all_stats += [stats(bars, k, reactions, h, as_of) for k in kinds for h in HORIZONS]

            last = len(d.at) - 1
            if at - int(d.at[last]) > STALE_AFTER:
                continue
            rate, pct, kimchi = float(d.funding[last]), float(d.funding_pct[last]), float(d.kimchi[last])
            has_kimchi = not math.isnan(kimchi)
            o = open_interest(oi.get(base), at)
            states.append(
                SignalRow(
                    symbol=symbol,
                    as_of=as_of,
                    bar_open=_dt(int(d.at[last]) - DAY),
                    funding_rate=None if math.isnan(rate) else rate,
                    funding_pct_1y=None if math.isnan(pct) else pct,
                    funding_sample=int(d.funding_sample[last]),
                    funding_state=funding_state(pct),
                    oi_usd=o.usd if o else None,
                    oi_at=_dt(o.at) if o else None,
                    oi_change_7d=o.change_7d if o else None,
                    kimchi_premium=kimchi if has_kimchi else None,
                    kimchi_state=None if regime.state is None else ("premium" if regime.state > 0 else "discount"),
                    kimchi_since=_dt(regime.since) if regime.since is not None else None,
                    fx_usdkrw=float(d.fx[last]) if has_kimchi else None,
                    fx_observed_at=_dt(int(d.fx_observed[last])) if has_kimchi else None,
                )
            )

        renderable = [f"{s.symbol}:{s.kind}:{s.horizon_days}d" for s in all_stats if s.renderable]
        log.info(
            "시장 신호",
            extra={
                "fields": {
                    "job": JOB,
                    "as_of": as_of.isoformat(),
                    "symbols": len(states),
                    "fx": fx_series is not None,
                    "events": {k: sum(1 for r, _ in events if r.kind == k) for k in KINDS},
                    "renderable": len(renderable),
                    "renderable_btc": [s for s in renderable if s.startswith("KRW-BTC:")],
                    "long_crowded": sorted(s.symbol for s in states if s.funding_state == "long_crowded")[:20],
                }
            },
        )
        if args.dry_run:
            return len(states) + len(events) + len(all_stats)
        return upsert_signals(eng, states, now) + upsert_signal_events(eng, events, now) + upsert_stats(eng, all_stats)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
