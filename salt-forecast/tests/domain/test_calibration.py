import numpy as np

from salt_forecast.domain.calibration import ResidualPool, apply, fit_adjustments
from salt_forecast.domain.quantiles import Z_SCORES, QuantileForecast


def _pool(true_sigma: float, model_sigma: float, n: int, seed: int) -> ResidualPool:
    rng = np.random.default_rng(seed)
    y = rng.normal(0, true_sigma, n)
    q = np.tile(Z_SCORES * model_sigma, (n, 1))
    return ResidualPool(q, np.full(n, model_sigma), y)


def test_small_pool_is_not_calibrated() -> None:
    assert fit_adjustments(_pool(1, 1, 49, 0)) is None


def test_underdispersed_model_is_widened_to_nominal_coverage() -> None:
    """모델이 변동성을 절반으로 보면 90% 구간이 크게 못 맞는다 → 보정 후 새 표본에서 90% 근처."""
    adj = fit_adjustments(_pool(true_sigma=2.0, model_sigma=1.0, n=4000, seed=1))
    assert adj is not None
    raw = QuantileForecast.from_array(Z_SCORES * 1.0, 0.5)
    cal = apply(raw, 1.0, adj)
    y = np.random.default_rng(2).normal(0, 2.0, 20_000)
    lo, hi = cal.interval(90)
    coverage = float(np.mean((y >= lo) & (y <= hi)))
    raw_lo, raw_hi = raw.interval(90)
    assert float(np.mean((y >= raw_lo) & (y <= raw_hi))) < 0.65
    assert 0.88 <= coverage <= 0.92


def test_overdispersed_model_is_narrowed() -> None:
    adj = fit_adjustments(_pool(true_sigma=0.5, model_sigma=1.0, n=4000, seed=3))
    assert adj is not None
    assert adj.by_interval[0] < 0  # 90% 구간을 좁힌다
