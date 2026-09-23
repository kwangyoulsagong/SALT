"""채점 · 선택적 방향 판정 · 게이트.

적중률은 혼자 나가지 않는다 — 폭 · 기준 폭 · 판정 수 · 항상 오른다 비율과 한 묶음이다(FEATURE-008 FR-10).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.quantiles import Direction, QuantileForecast, pinball

THRESHOLDS: tuple[float, ...] = (0.55, 0.60, 0.65, 0.70)
MIN_CALLS_FOR_THRESHOLD = 30
GATE_WINDOW = 52  # 있으면 1년까지 본다. 최소는 MIN_GATE_SAMPLE
BOOTSTRAP_RESAMPLES = 1000
MIN_GATE_SAMPLE = 26
COVERAGE90_MIN = 0.80
COVERAGE90_MAX = 0.97

BlockedReason = Literal[
    "insufficient_sample",
    "stale_inputs",
    "miscalibrated",
    "underperforms_baseline",
    "not_sharper_than_baseline",
    "skill_not_significant",
]
RangeBlockedReason = Literal["insufficient_sample", "stale_inputs", "miscalibrated"]


@dataclass(frozen=True, slots=True)
class Score:
    realized: float
    hit90: bool
    hit80: bool
    width90: float
    pinball: float
    direction: Direction
    direction_hit: bool | None


def score(forecast: QuantileForecast, direction: Direction, realized: float) -> Score:
    lo90, hi90 = forecast.interval(90)
    lo80, hi80 = forecast.interval(80)
    hit: bool | None = None
    if direction != "abstain" and realized != 0.0:
        hit = (realized > 0) == (direction == "up")
    return Score(
        realized=realized,
        hit90=lo90 <= realized <= hi90,
        hit80=lo80 <= realized <= hi80,
        width90=hi90 - lo90,
        pinball=pinball(forecast, realized),
        direction=direction,
        direction_hit=hit,
    )


def choose_threshold(p_up: NDArray[np.float64], realized: NDArray[np.float64]) -> float | None:
    """과거(이미 실현된) 상승 확률 · 결과로 적중률이 가장 높은 임계를 고른다. 판정 수가 모자라면 None → 전부 abstain.

    입력에는 as_of 이전에 라벨이 끝난 것만 들어온다 — 임계 선택도 학습 창 안에서만(time-and-leakage.md §4).
    """
    best: tuple[float, float] | None = None
    moved = realized != 0.0
    for t in THRESHOLDS:
        up = (p_up >= t) & moved
        down = (p_up <= 1 - t) & moved
        n = int(up.sum() + down.sum())
        if n < MIN_CALLS_FOR_THRESHOLD:
            continue
        rate = float(((realized > 0) & up).sum() + ((realized < 0) & down).sum()) / n
        if best is None or rate > best[1]:
            best = (t, rate)
    return best[0] if best else None


def direction_for(p_up: float, threshold: float | None) -> Direction:
    if threshold is None:
        return "abstain"
    if p_up >= threshold:
        return "up"
    if p_up <= 1 - threshold:
        return "down"
    return "abstain"


@dataclass(frozen=True, slots=True)
class GateResult:
    renderable: bool
    blocked_reason: BlockedReason | None
    sample: int
    coverage90: float | None
    width90: float | None
    baseline_width90: float | None
    pinball_skill: float | None
    direction_calls: int
    direction_hits: int
    always_up_rate: float | None
    direction_base_rate: float | None  # 판정한 방향을 항상 찍었을 때의 적중률 — 방향 적중률은 이것과만 비교한다
    # 변동 범위(방향 예측 아님)는 보정 · 표본 · 신선도만으로 켠다 — 기준을 이겼는지는 조건이 아니라 같이 보여 줄 정보다
    range_renderable: bool = False
    range_blocked_reason: RangeBlockedReason | None = None
    pinball_skill_ci_low: float | None = None  # 기준 대비 개선의 95% 하한 — 우연히 이긴 곳을 걸러낸다


def skill_ci_low(model_pin: NDArray[np.float64], base_pin: NDArray[np.float64], seed: int = 0) -> float | None:
    """짝지은 부트스트랩 — 1 − mean(모델)/mean(기준) 의 2.5% 분위수. 같은 as_of 끼리 짝이다.

    종목 1,000개를 26주씩 시험하면 우연히 이기는 곳이 생긴다(슬라이스 16 발견: 1,156 중 200). 하한 > 0 을 요구한다.
    """
    n = model_pin.size
    if n < MIN_GATE_SAMPLE or base_pin.size != n:
        return None
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, n, size=(BOOTSTRAP_RESAMPLES, n))
    m = model_pin[idx].mean(axis=1)
    b = base_pin[idx].mean(axis=1)
    with np.errstate(divide="ignore", invalid="ignore"):
        skills = np.where(b > 0, 1.0 - m / b, np.nan)
    skills = skills[np.isfinite(skills)]
    return float(np.quantile(skills, 0.025)) if skills.size else None


def evaluate_gate(model: list[Score], baseline: list[Score], *, stale: bool) -> GateResult:
    """최근 GATE_WINDOW 개(같은 as_of 로 짝지은 모델 · 기준 점수)로 판정한다.

    순서: 표본 → 신선도 → 보정 → 기준 대비 → 폭.
    """
    m = model[-GATE_WINDOW:]
    b = baseline[-GATE_WINDOW:]
    n = min(len(m), len(b))
    calls = [s for s in m if s.direction_hit is not None]
    hits = sum(1 for s in calls if s.direction_hit)
    if n == 0:
        return GateResult(
            False,
            "insufficient_sample",
            0,
            None,
            None,
            None,
            None,
            len(calls),
            hits,
            None,
            None,
            False,
            "insufficient_sample",
        )
    coverage = float(np.mean([s.hit90 for s in m]))
    width = float(np.median([s.width90 for s in m]))
    base_width = float(np.median([s.width90 for s in b]))
    base_pin = float(np.mean([s.pinball for s in b]))
    skill = 1.0 - float(np.mean([s.pinball for s in m])) / base_pin if base_pin > 0 else None
    always_up = float(np.mean([s.realized > 0 for s in m]))
    moved = [s for s in m if s.realized != 0.0]
    up_share = float(np.mean([s.realized > 0 for s in moved])) if moved else None
    base_rate = (
        float(np.mean([up_share if s.direction == "up" else 1 - up_share for s in calls]))
        if calls and up_share is not None
        else None
    )

    range_reason: RangeBlockedReason | None = None
    if n < MIN_GATE_SAMPLE:
        range_reason = "insufficient_sample"
    elif stale:
        range_reason = "stale_inputs"
    elif not COVERAGE90_MIN <= coverage <= COVERAGE90_MAX:
        range_reason = "miscalibrated"
    reason: BlockedReason | None = range_reason
    n_pair = min(len(m), len(b))
    ci_low = skill_ci_low(
        np.asarray([s.pinball for s in m[-n_pair:]], dtype=np.float64),
        np.asarray([s.pinball for s in b[-n_pair:]], dtype=np.float64),
    )
    if reason is None:
        if skill is None or skill <= 0:
            reason = "underperforms_baseline"
        elif width >= base_width:
            reason = "not_sharper_than_baseline"
        elif ci_low is None or ci_low <= 0:
            reason = "skill_not_significant"
    return GateResult(
        reason is None,
        reason,
        n,
        coverage,
        width,
        base_width,
        skill,
        len(calls),
        hits,
        always_up,
        base_rate,
        range_reason is None,
        range_reason,
        ci_low,
    )
