"""메타 모델 피처 11개 — 사전등록 meta-model@1 [features] 그대로(FC-REQ-011).

전부 행 t 까지만 읽는다(`lag` · 뒤로 보는 창). 결측은 결측으로 둔다(modeling-evaluation.md §7) — 로지스틱은
학습 창 중앙값으로, LightGBM 은 그대로 다룬다. 시장 공통 값(BTC 추세 · HMM)은 모든 종목 열에 같은 값을 넣는다.
"""

from __future__ import annotations

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from numpy.typing import NDArray

from salt_forecast.domain.panel import Mat, Panel, lag, rolling_sum
from salt_forecast.domain.rule_items import contributions

FEATURES: tuple[str, ...] = (
    "rule_long",
    "rule_scalp",
    "mom_28d",
    "rs_btc_5d",
    "rs_btc_20d",
    "vol_pct_365",
    "turnover_z_30",
    "drawdown_365",
    "btc_trend",
    "hmm_p_high",
    "funding_7d",
)
# 단조 제약(+1 증가 · −1 감소 · 0 없음) — 사전등록 표와 같은 순서
MONOTONE: tuple[int, ...] = (1, 1, 0, 0, 0, 0, 0, 0, 0, 0, -1)
RULE_VERSION = "mode-decision@2"
VOL_PCT_WINDOW = 365
VOL_PCT_MIN_OBS = 120
TURNOVER_WINDOW = 30
DRAWDOWN_WINDOW = 365
TREND_WINDOW = 200
BTC = "KRW-BTC"


def _past_window(m: Mat, w: int) -> NDArray[np.float64]:
    """(행, 열, w) — 행 t 의 창은 t−w+1..t. 앞쪽 부족분은 NaN."""
    pad = np.vstack([np.full((w - 1, m.shape[1]), np.nan), m])
    return sliding_window_view(pad, w, axis=0)


def percentile_in_window(m: Mat, w: int, min_obs: int) -> Mat:
    """행 t 값이 창(t 포함) 값 중 몇 분위인가 = (창 안 값 ≤ 현재) ÷ 창 관측 수.
    관측 < min_obs 또는 현재 결측이면 NaN."""
    out = np.full_like(m, np.nan)
    for j in range(m.shape[1]):
        win = _past_window(m[:, [j]], w)[:, 0, :]  # (행, w)
        cur = m[:, j]
        n = np.sum(~np.isnan(win), axis=1)
        le = np.sum(win <= cur[:, None], axis=1)  # NaN 비교는 False
        ok = (n >= min_obs) & ~np.isnan(cur)
        out[ok, j] = le[ok] / n[ok]
    return out


def rolling_z(m: Mat, w: int) -> Mat:
    """행 t 의 창 w(t 포함) 평균 · 모표준편차 z. 창에 결측이 있거나 표준편차 0 이면 NaN."""
    s1 = rolling_sum(m, w) / w
    s2 = rolling_sum(m * m, w) / w
    var = s2 - s1 * s1
    with np.errstate(invalid="ignore", divide="ignore"):
        sd = np.sqrt(np.where(var > 1e-12, var, np.nan))
        return (m - s1) / sd


def drawdown_from_high(close: Mat, w: int) -> Mat:
    """C[t] / max(C[t−w+1..t]) − 1. 열마다 창을 만든다(전체 3차원 창은 메모리가 GB 단위)."""
    hi = np.full_like(close, np.nan)
    for j in range(close.shape[1]):
        win = _past_window(close[:, [j]], w)[:, 0, :]
        ok = ~np.all(np.isnan(win), axis=1)  # 상장 전 창은 전부 NaN
        hi[ok, j] = np.nanmax(win[ok], axis=1)
    return close / hi - 1.0


def _broadcast(v: NDArray[np.float64], n_cols: int) -> Mat:
    return np.repeat(v[:, None], n_cols, axis=1)


def build(
    p: Panel,
    fear_greed: NDArray[np.float64],
    sigma: Mat,
    hmm_p_high: NDArray[np.float64],
    funding_7d: Mat,
) -> dict[str, Mat]:
    """이름 → (날짜, 종목) 행렬. `sigma` = labels.ewma_sigma(p) — 라벨과 같은 σ."""
    c = contributions(p, fear_greed, version=RULE_VERSION)
    n_cols = len(p.symbols)
    with np.errstate(divide="ignore", invalid="ignore"):
        logc = np.log(p.close)
        mom = lag(logc, 1) - lag(logc, 28)
        r5 = logc - lag(logc, 5)
        r20 = logc - lag(logc, 20)
        log_value = np.log(p.volume * p.close)
    if BTC in p.symbols:
        j = p.column(BTC)
        btc_c = p.close[:, j]
        rs5 = r5 - r5[:, [j]]
        rs20 = r20 - r20[:, [j]]
        ma = rolling_sum(p.close[:, [j]], TREND_WINDOW)[:, 0] / TREND_WINDOW
        trend = np.where(np.isnan(ma), np.nan, (btc_c > ma).astype(np.float64))
    else:
        rs5 = rs20 = np.full(p.shape, np.nan)
        trend = np.full(p.dates.size, np.nan)
    log_value[~np.isfinite(log_value)] = np.nan
    feats = {
        "rule_long": c.total("long_term"),
        "rule_scalp": c.total("scalp"),
        "mom_28d": mom,
        "rs_btc_5d": rs5,
        "rs_btc_20d": rs20,
        "vol_pct_365": percentile_in_window(sigma, VOL_PCT_WINDOW, VOL_PCT_MIN_OBS),
        "turnover_z_30": rolling_z(log_value, TURNOVER_WINDOW),
        "drawdown_365": drawdown_from_high(p.close, DRAWDOWN_WINDOW),
        "btc_trend": _broadcast(trend, n_cols),
        "hmm_p_high": _broadcast(hmm_p_high, n_cols),
        "funding_7d": funding_7d,
    }
    assert tuple(feats) == FEATURES
    return feats
