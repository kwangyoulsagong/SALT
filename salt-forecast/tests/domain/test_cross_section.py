"""날짜 안 순위 · offset 로지스틱 · 결합 (FC-REQ-011 meta-model@2)."""

import numpy as np

from salt_forecast.domain.cross_section import centered_ranks, combine, date_rate_offset, fit_rank_model
from salt_forecast.domain.logistic import fit_logistic, sigmoid
from salt_forecast.domain.series import DAY


def test_centered_ranks_per_date_with_ties_and_missing() -> None:
    dates = np.array([0, 0, 0, 0, DAY, DAY], dtype=np.int64)
    x = np.array([[1.0], [3.0], [3.0], [np.nan], [10.0], [-5.0]])
    z = centered_ranks(x, dates)[:, 0]
    # 첫 날 값 3개: 순위 1 · 2.5 · 2.5 → (r − 0.5)/3 − 0.5
    np.testing.assert_allclose(z[:3], [1 / 6 - 0.5, 2 / 3 - 0.5 + 0.0, 2 / 3 - 0.5])
    assert z[3] == 0.0  # 결측은 가운데
    np.testing.assert_allclose(z[4:], [0.25, -0.25])  # 다른 날과 섞이지 않는다


def test_ranks_ignore_other_dates() -> None:
    rng = np.random.default_rng(0)
    dates = np.repeat(np.arange(5, dtype=np.int64) * DAY, 8)
    x = rng.normal(size=(40, 2))
    a = centered_ranks(x, dates)
    x2 = x.copy()
    x2[dates == 4 * DAY] *= 100  # 마지막 날 값만 바꾼다
    b = centered_ranks(x2, dates)
    np.testing.assert_array_equal(a[dates < 4 * DAY], b[dates < 4 * DAY])


def test_offset_logistic_without_intercept_recovers_slope() -> None:
    rng = np.random.default_rng(1)
    n = 30000
    off = rng.normal(-1.5, 0.5, n)
    x = rng.uniform(-0.5, 0.5, size=(n, 1))
    y = (rng.random(n) < sigmoid(off + 1.4 * x[:, 0])).astype(np.float64)
    fit = fit_logistic(x, y, lam=1e-6, offset=off, intercept=False)
    assert fit.intercept == 0.0
    assert abs(fit.coef[0] - 1.4) < 0.1


def test_rank_model_learns_within_date_signal_not_date_level() -> None:
    rng = np.random.default_rng(2)
    dates = np.repeat(np.arange(300, dtype=np.int64) * 7 * DAY, 40)
    day_rate = np.repeat(rng.uniform(0.02, 0.4, 300), 40)  # 시점 몫 — 날짜 안 순위와 무관
    z = rng.uniform(-0.5, 0.5, size=(dates.size, 2))
    logit = np.log(day_rate / (1 - day_rate)) + 1.0 * z[:, 0]
    y = (rng.random(dates.size) < sigmoid(logit)).astype(np.float64)
    w = fit_rank_model(z, y, dates, lam=1.0)
    assert w[0] > 0.6 and abs(w[1]) < 0.3
    off = date_rate_offset(y, dates)
    assert np.all(np.isfinite(off))


def test_combine_keeps_base_rate_when_score_zero() -> None:
    p = combine(np.array([0.12, 0.3]), np.zeros(2))
    np.testing.assert_allclose(p, [0.12, 0.3])
