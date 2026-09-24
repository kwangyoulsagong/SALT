"""시계열 점(거시 · 파생 · 스테이블코인) 읽기 · 쓰기. 빈티지는 available_at 으로 구분한다."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime

import numpy as np
from sqlalchemy import Engine, func, select

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
