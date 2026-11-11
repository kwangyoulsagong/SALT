"""점검 원장 읽기(export 뷰) · 채점 결과 쓰기(FC-REQ-028 FR-4)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Engine, text

from salt_forecast.domain.trade_check import CheckRow, Outcome
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import trade_check_outcome


def unscored_checks(engine: Engine, as_of: datetime) -> list[CheckRow]:
    """as_of 까지 점검했고 아직 결과가 없는 줄. 원장은 export 뷰로만 읽는다(public 직접 읽기 목록을 늘리지 않는다)."""
    sql = text(
        """
        SELECT l.id, l.symbol, l.market, l.side, l.condition_id, l.horizon, l.up_rate, l.price_at_check, l.checked_at
        FROM public.v_trade_check_ledger_export l
        LEFT JOIN forecast.trade_check_outcome o ON o.ledger_id = l.id
        WHERE o.ledger_id IS NULL AND l.checked_at <= :as_of AND l.price_at_check IS NOT NULL
        ORDER BY l.checked_at
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"as_of": as_of.replace(tzinfo=None)}).all()
    out: list[CheckRow] = []
    for r in rows:
        market = str(r[2])
        symbol = str(r[1]) if market == "kr" else f"KRW-{str(r[1]).upper()}"
        checked = r[8]
        if checked.tzinfo is None:  # 원장은 timestamp(3) — Prisma 가 UTC 로 쓴다
            checked = checked.replace(tzinfo=UTC)
        out.append(
            CheckRow(
                str(r[0]),
                symbol,
                market,
                str(r[3]),
                str(r[4]),
                int(r[5]),
                None if r[6] is None else float(r[6]),
                float(r[7]),
                checked,
            )
        )
    return out


_COLS = (
    "ledger_id", "market", "side", "condition_id", "horizon", "shown_up_rate", "end_at", "realized", "went_up",
    "scored_at",
)  # fmt: skip


def save_outcomes(engine: Engine, outcomes: Sequence[Outcome], scored_at: datetime) -> int:
    rows: list[Sequence[Any]] = [
        (
            o.ledger_id,
            o.market,
            o.side,
            o.condition_id,
            o.horizon,
            o.shown_up_rate,
            o.end_at,
            o.realized,
            o.went_up,
            scored_at,
        )
        for o in outcomes
    ]
    return bulk_upsert(engine, trade_check_outcome, _COLS, rows, ("ledger_id",))


def outcome_summary(engine: Engine) -> list[tuple[str, str, int, float | None, float]]:
    """시장 · 방향마다 채점된 수 · 보여 준 비율 평균 · 실제 오른 비율 — 리포트용(보정도 첫 줄)."""
    sql = text(
        """
        SELECT market, side, count(*), avg(shown_up_rate), avg(went_up::int)
        FROM forecast.trade_check_outcome GROUP BY market, side ORDER BY market, side
        """
    )
    with engine.connect() as conn:
        return [
            (str(r[0]), str(r[1]), int(r[2]), None if r[3] is None else float(r[3]), float(r[4]))
            for r in conn.execute(sql)
        ]
