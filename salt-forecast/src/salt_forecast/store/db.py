"""엔진 — import 시점에 연결하지 않는다(architecture.md §5)."""

from __future__ import annotations

from functools import lru_cache

from sqlalchemy import Engine, create_engine

from salt_forecast.config import settings


@lru_cache(maxsize=1)
def engine() -> Engine:
    return create_engine(settings().sqlalchemy_url(), pool_pre_ping=True, future=True)
