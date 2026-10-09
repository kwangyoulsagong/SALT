"""채점 · 게이트 판정 조립. 계산은 domain, 여기는 짝짓기만."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime

from salt_forecast.domain.calendar import on_weekly_grid
from salt_forecast.domain.quantiles import QuantileForecast
from salt_forecast.domain.scoring import GATE_WINDOW, GateResult, Score, evaluate_gate, score
from salt_forecast.store.predictions import GateRow, Kind, PredictionRow, ScoreRow

# 라이브 52주(주 격자 as_of 52개) 전까지는 백테스트 점수로 판정하고 그렇게 표시한다(FEATURE-008 FR-67)
LIVE_SAMPLE_FOR_LIVE_GATE = 52


def weekly_only(rows: Iterable[ScoreRow], on_grid: Callable[[int], bool] = on_weekly_grid) -> list[ScoreRow]:
    """월요일 00:00 UTC 격자 위의 as_of 만 남긴다.

    live 예측은 매일 나오지만(`jobs/daily.py`) 게이트 표본은 주 단위로 센다 — 이웃한 날의 h주 라벨은 거의 전부
    겹쳐서 일 단위 행 52개는 "52주"가 아니라 유효 표본 2~8개짜리 8주다. 백테스트 행은 원래 주 격자라 이 필터가
    아무것도 버리지 않는다(`models/engine.grid_for`). 매일 행은 계속 쓰고 채점한다 — 카드의 최신 예측이 그것이다.
    국내 주식은 격자가 주 첫 거래일이다(`KrxSessions.on_grid`, FC-REQ-009).
    """
    return [r for r in rows if on_grid(int(r.as_of.timestamp()))]


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


@dataclass(frozen=True, slots=True)
class Paired:
    """종목 × 기간 하나의 짝지은 점수 — 같은 as_of 의 모델 · 기준, as_of 오름차순."""

    kind: Kind
    dates: list[datetime]
    model: list[Score]
    baseline: list[Score]


def paired_scores(
    scores: Iterable[ScoreRow],
    model_version: str,
    baseline_version: str,
    universe: Sequence[tuple[str, int]],
    on_grid: Callable[[int], bool] = on_weekly_grid,
) -> dict[tuple[str, int], Paired]:
    """주 격자 위에서 짝짓는다. 라이브가 52주 쌓인 종목 × 기간은 라이브만, 아니면 백테스트만."""
    by: dict[tuple[str, int, str, Kind], dict[datetime, ScoreRow]] = defaultdict(dict)
    for s in weekly_only(scores, on_grid):
        by[(s.symbol, s.horizon_weeks, s.model_version, s.kind)][s.as_of] = s
    out: dict[tuple[str, int], Paired] = {}
    for sym, h in universe:
        live = by.get((sym, h, model_version, "live"), {})
        kind: Kind = "live" if len(live) >= LIVE_SAMPLE_FOR_LIVE_GATE else "backtest"
        m = by.get((sym, h, model_version, kind), {})
        b = by.get((sym, h, baseline_version, kind), {})
        dates = sorted(set(m) & set(b))
        out[(sym, h)] = Paired(kind, dates, [m[t].score for t in dates], [b[t].score for t in dates])
    return out


def gates(
    scores: Iterable[ScoreRow],
    model_version: str,
    baseline_version: str,
    stale_symbols: set[str],
    universe: Sequence[tuple[str, int]],
    on_grid: Callable[[int], bool] = on_weekly_grid,
    pooled: Mapping[int, bool] | None = None,
) -> list[GateRow]:
    """종목 × 기간마다 모델 · 기준을 **같은 as_of 로 짝지어** 판정한다. 라이브가 52주 쌓이면 라이브만.

    표본 수 세기와 판정 둘 다 주 격자 위의 as_of 만 쓴다(`weekly_only`) — 모델 · 기준 · live · backtest 에 같은 필터다.
    `pooled`(기간 → 풀링 검정 통과)가 있으면 종목 검사는 거부권만이다(`evaluate_gate`, FC-REQ-020).
    `pooled` 에 없는 기간은 통과 못 한 것으로 본다.
    """
    return gates_from_pairs(
        paired_scores(scores, model_version, baseline_version, universe, on_grid),
        model_version,
        baseline_version,
        stale_symbols,
        pooled,
    )


def gates_from_pairs(
    pairs: Mapping[tuple[str, int], Paired],
    model_version: str,
    baseline_version: str,
    stale_symbols: set[str],
    pooled: Mapping[int, bool] | None = None,
) -> list[GateRow]:
    out: list[GateRow] = []
    for (sym, h), p in pairs.items():
        result: GateResult = evaluate_gate(
            p.model,
            p.baseline,
            stale=sym in stale_symbols,
            pooled_skill=None if pooled is None else pooled.get(h, False),
        )
        window = p.dates[-GATE_WINDOW:]
        out.append(
            GateRow(
                sym,
                h,
                model_version,
                baseline_version,
                p.kind,
                result,
                window[0] if window else None,
                window[-1] if window else None,
            )
        )
    return out
