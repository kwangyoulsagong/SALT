"""풀링 HAR · 범위 분산 · 패널 FHS(FC-REQ-020 FR-11 · FR-12)."""

from __future__ import annotations

import numpy as np
import pytest

from salt_forecast.domain.calibration import ResidualPool
from salt_forecast.domain.har import (
    VAR_FLOOR,
    build_panel,
    fit_har,
    forward_log_mean,
    forward_log_return,
    qlike_loss,
    trailing_log_mean,
)
from salt_forecast.models.engine import mondrian

NAN = np.nan


def test_trailing_mean_uses_only_past_window() -> None:
    x = np.asarray([[1.0, 2.0, 3.0, 4.0, 5.0, 6.0]])
    out = trailing_log_mean(x, 3)
    assert np.isnan(out[0, :2]).all()
    assert out[0, 2] == pytest.approx(np.log(2.0))
    assert out[0, 5] == pytest.approx(np.log(5.0))


def test_trailing_mean_needs_80_percent_present() -> None:
    x = np.asarray([[1.0, NAN, NAN, 4.0, 5.0]])
    assert np.isnan(trailing_log_mean(x, 5)[0, 4])  # 3/5 < 80%
    out4 = trailing_log_mean(np.asarray([[1.0, NAN, 3.0, 4.0, 5.0, 6.0]]), 5)
    assert out4[0, 5] == pytest.approx(np.log((3 + 4 + 5 + 6) / 4))


def test_trailing_mean_floors_zero_variance() -> None:
    out = trailing_log_mean(np.zeros((1, 5)), 5)
    assert out[0, 4] == pytest.approx(np.log(VAR_FLOOR))


def test_forward_mean_is_next_n_days_and_blank_at_end() -> None:
    x = np.asarray([[1.0, 2.0, 3.0, 4.0, 5.0]])
    out = forward_log_mean(x, 2)
    assert out[0, 0] == pytest.approx(np.log(2.5))  # 날 1 · 2
    assert out[0, 2] == pytest.approx(np.log(4.5))
    assert np.isnan(out[0, 3:]).all()


def test_forward_return_uses_last_known_close_through_halt() -> None:
    close = np.asarray([[100.0, 110.0, NAN, NAN, 121.0]])
    out = forward_log_return(close, 2)
    assert out[0, 0] == pytest.approx(np.log(1.1))  # 날 2 정지 → 날 1 종가
    assert out[0, 1] == pytest.approx(0.0)
    assert out[0, 2] == pytest.approx(np.log(121.0 / NAN), nan_ok=True)


def test_panel_returns_need_both_neighbours_and_market_skips_thin_and_limit() -> None:
    c = np.asarray([[100.0, 101.0, NAN, 103.0], [10.0, 20.0, 20.0, 20.0], [50.0, 50.5, 51.0, 51.5]])
    vol = np.asarray([[1e8] * 4, [1e9] * 4, [1.0] * 4])  # 셋째는 거래대금 < 10억
    p = build_panel(c, c * 1.01, c * 0.99, c, vol)
    assert np.isnan(p.r[0, 2]) and np.isnan(p.r[0, 3])
    # 날 1: 첫째 +1% 만(둘째 +69% 는 ±30% 밖, 셋째는 얇다)
    assert p.market[1] == pytest.approx(np.log(1.01))
    assert np.all(p.range_var[np.isfinite(p.range_var)] >= 0)


def test_fit_recovers_pooled_coefficients_and_centers_shape() -> None:
    rng = np.random.default_rng(3)
    n = 4000
    x = rng.normal(-8.0, 0.7, size=(n, 2))
    y = -1.0 + 0.6 * x[:, 0] + 0.3 * x[:, 1] + rng.normal(0, 0.3, n)
    ret = rng.standard_t(5, n) * np.sqrt(np.exp(y) * 10) + 0.01
    fit = fit_har(x, y, ret, n_days=10, weeks=52)
    assert fit is not None
    assert fit.beta[1] == pytest.approx(0.6, abs=0.05)
    assert fit.beta[2] == pytest.approx(0.3, abs=0.05)
    assert fit.smear == pytest.approx(np.exp(0.3**2 / 2), rel=0.05)  # 로그 정규 잔차의 스미어링
    # 분산비 = h주 실현 분산 ÷ 적합 분산 — t(5) 분산 5/3 × 스미어링(kr-scale@2 절제)
    assert fit.vr == pytest.approx(5 / 3 * np.exp(0.3**2 / 2), rel=0.1)
    x0 = np.asarray([-8.0, -8.0])
    assert fit.daily_var(x0, variance_ratio=True) / fit.daily_var(x0) == pytest.approx(fit.vr / fit.smear)
    for q in fit.z_by_bucket:
        assert q[3] == 0.0 and np.all(np.diff(q) >= 0)
    assert fit.bucket(np.asarray([-12.0, -12.0])) == 1
    assert fit.bucket(np.asarray([-4.0, -4.0])) == 3


def test_fit_refuses_small_or_missing_rows() -> None:
    x = np.full((30, 2), NAN)
    assert fit_har(x, np.zeros(30), np.zeros(30), 5, 30) is None


def test_qlike_prefers_true_variance() -> None:
    rng = np.random.default_rng(1)
    r = rng.normal(0, 0.05, 20_000)
    assert qlike_loss(r, np.full(r.size, 0.05**2)).mean() < qlike_loss(r, np.full(r.size, 0.08**2)).mean()
    assert qlike_loss(r, np.full(r.size, 0.05**2)).mean() < qlike_loss(r, np.full(r.size, 0.03**2)).mean()
    assert np.isfinite(qlike_loss(np.zeros(1), np.ones(1))).all()


def test_mondrian_ignores_bucket_zero_and_small_buckets() -> None:
    rng = np.random.default_rng(0)
    m = 300
    raw = np.sort(rng.normal(0, 1, (m, 7)), axis=1)
    pool = ResidualPool(raw, np.ones(m), rng.normal(0, 1, m))
    assert mondrian(pool, np.zeros(m, dtype=np.int64)) == {}
    bucket = np.asarray([1] * 200 + [2] * 90 + [3] * 10, dtype=np.int64)
    out = mondrian(pool, bucket)
    assert set(out) == {1, 2}  # 버킷 3 은 50 미만 → 풀 전체 조정량
