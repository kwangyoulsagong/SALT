"""목표 비중 규칙 · 주간 시뮬레이션 · 실패 사례(FC-REQ-012)."""

from __future__ import annotations

import numpy as np
import pytest

from salt_forecast.domain.target_weight import (
    MonthRow,
    block_indices,
    max_drawdown,
    missed_upside,
    nearest_target,
    simulate,
    target_weights,
    worst_months,
)

# 서버 `targetWeight.test.ts` 가 같은 벡터를 쓴다 — 규칙이 두 벌로 갈라지면 둘 중 하나가 깨진다
GOLDEN = [
    # (σ, 목표, 상한) → 비중
    ((0.50, 0.70), 0.15, 0.6, (0.15, 0.15 / 1.4)),
    ((0.50, 0.70, 1.40), 0.30, 0.6, (0.2, 0.1 / 0.7, 0.1 / 1.4)),
    ((0.40,), 0.50, 0.6, (0.6,)),  # 노출 1 → 상한 0.6 에 잘리고 0.4 는 현금
    ((0.40, float("nan")), 0.20, 0.6, (0.5, 0.0)),  # σ 없는 종목은 빠진다
]


@pytest.mark.parametrize(("sigma", "target", "cap", "expected"), GOLDEN)
def test_golden_vectors(sigma: tuple[float, ...], target: float, cap: float, expected: tuple[float, ...]) -> None:
    got = target_weights(np.array(sigma), target, cap)
    np.testing.assert_allclose(got, expected, atol=1e-12)


def test_inverse_vol_sleeve_hits_target_under_unit_correlation() -> None:
    sigma = np.array([0.5, 0.8, 1.2])
    w = target_weights(sigma, 0.2, cap=1.0)
    assert (w * sigma).sum() == pytest.approx(0.2)
    # 역변동성 — 비중 × σ 가 종목마다 같다(위험 기여 균등)
    assert np.ptp(w * sigma) == pytest.approx(0.0, abs=1e-12)


def test_exposure_never_above_one_and_never_negative() -> None:
    rng = np.random.default_rng(3)
    for _ in range(200):
        sigma = rng.uniform(0.05, 3.0, size=rng.integers(1, 12))
        w = target_weights(sigma, float(rng.uniform(0.05, 1.0)), cap=float(rng.uniform(0.1, 1.0)))
        assert w.min() >= 0
        assert w.sum() <= 1 + 1e-12


def test_no_sigma_means_all_cash() -> None:
    assert target_weights(np.array([np.nan, 0.0]), 0.15).sum() == 0


def test_simulate_acts_next_day_and_drifts() -> None:
    simple = np.array([[0.0, 0.0], [0.10, 0.0], [0.10, -0.5], [0.0, 0.0]])
    target = np.array([[0.5, 0.5], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0]])
    reb = np.array([True, False, False, False])
    sim = simulate(simple, target, reb, cost=0.0)
    assert sim.log_r[0] == 0.0  # 리밸런스 날 수익엔 새 비중이 걸리지 않는다
    assert np.expm1(sim.log_r[1]) == pytest.approx(0.05)
    # 하루 뒤 비중이 가격대로 흘렀다: 0.55/1.05 · 0.5/1.05
    np.testing.assert_allclose(sim.weights[2], [0.55 / 1.05, 0.5 / 1.05])


def test_simulate_charges_cost_on_turnover() -> None:
    simple = np.zeros((3, 1))
    target = np.array([[1.0], [0.0], [0.0]])
    sim = simulate(simple, target, np.array([True, False, False]), cost=0.001)
    assert np.expm1(sim.log_r[1]) == pytest.approx(-0.001)
    assert sim.log_r[2] == 0.0


def test_cash_before_first_rebalance() -> None:
    simple = np.full((3, 1), 0.2)
    sim = simulate(simple, np.ones((3, 1)), np.array([False, False, True]))
    assert sim.exposure.tolist() == [0.0, 0.0, 0.0]


def test_failure_lists_are_unselected_order() -> None:
    rows = [
        MonthRow(1, 0.01, 0.20, 0.3),
        MonthRow(2, -0.05, -0.20, 0.3),
        MonthRow(3, 0.00, 0.10, 0.3),
        MonthRow(4, -0.08, 0.05, 0.3),
        MonthRow(5, 0.03, 0.04, 0.3),
    ]
    assert [r.month for r in missed_upside(rows)] == [1, 4, 3]
    assert [r.month for r in worst_months(rows)] == [4, 2, 3]


def test_nearest_target_prefers_smaller_on_tie() -> None:
    assert nearest_target((0.10, 0.20), 0.15) == 0.10
    assert nearest_target((0.10, 0.15, 0.20), 0.17) == 0.15


def test_bootstrap_indices_reproducible() -> None:
    a = block_indices(100, n_boot=5)
    b = block_indices(100, n_boot=5)
    assert all((x == y).all() for x, y in zip(a, b, strict=True))
    assert max_drawdown(np.log(np.array([1.0, 0.5, 2.0]))) == pytest.approx(0.5)
