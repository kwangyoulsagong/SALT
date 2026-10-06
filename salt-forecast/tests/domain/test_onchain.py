import numpy as np

from salt_forecast.domain import onchain as oc

DAY = 86400


def test_expanding_quantile_needs_min_history_and_reads_only_known_points() -> None:
    obs = DAY * np.arange(10, dtype=np.int64)
    avail = obs + 2 * DAY
    val = np.arange(10, dtype=np.float64)
    dates = DAY * np.array([1, 5, 11, 20], dtype=np.int64)
    q = oc.expanding_quantile(obs, avail, val, dates, 0.5, since=0, min_n=3)
    # t=1일: 아직 아무것도 모른다 · t=5일: 0..3 (4개) · t=11: 0..9 전부
    assert np.isnan(q[0])
    assert q[1] == np.quantile([0, 1, 2, 3], 0.5)
    assert q[2] == q[3] == np.quantile(val, 0.5)


def test_expanding_quantile_respects_since() -> None:
    obs = DAY * np.arange(10, dtype=np.int64)
    val = np.arange(10, dtype=np.float64)
    q = oc.expanding_quantile(obs, obs, val, np.array([DAY * 20], dtype=np.int64), 0.0, since=DAY * 5, min_n=1)
    assert q[0] == 5.0


def test_cap_multiplier_is_one_without_values() -> None:
    m = oc.cap_multiplier(np.array([1.0, 3.0, np.nan, 3.0]), np.array([2.0, 2.0, 2.0, np.nan]))
    assert m.tolist() == [1.0, 0.5, 1.0, 1.0]


def test_trailing_sum_and_z() -> None:
    x = np.array([1.0, 2.0, 3.0, np.nan, 5.0])
    s = oc.trailing_sum(x, 2)
    assert np.isnan(s[0]) and s[1] == 3.0 and s[2] == 5.0 and np.isnan(s[3]) and np.isnan(s[4])
    z = oc.trailing_z(np.array([0.0, 2.0, 0.0, 2.0, 5.0]), ref=4, min_ref=4)
    assert np.isnan(z[:4]).all() and z[4] == (5.0 - 1.0) / 1.0


def test_episodes_merge_short_gaps() -> None:
    f = np.zeros(40, dtype=bool)
    f[[0, 1, 5, 20, 21]] = True  # 1 → 5 사이 꺼진 3주(한 구간) · 5 → 20 사이 14주(새 구간)
    assert oc.episodes(f) == 2
    assert oc.episodes(np.zeros(3, dtype=bool)) == 0
