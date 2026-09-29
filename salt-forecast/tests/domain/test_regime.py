"""국면 · HMM · 게이트 곡선 · 이벤트일 · 손절 도달 · 베타(FC-REQ-010)."""

from __future__ import annotations

from datetime import UTC, datetime

import numpy as np
import pytest

from salt_forecast.domain.hmm import filter_probs, fit
from salt_forecast.domain.regime import (
    beta_by_symbol,
    btc_beta,
    capture,
    delta_mdd_ci,
    drawdown_from_peak,
    event_rows,
    first_touch,
    gate_is_open,
    hmm_monthly,
    max_drawdown,
    reduction_factor,
    regime_state,
    sigma_ratio_ci,
    sma,
    strategy_returns,
    trend_open,
)
from salt_forecast.domain.series import DAY, CloseSeries

T0 = int(datetime(2018, 1, 1, tzinfo=UTC).timestamp())


def _two_state(n_blocks: int = 6, block: int = 300, seed: int = 1) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    s = np.repeat(np.arange(n_blocks) % 2, block)
    x = np.where(s == 1, rng.normal(0.0, 0.05, s.size), rng.normal(0.001, 0.02, s.size))
    return x, s


def test_hmm_recovers_two_volatility_states() -> None:
    x, s = _two_state()
    p = fit(x, 2, seed=20260929)
    assert p.var[0] < p.var[1]  # 마지막 상태가 고변동
    assert np.sqrt(p.var) == pytest.approx([0.02, 0.05], rel=0.1)
    probs = filter_probs(p, x)
    assert np.allclose(probs.sum(axis=1), 1.0)
    assert ((probs[:, 1] > 0.5) == (s == 1)).mean() > 0.95


def test_hmm_fit_is_deterministic_for_seed() -> None:
    x, _ = _two_state()
    a, b = fit(x, 2, seed=7), fit(x, 2, seed=7)
    assert a.log_likelihood == b.log_likelihood
    assert np.array_equal(a.mean, b.mean)


def test_forward_filter_does_not_read_future() -> None:
    x, _ = _two_state()
    p = fit(x, 2, seed=1)
    full = filter_probs(p, x)
    changed = x.copy()
    changed[1000:] = 0.5  # 미래를 바꿔도
    assert np.array_equal(filter_probs(p, changed)[:1000], full[:1000])  # 과거 확률은 같다


def test_hmm_monthly_uses_only_past_returns() -> None:
    x, _ = _two_state(n_blocks=10, block=100)
    dates = T0 + DAY * np.arange(1, x.size + 1, dtype=np.int64)
    base = hmm_monthly(dates, x, k=2, min_train=400)
    cut = 800
    changed = x.copy()
    changed[cut:] *= 3.0
    after = hmm_monthly(dates, changed, k=2, min_train=400)
    assert np.isnan(base.p_high[:400]).all()  # 적합 전은 없음
    assert np.array_equal(base.p_high[:cut], after.p_high[:cut], equal_nan=True)


def test_sma_and_trend_gate() -> None:
    close = np.arange(1.0, 11.0)
    assert sma(close, 3)[2] == pytest.approx(2.0)
    assert np.isnan(sma(close, 3)[1])
    assert trend_open(close, 3)[:2].all()  # 이동평균 없으면 열림
    assert trend_open(close, 3)[2:].all()  # 상승 → 위
    assert not trend_open(close[::-1].copy(), 3)[2:].any()


def test_strategy_returns_lag_and_cost() -> None:
    simple = np.array([np.nan, 0.10, 0.10, 0.10, 0.10])
    e = np.array([1.0, 0.0, 0.0, 1.0, 1.0])
    out = np.expm1(strategy_returns(simple, e, cost=0.001))
    # 행 1 은 e[0]=1 로 보유 · 행 2 는 e[1]=0 으로 전환(비용) · 행 3 은 0 유지 · 행 4 는 다시 1(비용)
    assert out[1] == pytest.approx(0.10)
    assert out[2] == pytest.approx(-0.001)
    assert out[3] == pytest.approx(0.0)
    assert out[4] == pytest.approx(0.10 - 0.001)


def test_max_drawdown_and_capture() -> None:
    log_r = np.log(np.array([1.0, 1.1, 0.5, 1.2]))
    assert max_drawdown(log_r) == pytest.approx(0.5)
    months = np.array([1, 1, 2, 2], dtype=np.int64)
    hold = np.array([0.1, 0.1, -0.1, -0.1])
    up, dn = capture(hold, hold * 0.5, months)
    assert (up, dn) == (pytest.approx(0.5), pytest.approx(0.5))


def test_delta_mdd_ci_same_curve_is_zero() -> None:
    rng = np.random.default_rng(0)
    r = rng.normal(0, 0.03, 500)
    point, lo, hi = delta_mdd_ci(r, r, n_boot=200)
    assert point == 0 and lo == 0 and hi == 0
    point, lo, _ = delta_mdd_ci(r, r * 0.3, n_boot=200)
    assert point > 0 and lo > 0  # 노출을 줄이면 덜 빠진다


def test_drawdown_from_peak_window() -> None:
    close = np.array([10.0, 20.0, 10.0, 15.0])
    dd = drawdown_from_peak(close, window=2)
    assert dd[2] == pytest.approx(-0.5)
    assert dd[3] == pytest.approx(0.0)  # 창 2 — 20 은 이미 창 밖


