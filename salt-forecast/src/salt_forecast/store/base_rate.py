"""기저율 · 라이브 문턱 쓰기(FC-REQ-028 FR-2 · DB-REQ-043 FR-3)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Engine, delete, func, select

from salt_forecast.domain.base_rate import StatRow, Trigger
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import base_rate_stat, base_rate_trigger


def price(x: float | None) -> Decimal | None:
    """가격 · 원화 문턱 float → numeric — 유효숫자 10자리(국내 원 · 코인 소수 가격 둘 다). 변환은 여기 한 곳."""
    return None if x is None else Decimal(f"{x:.10g}")


_STAT_COLS = (
    "prereg_key", "market", "condition_id", "horizon", "as_of", "kind", "status", "sample", "sample_eff",
    "sample_days", "up_rate", "up_rate_shrunk", "up_low", "up_high", "mean", "q10", "q50", "q90", "hold_up_rate",
    "hold_q10", "hold_q50", "hold_q90", "p_holm", "differs", "recent_differs", "window_start", "window_end",
    "computed_at", "horizon_unit",
)  # fmt: skip
_STAT_PK = ("prereg_key", "market", "condition_id", "horizon", "as_of")
_TRIGGER_COLS = (
    "prereg_key", "market", "symbol", "condition_id", "applies_to", "as_of", "ref_close", "ref_at", "price_at_least",
    "price_at_most", "open_at_least", "value_at_least",
)  # fmt: skip
_TRIGGER_PK = ("prereg_key", "symbol", "condition_id", "applies_to", "as_of")


def save_run(
    engine: Engine,
    key: str,
    as_of: datetime,
    computed_at: datetime,
    market: str,
    window: tuple[date, date],
    stats: Sequence[StatRow],
    triggers: Sequence[Trigger],
    horizon_unit: str = "day",
    keep_triggers_since: datetime | None = None,
) -> int:
    """한 시장 한 실행. 같은 as_of 재실행은 문턱을 지우고 다시 쓴다 — 이번에 성립 안 하는 옛 문턱이 남지 않게.

    `keep_triggers_since` — 매시 도는 장중 기저율(base-rate@2)은 그 전 실행의 문턱을 지운다. 뷰는 최신 실행 문턱만
    읽으니 옛 문턱은 쓸모가 없고, 지우지 않으면 한 해 1천만 행이 쌓인다. 통계 행(시간당 수십)은 남긴다(이력).
    """
    stat_rows: list[Sequence[Any]] = [
        (
            key,
            s.market,
            s.condition_id,
            s.horizon,
            as_of,
            s.kind,
            s.stat.status,
            s.stat.sample,
            s.stat.sample_eff,
            s.stat.sample_days,
            s.stat.up_rate,
            s.verdict.up_rate_shrunk,
            s.stat.up_low,
            s.stat.up_high,
            s.stat.mean,
            s.stat.q10,
            s.stat.q50,
            s.stat.q90,
            s.stat.hold_up_rate,
            s.stat.hold_q10,
            s.stat.hold_q50,
            s.stat.hold_q90,
            s.verdict.p_holm,
            s.verdict.differs,
            s.stat.recent_differs,
            window[0],
            window[1],
            computed_at,
            horizon_unit,
        )
        for s in stats
    ]
    trigger_rows: list[Sequence[Any]] = [
        (
            key,
            t.market,
            t.symbol,
            t.condition_id,
            t.applies_to,
            as_of,
            price(t.ref_close),
            datetime.fromtimestamp(t.ref_at, tz=UTC),
            price(t.price_at_least),
            price(t.price_at_most),
            price(t.open_at_least),
            price(t.value_at_least),
        )
        for t in triggers
    ]
    t = base_rate_trigger.c
    with engine.begin() as conn:
        conn.execute(delete(base_rate_trigger).where(t.prereg_key == key, t.market == market, t.as_of == as_of))
        if keep_triggers_since is not None:
            conn.execute(
                delete(base_rate_trigger).where(t.prereg_key == key, t.market == market, t.as_of < keep_triggers_since)
            )
    # 문턱 먼저, 통계 나중 — 뷰는 통계의 최신 as_of 로 문턱을 고른다. 문턱이 다 들어가기 전에 그 as_of 가 보이지 않게
    n = bulk_upsert(engine, base_rate_trigger, _TRIGGER_COLS, trigger_rows, _TRIGGER_PK)
    return n + bulk_upsert(engine, base_rate_stat, _STAT_COLS, stat_rows, _STAT_PK)


def latest_stat_as_of(engine: Engine, key: str, market: str) -> datetime | None:
    """그 키 · 시장의 마지막 통계 실행.

    문턱만 다시 쓰는 실행(5분마다)이 이 as_of 로 쓴다 — 뷰가 통계의 최신 as_of 로 문턱을 고른다."""
    c = base_rate_stat.c
    with engine.connect() as conn:
        return conn.execute(select(func.max(c.as_of)).where(c.prereg_key == key, c.market == market)).scalar()


def replace_triggers(engine: Engine, key: str, market: str, as_of: datetime, triggers: Sequence[Trigger]) -> int:
    """문턱만 통째로 바꾼다(장중 기저율 5분 실행).

    그 키 · 시장의 옛 문턱은 전부 지운다 — 뷰는 최신 통계 as_of 문턱만 본다."""
    rows: list[Sequence[Any]] = [
        (
            key, t.market, t.symbol, t.condition_id, t.applies_to, as_of, price(t.ref_close),
            datetime.fromtimestamp(t.ref_at, tz=UTC), price(t.price_at_least), price(t.price_at_most),
            price(t.open_at_least), price(t.value_at_least),
        )
        for t in triggers
    ]  # fmt: skip
    c = base_rate_trigger.c
    with engine.begin() as conn:
        conn.execute(delete(base_rate_trigger).where(c.prereg_key == key, c.market == market))
    return bulk_upsert(engine, base_rate_trigger, _TRIGGER_COLS, rows, _TRIGGER_PK)
