"""시세 봉 읽기 · 쓰기."""

from __future__ import annotations

from collections.abc import Collection, Iterable, Sequence
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from itertools import pairwise
from typing import Any

import numpy as np
from numpy.typing import NDArray
from sqlalchemy import Engine, Select, func, select, text

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


def delete_bars_before(engine: Engine, source: str, interval: str, first_open: dict[str, datetime]) -> int:
    """종목마다 first_open 보다 앞선 봉을 지운다 — 원천이 이력을 다시 써서 앞쪽이 짧아졌을 때 옛 기준 봉이 남지 않게.

    국내 주식: 서버가 수정주가 재작성을 보면 그 종목 일봉을 통째로 바꾸는데(SRV-REQ-040 FR-42), upsert 는 지우지 않아
    새 이력에 없는 앞쪽 날이 옛 기준으로 남는다(FC-REQ-020 FR-10). 한 문장 · 종목 배열.
    """
    if not first_open:
        return 0
    symbols = list(first_open)
    stmt = text(
        "DELETE FROM forecast.price_bar pb USING unnest(CAST(:symbols AS text[]), CAST(:firsts AS timestamptz[])) "
        "AS f(symbol, first_open) "
        "WHERE pb.source = :source AND pb.interval = :interval AND pb.symbol = f.symbol AND pb.open_time < f.first_open"
    )
    with engine.begin() as conn:
        result = conn.execute(
            stmt,
            {"symbols": symbols, "firsts": [first_open[s] for s in symbols], "source": source, "interval": interval},
        )
    return int(result.rowcount)


def delete_bars_outside_hours(
    engine: Engine, source: str, interval: str, symbols: Collection[str], days: Sequence[tuple[date, int, int]]
) -> int:
    """종목 × 날마다 그날 정규장 [시작 분, 마감 분)(KST) 밖 봉을 지운다.

    장 시간이 평상일과 다른 날(`krx_shifted_days`)만 넘긴다. 고정 09:00 ~ 15:30 으로 옮기던 때 수능일 동시호가
    예상가 봉(09:30 · 09:35)이 남았다. upsert 는 지우지 않으므로 여기서.
    종목 × 날 쌍마다 기본 키 (source, symbol, interval, open_time) 범위 — 표를 훑지 않는다.
    """
    if not symbols or not days:
        return 0
    syms = sorted(symbols)
    pairs = [(s, d, o, c) for s in syms for d, o, c in days]
    stmt = text(
        "DELETE FROM forecast.price_bar pb USING unnest(CAST(:symbols AS text[]), CAST(:days AS date[]), "
        "CAST(:opens AS int[]), CAST(:closes AS int[])) AS k(symbol, day, open_min, close_min) "
        "WHERE pb.source = :source AND pb.interval = :interval AND pb.symbol = k.symbol "
        "AND pb.open_time >= (k.day::timestamp AT TIME ZONE 'Asia/Seoul') "
        "AND pb.open_time < ((k.day + 1)::timestamp AT TIME ZONE 'Asia/Seoul') "
        "AND (EXTRACT(HOUR FROM pb.open_time AT TIME ZONE 'Asia/Seoul') * 60 "
        "+ EXTRACT(MINUTE FROM pb.open_time AT TIME ZONE 'Asia/Seoul') NOT BETWEEN k.open_min AND k.close_min - 1)"
    )
    with engine.begin() as conn:
        result = conn.execute(
            stmt,
            {
                "symbols": [p[0] for p in pairs],
                "days": [p[1] for p in pairs],
                "opens": [p[2] for p in pairs],
                "closes": [p[3] for p in pairs],
                "source": source,
                "interval": interval,
            },
        )
    return int(result.rowcount)


# 종목마다 한 값(목록 · 최초 · 최신)은 표를 훑지 않고 기본 키 (source, symbol, interval, open_time) 를 건너뛰며 찾는다
# (재귀 CTE skip-scan). GROUP BY · DISTINCT 로 물으면 Postgres 는 그 출처의 모든 행(10GB · 3,800만 행)을 병렬로 훑는다 —
# 장중 회차마다 최장 189초 IO 를 잡아 서버 패널이 6분 동안 504 216번(2026-11-17 17:04~17:09).
# skip-scan 은 종목 수만큼 인덱스 찾기(실측 32ms)
SKIP_SYMBOLS_SQL = """
WITH RECURSIVE s AS (
  SELECT min(symbol) AS sym FROM forecast.price_bar WHERE source = :source
  UNION ALL
  SELECT (SELECT min(symbol) FROM forecast.price_bar WHERE source = :source AND symbol > s.sym)
  FROM s WHERE s.sym IS NOT NULL
)
"""


def _per_symbol(engine: Engine, source: str, interval: str, agg: str) -> dict[str, datetime]:
    sql = text(
        SKIP_SYMBOLS_SQL
        + f"""SELECT sym, (SELECT {agg}(open_time) FROM forecast.price_bar
                 WHERE source = :source AND symbol = s.sym AND interval = :interval) AS at
           FROM s WHERE sym IS NOT NULL"""
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"source": source, "interval": interval}).all()
    # 그 간격 봉이 없는 종목(다른 간격만 있는 종목)은 뺀다 — GROUP BY 와 같은 결과
    return {str(r[0]): r[1] for r in rows if r[1] is not None}


def earliest_open(engine: Engine, source: str, interval: str) -> dict[str, datetime]:
    """종목별 가장 이른 봉 — 백필 재시작 지점(performance.md §4). skip-scan(위)."""
    return _per_symbol(engine, source, interval, "min")


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
    """그 출처 · 간격에 봉이 있는 종목 — skip-scan(위, DISTINCT 는 표 전체를 훑는다)."""
    return sorted(_per_symbol(engine, source, interval, "max"))


def latest_open(engine: Engine, source: str, interval: str) -> dict[str, datetime]:
    """종목별 가장 늦은 봉 — 증분 수집 시작점. skip-scan(위)."""
    return _per_symbol(engine, source, interval, "max")


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


def load_ohlcv_window(
    engine: Engine, source: str, interval: str, start: datetime, end: datetime
) -> dict[str, OhlcvSeries]:
    """`start <= available_at <= end` 봉만.

    5분봉 2년(약 6천만 행)은 한 번에 못 든다 — 장중 기저율(base-rate@3)이 구간마다 읽는다."""
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
        .where(
            price_bar.c.source == source,
            price_bar.c.interval == interval,
            price_bar.c.available_at >= start,
            price_bar.c.available_at <= end,
        )
        .order_by(price_bar.c.symbol, price_bar.c.available_at)
    )
    return {s: OhlcvSeries(s, t, *v) for s, (t, v) in _read_grouped(engine, stmt, 5).items()}


def available_span(engine: Engine, source: str, interval: str) -> tuple[datetime, datetime] | None:
    """그 원천 · 봉 길이의 첫 · 마지막 available_at."""
    stmt = select(func.min(price_bar.c.available_at), func.max(price_bar.c.available_at)).where(
        price_bar.c.source == source, price_bar.c.interval == interval
    )
    with engine.connect() as conn:
        row = conn.execute(stmt).one()
    return None if row[0] is None else (row[0], row[1])


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