def test_event_rows_marks_bar_containing_release() -> None:
    dates = T0 + DAY * np.arange(1, 6, dtype=np.int64)  # 행 t 봉 = (dates[t]−1일, dates[t]]
    at = np.array([T0 + DAY + 3600, T0 + 3 * DAY], dtype=np.int64)  # 행 1 봉 안 · 행 2 마감 정각
    m = event_rows(dates, at)
    assert m.tolist() == [False, True, True, False, False]


def test_sigma_ratio_and_reduction() -> None:
    rng = np.random.default_rng(3)
    ev, other = rng.normal(0, 0.04, 120), rng.normal(0, 0.02, 1500)
    point, lo, hi = sigma_ratio_ci(ev, other, n_boot=500)
    assert lo < point < hi and lo > 1
    assert reduction_factor(point, lo) == pytest.approx(0.5)  # 1/2 → 0.5 하한
    assert reduction_factor(1.3, 1.1) == pytest.approx(0.75)  # 1/1.3 = 0.769 → 0.05 내림
    assert reduction_factor(1.3, 0.95) == 1.0  # CI 가 1 포함 → 축소 없음


def test_first_touch_stop_counts_same_day_as_stop_and_uses_close_loss() -> None:
    close = np.array([[100.0], [95.0], [99.0], [120.0], [120.0]])
    high = np.array([[100.0], [115.0], [100.0], [121.0], [121.0]])
    low = np.array([[100.0], [89.0], [98.0], [119.0], [119.0]])
    dn = np.full_like(close, np.log(0.9))
    up = np.full_like(close, np.log(1.1))
    far = np.full_like(close, np.log(1.2))
    eligible = np.array([[True], [False], [False], [False], [False]])
    t = first_touch(high, low, close, 2, dn, up, far, eligible)
    assert t.n == 1 and t.stop_first == 1.0 and t.take_first == 0.0  # 같은 날 둘 다 → 손절
    assert t.stop_loss_mean == pytest.approx(-0.05)  # 그날 종가 95 기준


def test_btc_beta() -> None:
    rng = np.random.default_rng(5)
    b = rng.normal(0, 0.03, 120)
    a = 1.5 * b + rng.normal(0, 0.001, 120)
    assert btc_beta(a, b) == pytest.approx(1.5, abs=0.02)
    short = np.full(120, np.nan)
    short[-30:] = a[-30:]
    assert btc_beta(short, b) is None


def _btc_series(n: int = 900, seed: int = 11) -> CloseSeries:
    rng = np.random.default_rng(seed)
    r = np.where((np.arange(n) // 150) % 2 == 1, rng.normal(0, 0.05, n), rng.normal(0.001, 0.02, n))
    at = T0 + DAY * np.arange(1, n + 1, dtype=np.int64)
    return CloseSeries("KRW-BTC", at, 100.0 * np.exp(np.cumsum(r)))


def test_regime_state_matches_backtest_path_and_ignores_future() -> None:
    s = _btc_series()
    as_of = int(s.available_at[850])
    st = regime_state(s, as_of, [("fomc", as_of + 3600), ("jobs", as_of + 60)], gate="both", event_factor=0.8)
    assert st is not None
    # 백테스트와 같은 경로 — 같은 날의 hmm_monthly p_high 와 같다
    r = np.log(s.close[1:] / s.close[:-1])
    r = np.concatenate(([np.nan], r))
    path = hmm_monthly(s.available_at[:851], r[:851], k=2)
    assert st.hmm_p_high == pytest.approx(path.p_high[850])
    assert st.gate_open == (st.trend_open and (st.hmm_p_high or 0) <= 0.5)
    assert (st.next_event_kind, st.event_factor) == ("fomc", 0.8)  # jobs 는 축소 대상이 아니다
    # 미래 봉이 더 있어도 같은 as_of 는 같은 행
    longer = regime_state(s, as_of, [], gate="both")
    shorter = regime_state(s.as_of(as_of), as_of, [], gate="both")
    assert longer is not None and shorter is not None
    assert (longer.hmm_p_high, longer.sma_200d, longer.drawdown_365d) == (
        shorter.hmm_p_high,
        shorter.sma_200d,
        shorter.drawdown_365d,
    )


def test_gate_is_open_without_adopted_gate_or_materials() -> None:
    assert gate_is_open(None, trend=False, p_high=0.9)  # 채택 없음 → 걸지 않는다
    assert gate_is_open("hmm", trend=False, p_high=None)  # 재료 없음 → 열림
    assert not gate_is_open("trend", trend=False, p_high=0.1)
    assert not gate_is_open("both", trend=True, p_high=0.7)


def test_beta_by_symbol_aligns_on_dates() -> None:
    rng = np.random.default_rng(2)
    n = 120
    at = T0 + DAY * np.arange(1, n + 1, dtype=np.int64)
    rb = rng.normal(0, 0.03, n)
    btc = CloseSeries("KRW-BTC", at, 100 * np.exp(np.cumsum(rb)))
    alt_r = 2.0 * rb + rng.normal(0, 0.001, n)
    alt = CloseSeries("KRW-ALT", at[20:], 10 * np.exp(np.cumsum(alt_r[20:])))  # 늦게 상장
    betas = beta_by_symbol({"KRW-BTC": btc, "KRW-ALT": alt}, "KRW-BTC", int(at[-1]))
    assert betas["KRW-BTC"] == pytest.approx(1.0)
    assert betas["KRW-ALT"] == pytest.approx(2.0, abs=0.05)
