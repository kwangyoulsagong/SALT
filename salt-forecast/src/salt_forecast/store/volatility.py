"""실현 변동성 쓰기 (FC-REQ-006). 서버는 forecast.v_realized_vol 뷰로 읽는다."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

from sqlalchemy import Engine

from salt_forecast.domain.volatility import VolEstimate
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import realized_vol

_COLS = (
    "symbol",
    "as_of",
    "last_bar_at",
    "sample",
    "ewma",
    "garch",
    "garch_alpha",
    "garch_beta",
    "qlike_ewma",
    "qlike_garch",
    "qlike_baseline",
    "method",
    "annualized",
    "blocked_reason",
    "computed_at",
)


def upsert_realized_vol(engine: Engine, estimates: Iterable[VolEstimate], now: datetime) -> int:
    rows = [
        (
            e.symbol,
            e.as_of,
            e.last_bar_at,
            e.sample,
            e.ewma,
            e.garch,
            e.garch_alpha,
            e.garch_beta,
            e.qlike_ewma,
            e.qlike_garch,
            e.qlike_baseline,
            e.method,
            e.annualized,
            e.blocked_reason,
            now,
        )
        for e in estimates
    ]
    return bulk_upsert(engine, realized_vol, _COLS, rows, ("symbol", "as_of"))
