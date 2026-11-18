"""시계열 점(거시 · 파생 · 스테이블코인) 읽기 · 쓰기. 빈티지는 available_at 으로 구분한다."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import datetime

import numpy as np
from sqlalchemy import Engine, delete, func, insert, select

from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import series_point


@dataclass(frozen=True, slots=True)
class SeriesPoint:
    source: str
    series_id: str
    observed_at: datetime
    available_at: datetime
    value: float
    unit: str


_COLS = ("source", "series_id", "observed_at", "available_at", "value", "unit")
_PK = ("source", "series_id", "observed_at", "available_at")


def upsert_points(engine: Engine, points: Iterable[SeriesPoint]) -> int:
    unique = {(p.source, p.series_id, p.observed_at, p.available_at): p for p in points}
    rows = ((p.source, p.series_id, p.observed_at, p.available_at, p.value, p.unit) for p in unique.values())
    return bulk_upsert(engine, series_point, _COLS, rows, _PK)


def latest_observed(engine: Engine, source: str) -> dict[str, datetime]:
    """시리즈별 마지막 관측 시각 — 증분 수집 시작점."""
    stmt = (
        select(series_point.c.series_id, func.max(series_point.c.observed_at))
        .where(series_point.c.source == source)
        .group_by(series_point.c.series_id)
    )
    with engine.connect() as conn:
        return {str(r[0]): r[1] for r in conn.execute(stmt)}


def load_vintaged(engine: Engine, source: str | None = None) -> dict[str, VintagedSeries]:
    """한 쿼리로 전부 읽어 시리즈별 VintagedSeries 로. 키는 series_id(소스가 달라도 id 가 겹치지 않게 짓는다)."""
    stmt = select(
        series_point.c.series_id,
        func.extract("epoch", series_point.c.observed_at),
        func.extract("epoch", series_point.c.available_at),
        series_point.c.value,
    )
    if source is not None:
        stmt = stmt.where(series_point.c.source == source)
    cols: dict[str, tuple[list[int], list[int], list[float]]] = {}
    with engine.connect() as conn:
        for sid, obs, avail, value in conn.execute(stmt):
            o, a, v = cols.setdefault(str(sid), ([], [], []))
            o.append(int(obs))
            a.append(int(avail))
            v.append(float(value))
    return {
        sid: VintagedSeries.build(
            np.asarray(o, dtype=np.int64), np.asarray(a, dtype=np.int64), np.asarray(v, dtype=np.float64)
        )
        for sid, (o, a, v) in cols.items()
    }


def observed_days(engine: Engine, source: str, series_prefix: str) -> set[tuple[str, datetime]]:
    """(series_id, observed_at) 이미 있는 것 — 백필 재시작 지점."""
    stmt = select(series_point.c.series_id, series_point.c.observed_at).where(
        series_point.c.source == source, series_point.c.series_id.startswith(series_prefix)
    )
    with engine.connect() as conn:
        return {(str(r[0]), r[1]) for r in conn.execute(stmt)}


def points_by_series(engine: Engine, source: str) -> dict[str, dict[datetime, float]]:
    """소스의 시리즈별 (observed_at → 값). 빈티지가 여럿이면 가장 늦게 알게 된 값(이어 붙이기 기준용 — 피처용 아님)."""
    stmt = (
        select(series_point.c.series_id, series_point.c.observed_at, series_point.c.value)
        .where(series_point.c.source == source)
        .order_by(series_point.c.available_at)
    )
    out: dict[str, dict[datetime, float]] = {}
    with engine.connect() as conn:
        for sid, obs, value in conn.execute(stmt):
            out.setdefault(str(sid), {})[obs] = float(value)
    return out


def replace_series(
    engine: Engine, source: str, series_id: str, points: Sequence[SeriesPoint], ingested_at: datetime
) -> int:
    """시리즈를 통째로 바꾼다 — 기준 연도가 바뀌면 원천이 과거 전체를 새 기준으로 다시 주는 지수.

    첫 쓰임은 소비자물가(FC-REQ-024 FR-6).

    수정주가와 같은 예외(time-and-leakage.md §3): 비율은 기준과 무관하고, 옛 기준 과거 + 새 기준 최근이 섞이면 안 된다.
    `ingested_at` 은 부르는 작업이 준다(다건 바인딩에 SQL 함수를 실을 수 없다 — 2026-11-18 실저장에서 깼다).
    지우기와 넣기가 한 트랜잭션 — 중간에 실패하면 옛 시리즈가 그대로 남는다. 빈 목록이면 아무것도 지우지 않는다.
    """
    if not points:
        return 0
    if any(p.source != source or p.series_id != series_id for p in points):
        raise ValueError("다른 시리즈 점이 섞였다")
    rows = [
        {"source": p.source, "series_id": p.series_id, "observed_at": p.observed_at, "available_at": p.available_at,
         "value": p.value, "unit": p.unit, "ingested_at": ingested_at}
        for p in points
    ]  # fmt: skip
    with engine.begin() as conn:
        conn.execute(delete(series_point).where(series_point.c.source == source, series_point.c.series_id == series_id))
        conn.execute(insert(series_point), rows)
    return len(rows)
