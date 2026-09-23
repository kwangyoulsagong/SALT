"""채점 · 게이트 판정 조립. 계산은 domain, 여기는 짝짓기만."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable, Sequence
from datetime import datetime

from salt_forecast.domain.quantiles import QuantileForecast
from salt_forecast.domain.scoring import GateResult, evaluate_gate, score
from salt_forecast.store.predictions import GateRow, Kind, PredictionRow, ScoreRow

LIVE_SAMPLE_FOR_LIVE_GATE = 52  # 라이브 52주 전까지는 백테스트 점수로 판정하고 그렇게 표시한다(FR-67)


def score_prediction(p: PredictionRow, realized: float) -> ScoreRow:
    return ScoreRow(
        p.symbol, p.horizon_weeks, p.as_of, p.model_version, p.kind, score(p.forecast, p.direction, realized)
    )


def score_forecast(
    symbol: str,
    h: int,
    as_of: datetime,
    model_version: str,
    kind: Kind,
    forecast: QuantileForecast,
    direction: str,
    realized: float,
) -> ScoreRow:
    return ScoreRow(symbol, h, as_of, model_version, kind, score(forecast, direction, realized))  # pyright: ignore[reportArgumentType]


def gates(
    scores: Iterable[ScoreRow],
    model_version: str,
    baseline_version: str,
    stale_symbols: set[str],
    universe: Sequence[tuple[str, int]],
) -> list[GateRow]:
    """종목 × 기간마다 모델 · 기준을 **같은 as_of 로 짝지어** 판정한다. 라이브가 52주 쌓이면 라이브만."""
    by: dict[tuple[str, int, str, Kind], dict[datetime, ScoreRow]] = defaultdict(dict)
    for s in scores:
        by[(s.symbol, s.horizon_weeks, s.model_version, s.kind)][s.as_of] = s
    out: list[GateRow] = []
    for sym, h in universe:
        live = by.get((sym, h, model_version, "live"), {})
        kind: Kind = "live" if len(live) >= LIVE_SAMPLE_FOR_LIVE_GATE else "backtest"
        m = by.get((sym, h, model_version, kind), {})
        b = by.get((sym, h, baseline_version, kind), {})
        paired = sorted(set(m) & set(b))
        result: GateResult = evaluate_gate(
            [m[t].score for t in paired], [b[t].score for t in paired], stale=sym in stale_symbols
        )
        out.append(GateRow(sym, h, model_version, baseline_version, kind, result))
    return out
