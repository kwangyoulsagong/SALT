"""업비트 거래 유의 · 주의 스냅샷 쓰기(FC-REQ-014 · market-warning@1). 불변 — 같은 키는 건너뛴다."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import Engine
from sqlalchemy.dialects.postgresql import insert

from salt_forecast.store.tables import market_warning_snapshot


@dataclass(frozen=True, slots=True)
class MarketWarning:
    symbol: str
    fetched_at: datetime
    warning: bool
    cautions: tuple[str, ...]  # 켜진 주의 종류, 알파벳 순


def insert_snapshot(engine: Engine, rows: Sequence[MarketWarning]) -> int:
    """스냅샷 한 번(종목 수백 행)을 한 문장으로. UPDATE 트리거가 있어 덮어쓰지 않고 DO NOTHING."""
    if not rows:
        return 0
    values = [
        {"symbol": r.symbol, "fetched_at": r.fetched_at, "warning": r.warning, "cautions": list(r.cautions)}
        for r in rows
    ]
    with engine.begin() as conn:
        stmt = insert(market_warning_snapshot).values(values).on_conflict_do_nothing()
        return len(conn.execute(stmt.returning(market_warning_snapshot.c.symbol)).all())
