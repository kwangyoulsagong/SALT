"""원인 설명 채점 읽기 · 쓰기(cause-explain@1 · FC-REQ-022 FR-15). 서버는 아직 읽지 않는다."""

from __future__ import annotations

import math
from collections.abc import Sequence
from datetime import UTC, date, datetime
from typing import Any, cast

from sqlalchemy import Engine, text

from salt_forecast.domain.cause_explain import Cell
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.jsonb import dumps
from salt_forecast.store.tables import cause_explain_test


def _f(x: float) -> float | None:
    return x if math.isfinite(x) else None


def load_outcomes(engine: Engine, *, as_of: datetime) -> dict[tuple[str, date, int], tuple[float, datetime]]:
    """(엔티티, 거래일, h) → (초과 수익, 라벨 available_at). as_of 에 닫힌 라벨만."""
    sql = text(
        "SELECT entity, trade_date, horizon, excess, available_at FROM forecast.outcome WHERE available_at <= :as_of"
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"as_of": as_of}).all()
    out: dict[tuple[str, date, int], tuple[float, datetime]] = {}
    for e, d, h, x, t in rows:
        at = cast(datetime, t)
        out[(str(e), cast(date, d), int(h))] = (float(x), at if at.tzinfo else at.replace(tzinfo=UTC))
    return out


_COLS = (
    "prereg_key", "market", "horizon", "run_as_of", "status", "reason", "rows_scored", "rows_cold", "days",
    "brier_kind",
    "brier_base", "skill", "t", "p", "p_holm", "detail", "looks_done", "computed_at",
)  # fmt: skip


def save_tests(
    engine: Engine,
    key: str,
    run_as_of: datetime,
    cells: Sequence[Cell],
    details: Sequence[dict[str, object]],
    looks: int,
    at: datetime,
) -> int:
    values: list[Sequence[Any]] = [
        (
            key, c.market, c.horizon, run_as_of, c.status, c.reason, c.rows_scored, c.rows_cold, c.days,
            _f(c.brier_kind), _f(c.brier_base), _f(c.skill), _f(c.t), _f(c.p), _f(c.p_holm), dumps(d), looks, at,
        )
        for c, d in zip(cells, details, strict=True)
    ]  # fmt: skip
    return bulk_upsert(engine, cause_explain_test, _COLS, values, ("prereg_key", "market", "horizon", "run_as_of"))


def previous(engine: Engine, key: str, before: datetime) -> dict[tuple[str, int], tuple[str, str | None, int]]:
    """칸마다 직전 (상태, 사유, 끝낸 판정 수)."""
    sql = text(
        """
        SELECT DISTINCT ON (market, horizon) market, horizon, status, reason, looks_done
        FROM forecast.cause_explain_test WHERE prereg_key = :key AND run_as_of < :before
        ORDER BY market, horizon, run_as_of DESC
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"key": key, "before": before}).all()
    return {(str(m), int(h)): (str(s), None if r is None else str(r), int(n)) for m, h, s, r, n in rows}
