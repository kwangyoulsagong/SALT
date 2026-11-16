"""H3 큰 움직임 × 소식 쓰기 · 읽기(FC-REQ-028 FR-9 · DB-REQ-043 FR-14). 서버는 아직 읽지 않는다."""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import Engine, text

from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.jsonb import dumps
from salt_forecast.store.tables import move_news_event, move_news_test


def _f(x: float | None) -> float | None:
    return x if x is not None and math.isfinite(x) else None


@dataclass(frozen=True, slots=True)
class EventRow:
    market: str
    symbol: str
    ref_at: datetime
    r: float
    sigma: float
    news_count: int
    volume_high: bool
    covered: bool
    source_ok: bool
    recorded_at: datetime
    s1: float | None = None
    s5: float | None = None
    cost1: float | None = None
    cost5: float | None = None
    in_time1: bool | None = None
    in_time5: bool | None = None
    scored_at: datetime | None = None


_EV_COLS = (
    "prereg_key", "market", "symbol", "ref_at", "r", "sigma", "news_count", "volume_high", "covered", "source_ok",
    "recorded_at", "s1", "s5", "cost1", "cost5", "in_time1", "in_time5", "scored_at",
)  # fmt: skip
_EV_PK = ("prereg_key", "market", "symbol", "ref_at")


def _values(key: str, rows: Sequence[EventRow]) -> list[Sequence[Any]]:
    return [
        (
            key, e.market, e.symbol, e.ref_at, e.r, e.sigma, e.news_count, e.volume_high, e.covered, e.source_ok,
            e.recorded_at, _f(e.s1), _f(e.s5), _f(e.cost1), _f(e.cost5), e.in_time1, e.in_time5, e.scored_at,
        )
        for e in rows
    ]  # fmt: skip


def load_events(engine: Engine, key: str, market: str) -> list[EventRow]:
    sql = text(
        f"SELECT {', '.join(_EV_COLS[1:])} FROM forecast.move_news_event WHERE prereg_key = :key AND market = :m"
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"key": key, "m": market}).all()
    return [EventRow(*r) for r in rows]  # pyright: ignore[reportArgumentType]


def save_events(engine: Engine, key: str, rows: Sequence[EventRow]) -> int:
    """새 사건 · 라벨이 닫힌 사건 모두 전체 행으로. 기록 값(소식 · 거래량 · recorded_at)은 호출자가 그대로 넘긴다."""
    return bulk_upsert(engine, move_news_event, _EV_COLS, _values(key, rows), _EV_PK)


@dataclass(frozen=True, slots=True)
class TestRow:
    market: str
    horizon: int
    test: str
    origin: str
    status: str
    reason: str | None
    events: int
    days: int
    stat: float
    t: float
    p: float
    p_holm: float
    placebo_q95: float
    placebo_pass: bool
    robust_same_sign: bool
    detail: dict[str, object]
    looks_done: int


_TEST_COLS = (
    "prereg_key", "market", "horizon", "test", "origin", "run_as_of", "status", "reason", "events", "days", "stat",
    "t", "p", "p_holm", "placebo_q95", "placebo_pass", "robust_same_sign", "detail", "looks_done", "computed_at",
)  # fmt: skip


def save_tests(engine: Engine, key: str, run_as_of: datetime, rows: Sequence[TestRow], at: datetime) -> int:
    values: list[Sequence[Any]] = [
        (
            key, r.market, r.horizon, r.test, r.origin, run_as_of, r.status, r.reason, r.events, r.days, _f(r.stat),
            _f(r.t), _f(r.p), _f(r.p_holm), _f(r.placebo_q95), r.placebo_pass, r.robust_same_sign,
            dumps(r.detail), r.looks_done, at,
        )
        for r in rows
    ]  # fmt: skip
    pk = ("prereg_key", "market", "horizon", "test", "origin", "run_as_of")
    return bulk_upsert(engine, move_news_test, _TEST_COLS, values, pk)


def previous(engine: Engine, key: str, before: datetime) -> dict[tuple[str, int, str], tuple[str, str | None, int]]:
    """전진 칸 × 검정마다 직전 (상태, 사유, 끝낸 판정 수)."""
    sql = text(
        """
        SELECT DISTINCT ON (market, horizon, test) market, horizon, test, status, reason, looks_done
        FROM forecast.move_news_test WHERE prereg_key = :key AND origin = 'forward' AND run_as_of < :before
        ORDER BY market, horizon, test, run_as_of DESC
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"key": key, "before": before}).all()
    return {(str(m), int(h), str(t)): (str(s), None if r is None else str(r), int(n)) for m, h, t, s, r, n in rows}
