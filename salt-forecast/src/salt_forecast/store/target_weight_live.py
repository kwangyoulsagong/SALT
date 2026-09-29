"""core 모델 포트폴리오 라이브 원장 읽기 · 쓰기(FC-REQ-013). 서버는 forecast.v_target_weight_live 뷰로 읽는다.

비중 · 결과 행은 불변이다(UPDATE 트리거). 같은 키가 이미 있으면 쓰지 않고 값을 대조한다 — 다르면 `LedgerMismatch`.
행 수가 작아(주 5행) COPY 가 아니라 한 문장 INSERT 로 쓴다.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import Engine, select
from sqlalchemy.dialects.postgresql import insert

from salt_forecast.scoring.target_weight_live import UNIVERSE, OutcomeRow, SummaryRow, WeightRow, same_weights
from salt_forecast.store.tables import (
    target_weight_live_outcome,
    target_weight_live_summary,
    target_weight_live_weight,
)


class LedgerMismatch(RuntimeError):
    """다시 계산한 원장 값이 저장값과 다르다 — 봉 보정이나 코드 변경. 원장을 고치지 않고 작업을 멈춘다."""


@dataclass(frozen=True, slots=True)
class Stored:
    weights: dict[tuple[float, datetime], tuple[dict[str, float], datetime]]
    outcomes: dict[tuple[float, datetime], OutcomeRow]


def _num(x: float | None) -> float | None:
    return None if x is None or not math.isfinite(x) else x


def load(engine: Engine, key: str) -> Stored:
    w, o = target_weight_live_weight, target_weight_live_outcome
    with engine.connect() as conn:
        wrows = conn.execute(
            select(w.c.target, w.c.rebalance_at, w.c.weights, w.c.recorded_at).where(
                w.c.prereg_key == key, w.c.universe == UNIVERSE
            )
        ).all()
        orows = conn.execute(select(o).where(o.c.prereg_key == key, o.c.universe == UNIVERSE)).all()
    weights = {(float(r[0]), r[1]): ({str(k): float(v) for k, v in r[2].items()}, r[3]) for r in wrows}
    outcomes = {
        (float(r.target), r.rebalance_at): OutcomeRow(
            float(r.target), r.rebalance_at, r.week_end, str(r.status),
            {str(k): float(v) for k, v in r.returns.items()},
            r.strategy_log_return, r.btc_log_return, r.cost,
        )
        for r in orows
    }  # fmt: skip
    return Stored(weights, outcomes)


def check_weights(stored: Stored, rows: Sequence[WeightRow]) -> list[WeightRow]:
    """새로 쓸 비중 행. 이미 있는 행은 값이 같아야 한다."""
    new: list[WeightRow] = []
    for r in rows:
        have = stored.weights.get((r.target, r.rebalance_at))
        if have is None:
            new.append(r)
        elif not same_weights(have[0], r.weights):
            raise LedgerMismatch(f"비중 불일치 target={r.target} rebalance_at={r.rebalance_at.isoformat()}")
    return new


def check_outcomes(stored: Stored, rows: Sequence[OutcomeRow]) -> list[OutcomeRow]:
    new: list[OutcomeRow] = []
    for r in rows:
        have = stored.outcomes.get((r.target, r.rebalance_at))
        if have is None:
            new.append(r)
            continue
        same = have.status == r.status and same_weights(have.returns, r.returns)
        if same and r.strategy_log_return is not None and have.strategy_log_return is not None:
            same = abs(r.strategy_log_return - have.strategy_log_return) <= 1e-9
        if not same:
            raise LedgerMismatch(f"결과 불일치 target={r.target} rebalance_at={r.rebalance_at.isoformat()}")
    return new


def write_weights(engine: Engine, key: str, rows: Sequence[WeightRow], now: datetime) -> int:
    if not rows:
        return 0
    values = [
        {"prereg_key": key, "universe": UNIVERSE, "target": r.target, "rebalance_at": r.rebalance_at,
         "weights": r.weights, "sigma": r.sigma, "exposure": r.exposure, "recorded_at": now}
        for r in rows
    ]  # fmt: skip
    with engine.begin() as conn:
        conn.execute(insert(target_weight_live_weight).values(values).on_conflict_do_nothing())
    return len(values)


def write_outcomes(engine: Engine, key: str, rows: Sequence[OutcomeRow], now: datetime) -> int:
    if not rows:
        return 0
    values = [
        {"prereg_key": key, "universe": UNIVERSE, "target": r.target, "rebalance_at": r.rebalance_at,
         "week_end": r.week_end, "status": r.status, "returns": r.returns,
         "strategy_log_return": r.strategy_log_return, "btc_log_return": r.btc_log_return, "cost": r.cost,
         "recorded_at": now}
        for r in rows
    ]  # fmt: skip
    with engine.begin() as conn:
        conn.execute(insert(target_weight_live_outcome).values(values).on_conflict_do_nothing())
    return len(values)


def write_summaries(engine: Engine, key: str, rows: Sequence[SummaryRow], now: datetime) -> int:
    if not rows:
        return 0
    t = target_weight_live_summary
    values = [
        {"prereg_key": key, "universe": UNIVERSE, "target": r.target, "as_of": r.as_of,
         "first_rebalance_at": r.first_rebalance_at, "n_weeks": r.summary.n_weeks, "n_excluded": r.n_excluded,
         "cum_return": _num(r.summary.cum_return), "btc_cum_return": _num(r.summary.btc_cum_return),
         "mdd": _num(r.summary.mdd), "btc_mdd": _num(r.summary.btc_mdd), "vol": _num(r.summary.vol),
         "upside": _num(r.summary.upside), "downside": _num(r.summary.downside),
         "worst_weeks": [{k: (_num(v) if isinstance(v, float) else v) for k, v in w.items()} for w in r.worst_weeks],
         "computed_at": now}
        for r in rows
    ]  # fmt: skip
    stmt = insert(t).values(values)
    keep = {"prereg_key", "universe", "target", "as_of"}
    stmt = stmt.on_conflict_do_update(
        index_elements=[t.c.prereg_key, t.c.universe, t.c.target, t.c.as_of],
        set_={c.name: stmt.excluded[c.name] for c in t.columns if c.name not in keep},
    )
    with engine.begin() as conn:
        conn.execute(stmt)
    return len(values)
