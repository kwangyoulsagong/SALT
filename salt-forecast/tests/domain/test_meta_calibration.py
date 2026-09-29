"""확률 채점 · Beta 보정 · 로지스틱 · CPCV · BY-FDR · DSR (FC-REQ-011)."""

import itertools
import math

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

from salt_forecast.domain.cpcv import (
    benjamini_yekutieli,
    cpcv_splits,
    deflated_sharpe,
    expected_max_sharpe,
    n_paths,
    p_from_ci,
)
from salt_forecast.domain.logistic import Standardizer, fit_logistic, sigmoid
from salt_forecast.domain.prob_calibration import (
    auc,
    auc_ci,
    beta_fit,
    block_counts,
    brier_decomposition,
    bss,
    bss_ci,
    ece,
)
from salt_forecast.domain.series import DAY


def _brute_auc(p: np.ndarray, y: np.ndarray) -> float:
    pos, neg = p[y == 1], p[y == 0]
    s = sum(1.0 if a > b else 0.5 if a == b else 0.0 for a, b in itertools.product(pos, neg))
    return s / (pos.size * neg.size)


@settings(max_examples=40, deadline=None)
@given(st.lists(st.tuples(st.integers(0, 5), st.booleans()), min_size=4, max_size=40))
def test_auc_matches_pairwise_count_with_ties(pairs: list[tuple[int, bool]]) -> None:
    p = np.array([a / 5 for a, _ in pairs], dtype=np.float64)
    y = np.array([float(b) for _, b in pairs])
    if y.min() == y.max():
        assert math.isnan(auc(p, y))
        return
    assert auc(p, y) == np.float64(_brute_auc(p, y)) or abs(auc(p, y) - _brute_auc(p, y)) < 1e-12


def test_weighted_auc_equals_duplicated_rows() -> None:
    rng = np.random.default_rng(0)
    p = rng.random(60)
    y = (rng.random(60) < p).astype(np.float64)
    w = rng.integers(0, 4, size=60).astype(np.float64)
    rep = np.repeat(np.arange(60), w.astype(int))
    assert abs(auc(p, y, w) - auc(p[rep], y[rep])) < 1e-12


def test_logistic_recovers_coefficients() -> None:
    rng = np.random.default_rng(1)
    x = rng.normal(size=(20000, 2))
    y = (rng.random(20000) < sigmoid(-0.5 + 1.2 * x[:, 0] - 0.7 * x[:, 1])).astype(np.float64)
    fit = fit_logistic(x, y, lam=1e-6)
    assert abs(fit.intercept + 0.5) < 0.06
    np.testing.assert_allclose(fit.coef, [1.2, -0.7], atol=0.06)


def test_standardizer_uses_fit_window_only_and_flags_missing() -> None:
    train = np.array([[1.0, np.nan], [3.0, 2.0], [5.0, 4.0]])
    sc = Standardizer.fit(train, flag_cols=(1,))
    z = sc.transform(np.array([[3.0, np.nan]]))
    assert z.shape == (1, 3)
    assert z[0, 0] == 0.0  # 학습 평균 3
    assert z[0, 2] == 1.0  # 결측 표시


def test_beta_calibration_fixes_overconfident_probabilities() -> None:
    rng = np.random.default_rng(2)
    true = rng.uniform(0.05, 0.4, 30000)
    y = (rng.random(true.size) < true).astype(np.float64)
    over = sigmoid(2.0 * np.log(true / (1 - true)))  # 과신(극단으로 늘림)
    cal = beta_fit(over, y)
    assert cal.a >= 0 and cal.b >= 0
    assert ece(cal.apply(over), y) < ece(over, y)
    assert ece(cal.apply(over), y) < 0.01


def test_beta_calibration_stays_monotone() -> None:
    rng = np.random.default_rng(3)
    p = rng.random(500)
    y = (rng.random(500) < 0.2).astype(np.float64)  # p 와 무관
    q = beta_fit(p, y).apply(np.linspace(0.01, 0.99, 50))
    assert np.all(np.diff(q) >= -1e-12)


def test_brier_decomposition_and_bss() -> None:
    rng = np.random.default_rng(4)
    p = rng.random(5000)
    y = (rng.random(5000) < p).astype(np.float64)
    parts = brier_decomposition(p, y)
    assert abs(parts.brier - (parts.reliability - parts.resolution + parts.uncertainty + parts.within_bin)) < 1e-12
    assert parts.reliability < 0.005
    assert bss(p, np.full(p.size, y.mean()), y) > 0
    assert abs(bss(np.full(p.size, y.mean()), np.full(p.size, y.mean()), y)) < 1e-12


def test_block_counts_preserve_length() -> None:
    c = block_counts(37, 6, 50, seed=1)
    assert c.shape == (50, 37)
    assert np.all(c.sum(axis=1) == 37)


def test_bootstrap_cis_cover_point_and_are_reproducible() -> None:
    rng = np.random.default_rng(5)
    dates = np.repeat(np.arange(80, dtype=np.int64) * 7 * DAY, 30)
    p = rng.random(dates.size)
    y = (rng.random(dates.size) < p).astype(np.float64)
    a = auc_ci(p, y, dates, 6, 300, seed=9)
    assert a[1] <= a[0] <= a[2]
    assert a == auc_ci(p, y, dates, 6, 300, seed=9)
    b = bss_ci(p, np.full(p.size, 0.5), y, dates, 6, 300, seed=9)
    assert b[1] <= b[0] <= b[2]


def test_cpcv_split_count_paths_and_purge() -> None:
    dates = np.arange(0, 420, 7, dtype=np.int64) * DAY  # 60주
    splits = cpcv_splits(dates, 6, 2, horizon_days=20, embargo_days=7)
    assert len(splits) == 15 and n_paths(6, 2) == 5
    tested = np.sum([s.test for s in splits], axis=0)
    assert np.all(tested == 5)  # 행마다 경로 수만큼 시험에 든다
    for s in splits:
        assert not np.any(s.train & s.test)
        for t in dates[s.train]:
            # 학습 행의 라벨 창 [t, t+20일] 이 어느 시험 행과도 겹치지 않는다
            assert not np.any((dates[s.test] >= t - 20 * DAY) & (dates[s.test] <= t + 20 * DAY))


def test_benjamini_yekutieli_is_stricter_than_bh() -> None:
    p = np.array([0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205, np.nan])
    keep = benjamini_yekutieli(p, 0.05)
    assert keep.tolist() == [True, False, False, False, False, False, False, False, False]
    assert not benjamini_yekutieli(np.array([np.nan]), 0.05).any()


def test_p_from_ci_and_dsr() -> None:
    assert abs(p_from_ci(1.96, 0.0, 3.92) - 0.05) < 1e-3
    assert math.isnan(p_from_ci(0.1, 0.2, 0.2))
    assert expected_max_sharpe(0.01, 1) == 0.0
    assert expected_max_sharpe(0.01, 10) > expected_max_sharpe(0.01, 4) > 0
    rng = np.random.default_rng(6)
    good = rng.normal(0.3, 1.0, 400)
    sr, dsr = deflated_sharpe(good, 0.0)
    assert sr > 0.2 and dsr > 0.99
    _, dsr_hard = deflated_sharpe(good, 0.5)
    assert dsr_hard < 0.05
