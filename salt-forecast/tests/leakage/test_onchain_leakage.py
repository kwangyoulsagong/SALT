"""onchain-regime@1 — t 의 상한 판단은 t 뒤에 공개된 온체인 점을 바꿔도 같아야 한다.

time-and-leakage.md §6 미래 오염.
"""

import numpy as np

from salt_forecast.domain import onchain as oc

DAY = 86400


def test_threshold_and_cap_ignore_points_published_after_t() -> None:
    rng = np.random.default_rng(5)
    n = 2500
    obs = DAY * np.arange(n, dtype=np.int64)
    avail = obs + 2 * DAY
    val = rng.lognormal(0.5, 0.4, n)
    dates = obs.copy()
    t = 1800
    base_q = oc.expanding_quantile(obs, avail, val, dates, 0.9, since=0)
    base_m = oc.cap_multiplier(val, base_q)
    val2 = val.copy()
    val2[avail > dates[t]] = 99.0  # t 에 몰랐던 점(available > t)만 오염
    after_q = oc.expanding_quantile(obs, avail, val2, dates, 0.9, since=0)
    assert np.array_equal(base_q[: t + 1], after_q[: t + 1], equal_nan=True)
    assert np.array_equal(base_m[: t + 1], oc.cap_multiplier(val, after_q)[: t + 1])


def test_trailing_z_ignores_future() -> None:
    rng = np.random.default_rng(6)
    x = rng.normal(0, 1, 800)
    t = 600
    x2 = x.copy()
    x2[t + 1 :] = 50.0
    a = oc.trailing_z(oc.trailing_sum(x))
    b = oc.trailing_z(oc.trailing_sum(x2))
    assert np.array_equal(a[: t + 1], b[: t + 1], equal_nan=True)
