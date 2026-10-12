"""풀링 게이트 · 종목 거부권 · 플라시보 · 꼬리 커버리지(FC-REQ-020 FR-1 · FR-2 · FR-4 · FR-5)."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime, timedelta

import numpy as np

from salt_forecast.domain.quantiles import Z_SCORES, QuantileForecast
from salt_forecast.domain.scoring import Score, evaluate_gate, score
from salt_forecast.scoring.coverage import TailObs, nonoverlapping, tail_rate
from salt_forecast.scoring.evaluate import Paired
from salt_forecast.scoring.pooled_gate import kr_cards, per_symbol_cards, placebo

T0 = datetime(2024, 1, 1, tzinfo=UTC)


def _score(width: float, realized: float) -> Score:
    return score(QuantileForecast.from_array(Z_SCORES * width, 0.5), "abstain", realized)


def _pairs(n_sym: int, weeks: int, model_width: float, seed: int) -> dict[tuple[str, int], Paired]:
    rng = np.random.default_rng(seed)
    dates = [T0 + timedelta(weeks=i) for i in range(weeks)]
    out: dict[tuple[str, int], Paired] = {}
    for i in range(n_sym):
        r = rng.normal(0.0, 0.05, weeks).tolist()
        out[(f"S{i}", 1)] = Paired("backtest", dates, [_score(model_width, x) for x in r], [_score(0.08, x) for x in r])
    return out


def test_veto_only_ignores_symbol_iid_skill() -> None:
    """종목 하나의 iid 하한이 음수여도 풀링이 통과하면 켜진다 · 풀링이 지면 이겨도 꺼진다."""
    # 실현값 = 표준정규 분위 52개 × 0.05 — 90% 구간 밖이 4개(커버리지 92%)라 보정 검사는 통과한다
    z = np.sort(np.random.default_rng(5).normal(size=52))
    z[:2], z[-2:] = (-2.5, -2.2), (2.2, 2.5)
    z[2:-2] = np.clip(z[2:-2], -1.5, 1.5)
    m = [_score(0.05, 0.05 * x) for x in z]
    b = [_score(0.05, 0.05 * x) for x in z]  # 같다 → 실력 0
    assert evaluate_gate(m, b, stale=False).blocked_reason == "underperforms_baseline"
    assert evaluate_gate(m, b, stale=False, pooled_skill=True).blocked_reason == "not_sharper_than_baseline"
    narrower = [_score(0.045, s.realized) for s in m]
    assert evaluate_gate(narrower, b, stale=False, pooled_skill=True).renderable
    assert evaluate_gate(narrower, b, stale=False, pooled_skill=False).blocked_reason == "skill_not_significant"


def test_pooled_gate_turns_on_real_skill_and_placebo_is_low() -> None:
    """실제 σ 0.05 · 모델 0.05 vs 기준 0.08 — 진짜로 더 잘 맞는다. 풀링이 통과하고 우연 비율이 낮다."""
    pairs = _pairs(20, 60, 0.05, seed=1)
    n, verdicts = kr_cards(pairs, "m", "b", (1,))
    assert verdicts[1].passed and n > 0
    r = placebo(pairs, lambda p: kr_cards(p, "m", "b", (1,))[0], reps=30)
    assert r.observed == n
    assert r.false_discovery is not None and r.false_discovery < 0.5


def test_placebo_is_reproducible() -> None:
    pairs = _pairs(10, 40, 0.06, seed=2)

    def count(p: Mapping[tuple[str, int], Paired]) -> int:
        return per_symbol_cards(p, "m", "b")

    assert placebo(pairs, count, reps=10) == placebo(pairs, count, reps=10)


def test_tail_rate_cluster_se_counts_dates_not_rows() -> None:
    """같은 주 종목이 함께 빠지면 SE 가 커진다 — 행을 독립으로 세지 않는다."""
    together = [TailObs(f"S{i}", 1, d, -0.1, 0.1, 0.2 if d % 10 == 0 else 0.0) for d in range(50) for i in range(10)]
    spread = [
        TailObs(f"S{i}", 1, d, -0.1, 0.1, 0.2 if (d + i) % 10 == 0 else 0.0) for d in range(50) for i in range(10)
    ]
    a = tail_rate(together, [o.upper for o in together])
    b = tail_rate(spread, [o.upper for o in spread])
    assert a.rate == b.rate == 0.1
    assert a.cluster_se > 3 * b.cluster_se


def test_nonoverlapping_keeps_every_hth_week() -> None:
    obs = [TailObs("S", 3, d, -1, 1, 0) for d in range(10)]
    assert [o.as_of for o in nonoverlapping(obs, 3)] == [0, 3, 6, 9]
