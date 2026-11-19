"""밴드 적립 쓰기(FC-REQ-029). 자산 × 결정일 × 사전등록 키 한 행 — 같은 주 재실행은 덮어쓴다(멱등)."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from sqlalchemy import Engine

from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import accumulation_band

COLUMNS: tuple[str, ...] = tuple(c.name for c in accumulation_band.columns)
_PK = ("asset", "plan_week", "prereg_key")


def save(engine: Engine, rows: Sequence[Mapping[str, Any]]) -> int:
    missing = [c for c in COLUMNS for r in rows if c not in r]
    if missing:
        raise ValueError(f"빠진 열 {sorted(set(missing))}")
    return bulk_upsert(engine, accumulation_band, COLUMNS, ([r[c] for c in COLUMNS] for r in rows), _PK)
