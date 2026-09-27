import numpy as np

from salt_forecast.domain.ic import (
    block_bootstrap_mean,
    cross_sectional_ic,
    rank_average,
    spearman,
    verdict,
)
from salt_forecast.domain.labels import triple_barrier
from salt_forecast.domain.panel import Panel, align_points, forward_log_return, window_mean
from salt_forecast.domain.series import DAY


def test_rank_average_ties() -> None:
    assert rank_average(np.asarray([8.0, 0.0, 0.0, -8.0])).tolist() == [4.0, 2.5, 2.5, 1.0]


def test_spearman_perfect_and_constant() -> None:
    x = np.arange(10.0)
    assert np.isclose(spearman(x, x**3), 1.0)
    assert np.isnan(spearman(np.zeros(10), x))


def test_cross_sectional_ic_skips_thin_days() -> None:
    rng = np.random.default_rng(0)
    sig = rng.normal(size=(3, 30))
    y = sig.copy()
    y[1, 15:] = np.nan  # 15종목뿐 → 제외
    ic = cross_sectional_ic(sig, y)
    assert np.isclose(ic[0], 1.0) and np.isnan(ic[1]) and np.isclose(ic[2], 1.0)


def test_bootstrap_ci_covers_mean_and_is_seeded() -> None:
    v = np.random.default_rng(1).normal(0.05, 0.1, size=500)
    a = block_bootstrap_mean(v, 10)
    assert a == block_bootstrap_mean(v, 10)
    assert a[0] < v.mean() < a[1]


def test_verdict_rules() -> None:
    assert verdict(300, 0.01, 0.05) == "keep"
    assert verdict(300, -0.05, -0.01) == "reverse"
    assert verdict(300, -0.01, 0.02) == "zero_weight"
    assert verdict(100, 0.01, 0.05) == "insufficient"
    assert verdict(300, -0.05, -0.01, expected_sign=-1) == "keep"  # 역방향 가설


def _panel(close: list[float], high: list[float], low: list[float]) -> Panel:
    c, h, lo = (np.asarray(v, dtype=np.float64)[:, None] for v in (close, high, low))
    n = c.shape[0]
    return Panel(np.arange(n, dtype=np.int64) * DAY, ("KRW-X",), h, lo, c, np.ones_like(c), np.zeros(1, np.int64))


def test_triple_barrier_same_day_both_is_lower_and_vertical() -> None:
    close = [100.0] * 6
    high = [100.0, 130.0, 100.0, 100.0, 100.0, 100.0]
    low = [100.0, 70.0, 100.0, 100.0, 100.0, 100.0]
    sigma = np.full((6, 1), 0.05)
    lab = triple_barrier(_panel(close, high, low), 2, sigma)
    assert lab.label[0, 0] == -1.0  # 같은 날 둘 다 → 하단
    assert lab.label[2, 0] == 0.0  # 아무것도 안 닿음 → 수직
    assert np.isnan(lab.label[4, 0])  # 수직 종가가 아직 없다


def test_forward_return_is_label_only_future() -> None:
    p = _panel([100.0, 110.0, 121.0], [0.0] * 3, [0.0] * 3)
    r = forward_log_return(p, 1)[:, 0]
    assert np.isclose(r[0], np.log(1.1)) and np.isnan(r[2])


def test_align_points_age_limit_and_window_mean() -> None:
    avail = np.asarray([DAY, 2 * DAY], dtype=np.int64)
    val = np.asarray([1.0, 3.0])
    dates = np.asarray([0, DAY, 2 * DAY, 5 * DAY], dtype=np.int64)
    a = align_points(avail, val, dates, DAY)
    assert np.isnan(a[0]) and a[1] == 1.0 and a[2] == 3.0 and np.isnan(a[3])
    m = window_mean(avail, val, dates, 2 * DAY)
    assert m[2] == 2.0 and np.isnan(m[3])
