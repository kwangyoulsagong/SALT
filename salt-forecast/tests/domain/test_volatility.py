"""실현 변동성 (FC-REQ-006) — 순수 계산."""

from datetime import UTC, datetime

import numpy as np
import pytest

from salt_forecast.domain.series import DAY, CloseSeries
from salt_forecast.domain.volatility import (
    ANNUAL_DAYS,
    EVAL_DAYS,
    GARCH_MIN_TRAIN,
    MIN_RETURNS,
    GarchParams,
    estimate,
    ewma_forecasts,
    fit_garch,
    garch_forecasts,
    rolling_forecasts,
)

T0 = int(datetime(2022, 1, 1, tzinfo=UTC).timestamp())


def _series(r: np.ndarray, symbol: str = "KRW-BTC") -> CloseSeries:
    close = 100 * np.exp(np.concatenate(([0.0], np.cumsum(r))))
    t = (T0 + np.arange(1, close.size + 1, dtype=np.int64) * DAY).astype(np.int64)
    return CloseSeries(symbol, t, close)


def _at(days: int) -> datetime:
    return datetime.fromtimestamp(T0 + days * DAY, UTC)


def _simulate_garch(p: GarchParams, n: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    z = rng.standard_normal(n)
    r = np.empty(n)
    h = p.unconditional
    for t in range(n):
        r[t] = np.sqrt(h) * z[t]
        h = p.omega + p.alpha * r[t] ** 2 + p.beta * h
    return r


def test_ewma_of_constant_magnitude_returns_is_that_magnitude() -> None:
    r = np.tile([0.02, -0.02], 100)
    f = ewma_forecasts(r)
    assert f[-1] == pytest.approx(0.02**2)
    assert np.isnan(f[:30]).all()


def test_forecast_at_t_uses_only_returns_before_t() -> None:
    rng = np.random.default_rng(1)
    r = rng.normal(0, 0.03, 300)
    bumped = r.copy()
    bumped[200] = 0.5
    for fn in (ewma_forecasts, rolling_forecasts):
        a, b = fn(r), fn(bumped)
        np.testing.assert_array_equal(a[:201], b[:201])
        assert b[201] > a[201]


def test_garch_fit_recovers_known_parameters() -> None:
    true = GarchParams(omega=0.0004 * 0.05, alpha=0.10, beta=0.85)
    fit = fit_garch(_simulate_garch(true, 3000, seed=7))
    assert fit.alpha == pytest.approx(0.10, abs=0.04)
    assert fit.beta == pytest.approx(0.85, abs=0.06)
    assert fit.alpha + fit.beta < 1


def test_garch_filter_one_step() -> None:
    p = GarchParams(omega=0.00001, alpha=0.1, beta=0.8)
    f = garch_forecasts(np.array([0.05]), p)
    assert f[0] == pytest.approx(p.unconditional)
    assert f[1] == pytest.approx(0.00001 + 0.1 * 0.0025 + 0.8 * p.unconditional)


def test_estimate_annualizes_ewma_and_scores_it() -> None:
    true = GarchParams(omega=0.0009 * 0.05, alpha=0.10, beta=0.85)
    n = GARCH_MIN_TRAIN + EVAL_DAYS + 20
    s = _series(_simulate_garch(true, n, seed=3))
    e = estimate(s, _at(n + 1))
    assert e.blocked_reason is None and e.annualized is not None
    assert e.method == "ewma"
    assert e.annualized == e.ewma
    assert e.sample == n
    assert e.qlike_garch is not None and e.garch is not None
    # 일 3% 안팎 → 연율 30~90% 범위
    assert 0.3 < e.annualized < 0.9
    assert e.annualized == pytest.approx(np.sqrt(ewma_forecasts(np.diff(np.log(s.close)))[-1] * ANNUAL_DAYS))


def test_short_history_is_blocked_not_zero() -> None:
    e = estimate(_series(np.full(MIN_RETURNS - 1, 0.01)), _at(MIN_RETURNS + 1))
    assert e.annualized is None and e.ewma is None
    assert e.blocked_reason == "insufficient_history"


def test_garch_skipped_without_enough_training_history() -> None:
    rng = np.random.default_rng(2)
    n = MIN_RETURNS + 10
    e = estimate(_series(rng.normal(0, 0.03, n)), _at(n + 1))
    assert e.garch is None and e.qlike_garch is None
    assert e.qlike_ewma is not None


def test_stale_prices_are_blocked() -> None:
    rng = np.random.default_rng(4)
    n = MIN_RETURNS + 10
    e = estimate(_series(rng.normal(0, 0.03, n)), _at(n + 1 + 4))
    assert e.blocked_reason == "stale_prices" and e.annualized is None
