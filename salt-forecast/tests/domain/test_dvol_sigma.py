import numpy as np

from salt_forecast.domain import dvol_sigma as d
from salt_forecast.domain.volatility import qlike as qlike_mean


def test_forward_rv_sums_next_h_squares_and_holes_are_nan() -> None:
    r = np.array([np.nan, 0.1, -0.2, 0.3, np.nan, 0.1])
    rv = d.forward_rv(r, 2)
    assert np.isclose(rv[0], 0.01 + 0.04)
    assert np.isclose(rv[1], 0.04 + 0.09)
    assert np.isnan(rv[2])  # r[4] 결측
    assert np.isnan(rv[4]) and np.isnan(rv[5])  # 끝을 넘는다


def test_qlike_matches_volatility_qlike_per_day() -> None:
    rng = np.random.default_rng(0)
    rv = rng.uniform(0.001, 0.01, 50)
    sigma = rng.uniform(0.3, 0.9, 50)
    q = d.qlike(sigma, rv, 7)
    f = sigma**2 * 7 / 365
    # volatility.qlike 는 r² 를 받는다 — RV 를 r² 자리에 넣으면 같은 식
    assert np.isclose(q.mean(), qlike_mean(np.sqrt(rv), f))


def test_scale_recovers_constant_ratio() -> None:
    # 실현 σ 가 늘 DVOL 의 0.8 배면 k = 0.8
    rng = np.random.default_rng(1)
    n = 800
    daily = 0.8 * 0.6 / np.sqrt(365)
    r = np.concatenate(([np.nan], rng.choice([-daily, daily], n - 1)))
    dv = np.full(n, 60.0)
    k = d.dvol_scale(r, dv)
    assert np.isnan(k[:279]).all()  # 유효 s 250개 = t − 30 ≥ 249 부터
    assert np.allclose(k[400:], 0.8)


def test_blend_is_variance_average() -> None:
    c = d.candidates(np.array([0.4]), np.array([80.0]), np.array([0.75]))
    assert np.isclose(c.dvol_scaled[0], 0.6)
    assert np.isclose(c.blend[0], np.sqrt(0.5 * 0.16 + 0.5 * 0.36))
    assert np.isclose(c.raw_dvol[0], 0.8)


def test_mean_ci_deterministic_and_skips_nan() -> None:
    x = np.concatenate((np.full(10, np.nan), np.random.default_rng(2).normal(-0.1, 0.05, 300)))
    a, b = d.mean_ci(x, 0.05), d.mean_ci(x, 0.05)
    assert a == b and a.n == 300 and a.hi < 0
