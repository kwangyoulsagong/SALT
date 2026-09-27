"""시장 신호 읽기 · 쓰기 (FC-REQ-007). 서버는 forecast.v_market_signal · v_signal_reaction 뷰로 읽는다."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import Engine, func, select

from salt_forecast.domain.events import Reaction
from salt_forecast.domain.signals import Points
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import market_signal, series_point, signal_event


def load_points(engine: Engine, source: str, prefix: str, as_of: datetime) -> dict[str, Points]:
    """`<prefix>:<BASE>` 시리즈를 BASE 별로. available_at ≤ as_of 만(time-and-leakage.md §2)."""
    stmt = (
        select(
            series_point.c.series_id,
            func.extract("epoch", series_point.c.available_at),
            series_point.c.value,
        )
        .where(
            series_point.c.source == source,
            series_point.c.series_id.like(f"{prefix}:%"),
            series_point.c.available_at <= as_of,
        )
        .order_by(series_point.c.series_id, series_point.c.available_at)
    )
    cols: dict[str, tuple[list[int], list[float]]] = defaultdict(lambda: ([], []))
    with engine.connect() as conn:
        for sid, at, value in conn.execute(stmt):
            t, v = cols[str(sid).split(":", 1)[1]]
            t.append(int(at))
            v.append(float(value))
    return {base: Points.build(t, v) for base, (t, v) in cols.items()}


@dataclass(frozen=True, slots=True)
class SignalRow:
    symbol: str
    as_of: datetime
    bar_open: datetime
    funding_rate: float | None
    funding_pct_1y: float | None
    funding_sample: int
    funding_state: str | None
    oi_usd: float | None
    oi_at: datetime | None
    oi_change_7d: float | None
    kimchi_premium: float | None
    kimchi_state: str | None
    kimchi_since: datetime | None
    fx_usdkrw: float | None
    fx_observed_at: datetime | None


_SIGNAL_COLS = (
    "symbol",
    "as_of",
    "bar_open",
    "funding_rate",
    "funding_pct_1y",
    "funding_sample",
    "funding_state",
    "oi_usd",
    "oi_at",
    "oi_change_7d",
    "kimchi_premium",
    "kimchi_state",
    "kimchi_since",
    "fx_usdkrw",
    "fx_observed_at",
    "computed_at",
)


def upsert_signals(engine: Engine, rows: Iterable[SignalRow], now: datetime) -> int:
    data = [
        (
            r.symbol,
            r.as_of,
            r.bar_open,
            r.funding_rate,
            r.funding_pct_1y,
            r.funding_sample,
            r.funding_state,
            r.oi_usd,
            r.oi_at,
            r.oi_change_7d,
            r.kimchi_premium,
            r.kimchi_state,
            r.kimchi_since,
            r.fx_usdkrw,
            r.fx_observed_at,
            now,
        )
        for r in rows
    ]
    return bulk_upsert(engine, market_signal, _SIGNAL_COLS, data, ("symbol", "as_of"))


def upsert_signal_events(engine: Engine, events: Iterable[tuple[Reaction, float]], now: datetime) -> int:
    """사건 × 반응. 창이 아직 안 닫힌 기간은 null — 다음 실행이 채운다."""
    rows = [
        (
            r.kind,
            r.symbol,
            r.event_at,
            value,
            r.ref_bar_open,
            r.pre_return_5d,
            r.returns[1],
            r.returns[5],
            r.returns[20],
            now,
        )
        for r, value in events
    ]
    return bulk_upsert(
        engine,
        signal_event,
        (
            "kind",
            "symbol",
            "event_at",
            "value",
            "ref_bar_open",
            "pre_return_5d",
            "ret_1d",
            "ret_5d",
            "ret_20d",
            "computed_at",
        ),
        rows,
        ("kind", "symbol", "event_at"),
    )
