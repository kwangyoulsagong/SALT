"""시세 봉 읽기 · 쓰기."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from itertools import pairwise
from typing import Any

import numpy as np
from numpy.typing import NDArray
from sqlalchemy import Engine, Select, func, select

from salt_forecast.domain.series import CloseSeries, OhlcvSeries
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
    return {s: CloseSeries(s, t, v[0]) for s, (t, v) in _read_grouped(engine, stmt, 1).items()}


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


def load_ohlcv_series(
    engine: Engine, source: str, interval: str, symbols: Sequence[str] | None = None
) -> dict[str, OhlcvSeries]:
    """한 쿼리로 OHLCV 전부. 거래량이 없는 봉은 NaN(0 으로 채우지 않는다)."""
    stmt = (
        select(
            price_bar.c.symbol,
            func.extract("epoch", price_bar.c.available_at),
            price_bar.c.open,
            price_bar.c.high,
            price_bar.c.low,
            price_bar.c.close,
            price_bar.c.volume,
        )
        .where(price_bar.c.source == source, price_bar.c.interval == interval)
        .order_by(price_bar.c.symbol, price_bar.c.available_at)
    )
    if symbols is not None:
        stmt = stmt.where(price_bar.c.symbol.in_(list(symbols)))
    return {s: OhlcvSeries(s, t, *v) for s, (t, v) in _read_grouped(engine, stmt, 5).items()}


_CHUNK = 100_000


def _read_grouped(
    engine: Engine, stmt: Select[Any], n: int
) -> dict[str, tuple[NDArray[np.int64], list[NDArray[np.float64]]]]:
    """(종목, epoch, 값 n개) 행을 청크로 배열에 옮겨 종목별로 자른다. 종목 · 시각 순 정렬이 전제다.

    행마다 파이썬 리스트에 쌓으면 국내 286만 행에서 중간 객체가 1GB 를 넘었다(FC-REQ-020 P4) — 청크 하나만 객체로
    든다. 값 변환은 그대로다: 시각은 `int`, 값은 `float`(없으면 NaN, 0 으로 채우지 않는다). 종목 순서는 DB 순서.
    """
    names: dict[str, int] = {}
    code_parts: list[NDArray[np.int32]] = []
    time_parts: list[NDArray[np.int64]] = []
    val_parts: list[list[NDArray[np.float64]]] = [[] for _ in range(n)]
    with engine.connect().execution_options(stream_results=True, yield_per=_CHUNK) as conn:
        for part in conn.execute(stmt).partitions(_CHUNK):
            cols = list(zip(*part, strict=True))
            code_parts.append(np.asarray([names.setdefault(str(x), len(names)) for x in cols[0]], dtype=np.int32))
            time_parts.append(np.asarray([int(x) for x in cols[1]], dtype=np.int64))
            for i in range(n):
                val_parts[i].append(
                    np.asarray([float("nan") if x is None else float(x) for x in cols[2 + i]], dtype=np.float64)
                )
    if not code_parts:
        return {}
    codes = np.concatenate(code_parts)
    times = np.concatenate(time_parts)
    del time_parts
    vals: list[NDArray[np.float64]] = []
    while val_parts:
        vals.append(np.concatenate(val_parts.pop(0)))
    by_code = list(names)
    cuts = [0, *(np.flatnonzero(codes[1:] != codes[:-1]) + 1).tolist(), len(codes)]
    # 조각은 큰 배열의 뷰다 — 복사하지 않는다(종목별 시리즈가 같은 버퍼를 나눠 쓴다)
    return {by_code[int(codes[a])]: (times[a:b], [v[a:b] for v in vals]) for a, b in pairwise(cuts)}


def top_by_value(engine: Engine, source: str, interval: str, as_of: datetime, days: int, n: int) -> list[str]:
    """as_of 전 `days` 일 거래대금(수량 × 종가) 합 상위 n 종목. 봉 마감이 as_of 이하만(누수 없음)."""
    value = func.sum(price_bar.c.volume * price_bar.c.close)
    stmt = (
        select(price_bar.c.symbol)
        .where(
            price_bar.c.source == source,
            price_bar.c.interval == interval,
            price_bar.c.available_at <= as_of,
            price_bar.c.available_at > as_of - timedelta(days=days),
        )
        .group_by(price_bar.c.symbol)
        .order_by(value.desc().nulls_last())
        .limit(n)
    )
    with engine.connect() as conn:
        return [str(r[0]) for r in conn.execute(stmt)]
