import numpy as np

from salt_forecast.domain.quantiles import Z_SCORES, QuantileForecast
from salt_forecast.domain.scoring import (
    MIN_CALLS_FOR_THRESHOLD,
    Score,
    choose_threshold,
    direction_for,
    evaluate_gate,
    score,
)

FC = QuantileForecast.from_array(Z_SCORES * 0.1, 0.6)


def test_score_hits_and_width() -> None:
    s = score(FC, "up", 0.05)
    assert s.hit90 and s.hit80 and s.direction_hit is True
    assert abs(s.width90 - 2 * 1.6448536269514722 * 0.1) < 1e-12
    assert score(FC, "abstain", 0.05).direction_hit is None
    assert score(FC, "down", 0.0).direction_hit is None  # 0 수익률은 판정에서 뺀다


def test_threshold_needs_enough_calls() -> None:
    p = np.full(MIN_CALLS_FOR_THRESHOLD - 1, 0.9)
    assert choose_threshold(p, np.ones_like(p)) is None
    assert direction_for(0.9, None) == "abstain"


def test_threshold_picks_most_accurate() -> None:
    rng = np.random.default_rng(0)
    p = rng.uniform(0, 1, 5000)
    realized = np.where(rng.uniform(0, 1, 5000) < p, 1.0, -1.0)  # 보정된 확률
    t = choose_threshold(p, realized)
    assert t == 0.70  # 확률이 보정돼 있으면 가장 엄격한 임계가 가장 잘 맞는다


def _s(pin: float, width: float, hit: bool = True, realized: float = 0.01) -> Score:
    return Score(realized, hit, hit, width, pin, "abstain", None)


def _mix(pin: float, width: float) -> list[Score]:
    """26개 중 24개 적중 = 92% — 명목 90% 근처."""
    return [_s(pin, width)] * 24 + [_s(pin, width, hit=False)] * 2


def test_gate_order_and_reasons() -> None:
    good = _mix(0.9, 0.5)
    base = [_s(1.0, 0.6)] * 26
    assert evaluate_gate(good, base, stale=False).renderable
    assert evaluate_gate(good[:25], base[:25], stale=False).blocked_reason == "insufficient_sample"
    assert evaluate_gate(good, base, stale=True).blocked_reason == "stale_inputs"
    too_wide = [_s(0.9, 0.5)] * 26  # 100% 적중 = 구간이 너무 넓다
    assert evaluate_gate(too_wide, base, stale=False).blocked_reason == "miscalibrated"
    miss = [_s(0.9, 0.5, hit=False)] * 26
    assert evaluate_gate(miss, base, stale=False).blocked_reason == "miscalibrated"
    worse = _mix(1.1, 0.5)
    assert evaluate_gate(worse, base, stale=False).blocked_reason == "underperforms_baseline"
    wide = _mix(0.9, 0.7)
    assert evaluate_gate(wide, base, stale=False).blocked_reason == "not_sharper_than_baseline"


def test_gate_always_carries_context() -> None:
    """적중률은 혼자 나가지 않는다(FR-10) — 폭 · 기준 폭 · 판정 수 · 항상 오른다가 같이 있다."""
    g = evaluate_gate(_mix(0.9, 0.5), [_s(1.0, 0.6)] * 26, stale=False)
    assert g.coverage90 is not None and g.width90 is not None and g.baseline_width90 is not None
    assert g.always_up_rate is not None and g.direction_calls == 0


def test_direction_base_rate_exposes_bear_market_calls() -> None:
    """하락장에서 "내린다"만 찍으면 적중률이 높아 보인다 — 기준 비율이 같은 값이면 실력이 아니다."""
    hit = Score(-0.01, True, True, 0.5, 0.9, "down", True)
    miss = Score(0.01, True, True, 0.5, 0.9, "down", False)
    g = evaluate_gate([hit] * 15 + [miss] * 11, [_s(1.0, 0.6)] * 26, stale=False)
    assert g.direction_calls == 26 and g.direction_hits == 15
    assert g.direction_base_rate is not None and abs(g.direction_base_rate - 15 / 26) < 1e-12


def test_range_gate_is_separate_from_skill_gate() -> None:
    """기준을 못 이겨도 보정이 맞으면 변동 범위는 켜진다(사용자 결정 2026-09-23)."""
    worse = _mix(1.1, 0.5)
    g = evaluate_gate(worse, [_s(1.0, 0.6)] * 26, stale=False)
    assert g.blocked_reason == "underperforms_baseline" and g.range_renderable and g.range_blocked_reason is None
    miss = [_s(0.9, 0.5, hit=False)] * 26
    m = evaluate_gate(miss, [_s(1.0, 0.6)] * 26, stale=False)
    assert not m.range_renderable and m.range_blocked_reason == "miscalibrated"
    assert not evaluate_gate(_mix(0.9, 0.5), [_s(1.0, 0.6)] * 26, stale=True).range_renderable


def test_lucky_win_is_not_significant() -> None:
    """평균으로는 이겼어도 흔들림이 크면 하한이 0 아래 — 켜지지 않는다."""
    rng = np.random.default_rng(1)
    noisy = [_s(float(p), 0.5, hit=i % 13 != 0) for i, p in enumerate(rng.uniform(0.2, 1.7, 26))]
    base = [_s(1.0, 0.6)] * 26
    g = evaluate_gate(noisy, base, stale=False)
    assert g.pinball_skill_ci_low is not None and g.pinball_skill_ci_low <= 0
    assert not g.renderable


def test_consistent_win_is_significant() -> None:
    g = evaluate_gate(_mix(0.8, 0.5), [_s(1.0, 0.6)] * 26, stale=False)
    assert g.pinball_skill_ci_low is not None and g.pinball_skill_ci_low > 0 and g.renderable
