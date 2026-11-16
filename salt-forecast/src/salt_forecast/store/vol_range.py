"""H1 흔들림 · 범위 쓰기 · 읽기(FC-REQ-028 FR-9 · DB-REQ-043 FR-14). 서버는 아직 읽지 않는다."""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass, replace
from datetime import datetime
from typing import Any

from sqlalchemy import Engine, text

from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.jsonb import dumps
from salt_forecast.store.tables import vol_range_prediction, vol_range_test


def _f(x: float | None) -> float | None:
    return x if x is not None and math.isfinite(x) else None


@dataclass(frozen=True, slots=True)
class TestRow:
    market: str
    horizon: int
    model_version: str | None
    status: str
    reason: str | None
    window_from: datetime | None
    window_to: datetime | None
    eval_rows: int
    eval_days: int
    excluded_nonpos: int
    qlike: dict[str, float]
    p_holm: dict[str, float]
    cover80: float | None
    cover95: float | None
    cover_rows: int
    cover_by_year: dict[str, dict[str, float]]
    placebo_pass: bool
    forward: dict[str, object]
    looks_done: int
    live_params: dict[str, object] | None
    live_ready: bool


_TEST_COLS = (
    "prereg_key", "market", "horizon", "run_as_of", "model_version", "status", "reason", "window_from", "window_to",
    "eval_rows", "eval_days", "excluded_nonpos", "qlike_har", "qlike_b1", "qlike_b2", "qlike_b3", "p_holm_b1",
    "p_holm_b2", "p_holm_b3", "cover80", "cover95", "cover_rows", "cover_by_year", "placebo_pass", "forward",
    "looks_done", "live_params", "live_ready", "computed_at",
)  # fmt: skip


def save_test(engine: Engine, key: str, run_as_of: datetime, rows: Sequence[TestRow], at: datetime) -> int:
    values: list[Sequence[Any]] = [
        (
            key, r.market, r.horizon, run_as_of, r.model_version, r.status, r.reason, r.window_from, r.window_to,
            r.eval_rows, r.eval_days, r.excluded_nonpos, _f(r.qlike.get("har")), _f(r.qlike.get("b1")),
            _f(r.qlike.get("b2")), _f(r.qlike.get("b3")), _f(r.p_holm.get("b1")), _f(r.p_holm.get("b2")),
            _f(r.p_holm.get("b3")), _f(r.cover80), _f(r.cover95), r.cover_rows, dumps(r.cover_by_year),
            r.placebo_pass, dumps(r.forward), r.looks_done,
            None if r.live_params is None else dumps(r.live_params), r.live_ready, at,
        )
        for r in rows
    ]  # fmt: skip
    return bulk_upsert(engine, vol_range_test, _TEST_COLS, values, ("prereg_key", "market", "horizon", "run_as_of"))


@dataclass(frozen=True, slots=True)
class Previous:
    status: str
    reason: str | None
    looks_done: int


def model_version_at(engine: Engine, key: str, at: datetime) -> str | None:
    """그 시각에 돌던 코드 — at 전 마지막 시험 실행의 model_version(동결 재생 가드)."""
    sql = text(
        "SELECT model_version FROM forecast.vol_range_test WHERE prereg_key = :key AND run_as_of <= :at "
        "AND model_version IS NOT NULL ORDER BY run_as_of DESC LIMIT 1"
    )
    with engine.connect() as conn:
        v = conn.execute(sql, {"key": key, "at": at}).scalar()
    return None if v is None else str(v)


def previous(engine: Engine, key: str, before: datetime) -> dict[tuple[str, int], Previous]:
    """칸마다 이번 실행 직전 상태 — 판정 날짜에 정한 pass · fail · 끝낸 판정 수를 이어 간다."""
    sql = text(
        """
        SELECT DISTINCT ON (market, horizon) market, horizon, status, reason, looks_done
        FROM forecast.vol_range_test WHERE prereg_key = :key AND run_as_of < :before
        ORDER BY market, horizon, run_as_of DESC
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"key": key, "before": before}).all()
    return {(str(m), int(h)): Previous(str(s), None if r is None else str(r), int(n)) for m, h, s, r, n in rows}


@dataclass(frozen=True, slots=True)
class PredictionRow:
    market: str
    horizon: int
    symbol: str
    ref_at: datetime
    model_version: str
    rv_har: float
    rv_b1: float | None
    rv_b2: float | None
    rv_b3: float | None
    half80: float | None
    half95: float | None
    recorded_at: datetime
    realized_rv: float | None = None
    realized_r: float | None = None
    in_time: bool | None = None
    scored_at: datetime | None = None


_PRED_COLS = (
    "prereg_key", "market", "horizon", "symbol", "ref_at", "model_version", "rv_har", "rv_b1", "rv_b2", "rv_b3",
    "half80", "half95", "recorded_at", "realized_rv", "realized_r", "in_time", "scored_at",
)  # fmt: skip
_PRED_PK = ("prereg_key", "market", "horizon", "symbol", "ref_at")


def _pred_values(key: str, rows: Sequence[PredictionRow]) -> list[Sequence[Any]]:
    return [
        (
            key, r.market, r.horizon, r.symbol, r.ref_at, r.model_version, r.rv_har, _f(r.rv_b1), _f(r.rv_b2),
            _f(r.rv_b3), _f(r.half80), _f(r.half95), r.recorded_at, _f(r.realized_rv), _f(r.realized_r), r.in_time,
            r.scored_at,
        )
        for r in rows
    ]  # fmt: skip


def save_new_predictions(engine: Engine, key: str, rows: Sequence[PredictionRow]) -> int:
    """이미 있는 (칸, 종목, 기준 봉)은 건드리지 않는다 — 첫 기록 시각이 전진 시험의 근거다."""
    if not rows:
        return 0
    refs = sorted({r.ref_at for r in rows})
    sql = text(
        "SELECT market, horizon, symbol, ref_at FROM forecast.vol_range_prediction "
        "WHERE prereg_key = :key AND ref_at = ANY(:refs)"
    )
    with engine.connect() as conn:
        have = {(str(m), int(h), str(s), t) for m, h, s, t in conn.execute(sql, {"key": key, "refs": refs}).all()}
    new = [r for r in rows if (r.market, r.horizon, r.symbol, r.ref_at) not in have]
    return bulk_upsert(engine, vol_range_prediction, _PRED_COLS, _pred_values(key, new), _PRED_PK)


def save_scored(engine: Engine, key: str, rows: Sequence[PredictionRow]) -> int:
    return bulk_upsert(engine, vol_range_prediction, _PRED_COLS, _pred_values(key, rows), _PRED_PK)


def load_predictions(engine: Engine, key: str, *, open_only: bool) -> list[PredictionRow]:
    where = "AND scored_at IS NULL" if open_only else ""
    sql = text(f"SELECT {', '.join(_PRED_COLS[1:])} FROM forecast.vol_range_prediction WHERE prereg_key = :key {where}")
    with engine.connect() as conn:
        rows = conn.execute(sql, {"key": key}).all()
    return [PredictionRow(*r) for r in rows]  # pyright: ignore[reportArgumentType]


def scored(row: PredictionRow, rv: float, r: float, in_time: bool, at: datetime) -> PredictionRow:
    return replace(row, realized_rv=rv, realized_r=r, in_time=in_time, scored_at=at)
