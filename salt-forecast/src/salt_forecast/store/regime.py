"""시장 국면 한 행 쓰기(FC-REQ-009). 서버는 forecast.v_market_regime 뷰로 읽는다."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

from sqlalchemy import Engine

from salt_forecast.domain.regime import RegimeState
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import market_regime

_COLS = (
    "symbol", "as_of", "last_bar_at", "close", "sma_200d", "trend_open", "hmm_p_high", "hmm_fit_at",
    "hmm_sigma_low", "hmm_sigma_high", "drawdown_365d", "vol_ewma", "gate_key", "gate_open", "event_factor",
    "next_event_kind", "next_event_at", "prereg_key", "computed_at",
)  # fmt: skip


def upsert_market_regime(engine: Engine, states: Iterable[RegimeState], now: datetime) -> int:
    rows = [
        (
            s.symbol,
            s.as_of,
            s.last_bar_at,
            s.close,
            s.sma_200d,
            s.trend_open,
            s.hmm_p_high,
            s.hmm_fit_at,
            s.hmm_sigma_low,
            s.hmm_sigma_high,
            s.drawdown_365d,
            s.vol_ewma,
            s.gate_key,
            s.gate_open,
            s.event_factor,
            s.next_event_kind,
            s.next_event_at,
            s.prereg_key,
            now,
        )
        for s in states
    ]
    return bulk_upsert(engine, market_regime, _COLS, rows, ("symbol", "as_of"))
