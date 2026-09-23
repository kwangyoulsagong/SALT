"""시세 봉 읽기 · 쓰기."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

import numpy as np
from sqlalchemy import Engine, func, select

from salt_forecast.domain.series import CloseSeries
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import price_bar


@dataclass(frozen=True, slots=True)
class Bar:
    source: str
    symbol: str
    interval: str
    open_time: datetime
    close_time: datetime
    available_at: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal | None


_COLUMNS = (
    "source",
    "symbol",
    "interval",
    "open_time",
    "close_time",
    "available_at",
    "open",
    "high",
    "low",
    "close",
    "volume",
)


def upsert_bars(engine: Engine, bars: Iterable[Bar]) -> int:
    """같은 봉이 두 번 오면(구간 겹침) 마지막 것만 — 한 INSERT … ON CONFLICT 는 같은 행을 두 번 못 바꾼다."""
    unique = {(b.source, b.symbol, b.interval, b.open_time): b for b in bars}
    bars = unique.values()
    rows = (
        (
            b.source,
            b.symbol,
            b.interval,
            b.open_time,
            b.close_time,
            b.available_at,
            b.open,
            b.high,
            b.low,
            b.close,
            b.volume,
        )
        for b in bars
    )
    return bulk_upsert(engine, price_bar, _COLUMNS, rows, ("source", "symbol", "interval", "open_time"))


def earliest_open(engine: Engine, source: str, interval: str) -> dict[str, datetime]:
    """종목별 가장 이른 봉 — 백필 재시작 지점(performance.md §4)."""
    stmt = (
        select(price_bar.c.symbol, func.min(price_bar.c.open_time))
        .where(price_bar.c.source == source, price_bar.c.interval == interval)
        .group_by(price_bar.c.symbol)
    )
    with engine.connect() as conn:
        return {str(r[0]): r[1] for r in conn.execute(stmt)}


def load_close_series(
    engine: Engine, source: str, interval: str, symbols: Sequence[str] | None = None
) -> dict[str, CloseSeries]:
    """한 쿼리로 전부 읽는다. 시각은 available_at, UTC epoch 초."""
    stmt = (
        select(price_bar.c.symbol, func.extract("epoch", price_bar.c.available_at), price_bar.c.close)
        .where(price_bar.c.source == source, price_bar.c.interval == interval)
        .order_by(price_bar.c.symbol, price_bar.c.available_at)
    )
    if symbols is not None:
        stmt = stmt.where(price_bar.c.symbol.in_(list(symbols)))
    times: dict[str, list[int]] = defaultdict(list)
    closes: dict[str, list[float]] = defaultdict(list)
    with engine.connect() as conn:
        for sym, epoch, close in conn.execute(stmt):
            times[str(sym)].append(int(epoch))
            closes[str(sym)].append(float(close))
    return {
        s: CloseSeries(s, np.asarray(times[s], dtype=np.int64), np.asarray(closes[s], dtype=np.float64)) for s in times
    }


def symbols(engine: Engine, source: str, interval: str) -> list[str]:
    stmt = select(price_bar.c.symbol).where(price_bar.c.source == source, price_bar.c.interval == interval).distinct()
    with engine.connect() as conn:
        return sorted(str(r[0]) for r in conn.execute(stmt))


def latest_open(engine: Engine, source: str, interval: str) -> dict[str, datetime]:
    stmt = (
        select(price_bar.c.symbol, func.max(price_bar.c.open_time))
        .where(price_bar.c.source == source, price_bar.c.interval == interval)
        .group_by(price_bar.c.symbol)
    )
    with engine.connect() as conn:
        return {str(r[0]): r[1] for r in conn.execute(stmt)}
