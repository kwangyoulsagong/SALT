"""예측 · 점수 · 게이트 · 모델 행 쓰기와 읽기."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal

from sqlalchemy import Engine, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from salt_forecast.domain.quantiles import Direction, QuantileForecast
from salt_forecast.domain.scoring import GateResult, Score
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import QUANTILE_COLUMNS, gate, model, prediction, score

Kind = Literal["backtest", "live"]
_PK = ("symbol", "horizon_weeks", "as_of", "model_version")


@dataclass(frozen=True, slots=True)
class PredictionRow:
    symbol: str
    horizon_weeks: int
    as_of: datetime
    model_version: str
    kind: Kind
    base_close: float
    forecast: QuantileForecast
    direction: Direction


@dataclass(frozen=True, slots=True)
class ScoreRow:
    symbol: str
    horizon_weeks: int
    as_of: datetime
    model_version: str
    kind: Kind
    score: Score


def register_model(engine: Engine, model_version: str, name: str, params: dict[str, Any]) -> None:
    stmt = (
        pg_insert(model)
        .values(model_version=model_version, name=name, params=params, created_at=datetime.now(UTC))
        .on_conflict_do_nothing(index_elements=["model_version"])
    )
    with engine.begin() as conn:
        conn.execute(stmt)


def write_predictions(engine: Engine, rows: Iterable[PredictionRow]) -> int:
    now = datetime.now(UTC)
    cols = (*_PK, "kind", "base_close", *QUANTILE_COLUMNS, "p_up", "direction", "created_at")
    data = (
        (
            r.symbol,
            r.horizon_weeks,
            r.as_of,
            r.model_version,
            r.kind,
            r.base_close,
            *r.forecast.q,
            r.forecast.p_up,
            r.direction,
            now,
        )
        for r in rows
    )
    return bulk_upsert(engine, prediction, cols, data, _PK)


def write_scores(engine: Engine, rows: Iterable[ScoreRow]) -> int:
    now = datetime.now(UTC)
    cols = (*_PK, "kind", "realized", "hit90", "hit80", "width90", "pinball", "direction", "direction_hit", "scored_at")
    data = (
        (
            r.symbol,
            r.horizon_weeks,
            r.as_of,
            r.model_version,
            r.kind,
            r.score.realized,
            r.score.hit90,
            r.score.hit80,
            r.score.width90,
            r.score.pinball,
            r.score.direction,
            r.score.direction_hit,
            now,
        )
        for r in rows
    )
    return bulk_upsert(engine, score, cols, data, _PK)


def unscored_live(engine: Engine) -> list[PredictionRow]:
    stmt = (
        select(prediction)
        .outerjoin(
            score,
            (score.c.symbol == prediction.c.symbol)
            & (score.c.horizon_weeks == prediction.c.horizon_weeks)
            & (score.c.as_of == prediction.c.as_of)
            & (score.c.model_version == prediction.c.model_version),
        )
        .where(prediction.c.kind == "live", score.c.symbol.is_(None))
    )
    out: list[PredictionRow] = []
    with engine.connect() as conn:
        for r in conn.execute(stmt).mappings():
            fc = QuantileForecast(q=tuple(float(r[c]) for c in QUANTILE_COLUMNS), p_up=float(r["p_up"]))
            out.append(
                PredictionRow(
                    str(r["symbol"]),
                    int(r["horizon_weeks"]),
                    r["as_of"],
                    str(r["model_version"]),
                    "live",
                    float(r["base_close"]),
                    fc,
                    r["direction"],
                )
            )
    return out


def scores_for(engine: Engine, model_versions: Sequence[str]) -> list[ScoreRow]:
    """게이트용. as_of 오름차순."""
    stmt = select(score).where(score.c.model_version.in_(list(model_versions))).order_by(score.c.as_of)
    out: list[ScoreRow] = []
    with engine.connect() as conn:
        for r in conn.execute(stmt).mappings():
            s = Score(
                float(r["realized"]),
                bool(r["hit90"]),
                bool(r["hit80"]),
                float(r["width90"]),
                float(r["pinball"]),
                r["direction"],
                r["direction_hit"],
            )
            out.append(
                ScoreRow(str(r["symbol"]), int(r["horizon_weeks"]), r["as_of"], str(r["model_version"]), r["kind"], s)
            )
    return out


@dataclass(frozen=True, slots=True)
class GateRow:
    symbol: str
    horizon_weeks: int
    model_version: str
    baseline_version: str
    score_kind: Kind
    result: GateResult


def write_gates(engine: Engine, rows: Iterable[GateRow]) -> int:
    now = datetime.now(UTC)
    cols = (
        "symbol",
        "horizon_weeks",
        "model_version",
        "baseline_version",
        "evaluated_at",
        "renderable",
        "blocked_reason",
        "score_kind",
        "sample",
        "coverage90",
        "width90",
        "baseline_width90",
        "pinball_skill",
        "direction_calls",
        "direction_hits",
        "always_up_rate",
        "direction_base_rate",
        "range_renderable",
        "range_blocked_reason",
        "pinball_skill_ci_low",
    )
    data = (
        (
            g.symbol,
            g.horizon_weeks,
            g.model_version,
            g.baseline_version,
            now,
            g.result.renderable,
            g.result.blocked_reason,
            g.score_kind,
            g.result.sample,
            g.result.coverage90,
            g.result.width90,
            g.result.baseline_width90,
            g.result.pinball_skill,
            g.result.direction_calls,
            g.result.direction_hits,
            g.result.always_up_rate,
            g.result.direction_base_rate,
            g.result.range_renderable,
            g.result.range_blocked_reason,
            g.result.pinball_skill_ci_low,
        )
        for g in rows
    )
    return bulk_upsert(engine, gate, cols, data, ("symbol", "horizon_weeks"))
