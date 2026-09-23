"""피처 정의 — 순수 계산. 입력은 이미 as_of 로 잘린 시계열과 시점 고정 조회 결과다.

이름 규칙 `<source>_<what>_<window>` (modeling-evaluation.md §7). 결측은 NaN 으로 둔다(0 으로 채우지 않는다).
"""

from __future__ import annotations

import numpy as np

from salt_forecast.domain.series import DAY, CloseSeries, OhlcvSeries

PRICE_FEATURES: tuple[str, ...] = (
    "px_ret_1w",
    "px_ret_4w",
    "px_ret_12w",
    "px_vol_4w",
    "px_vol_12w",
    "px_vol_ratio_4w_12w",
    "px_dd_52w",
    "px_age_days",
)


def _close_before(s: CloseSeries, t: int) -> float | None:
    return s.close_at_or_before(t)


def price_features(s: CloseSeries, as_of: int) -> dict[str, float]:
    """s 는 as_of 로 잘린 시계열."""
    nan = float("nan")
    out = dict.fromkeys(PRICE_FEATURES, nan)
    last = s.last_close()
    if last is None or s.close.size < 2:
        return out
    for name, days in (("px_ret_1w", 7), ("px_ret_4w", 28), ("px_ret_12w", 84)):
        past = _close_before(s, as_of - days * DAY)
        out[name] = float(np.log(last / past)) if past else nan

    def vol(days: int) -> float:
        mask = s.available_at >= as_of - days * DAY
        c = s.close[mask]
        return float(np.std(np.diff(np.log(c)), ddof=1)) if c.size > 5 else nan

    v4, v12 = vol(28), vol(84)
    out["px_vol_4w"], out["px_vol_12w"] = v4, v12
    out["px_vol_ratio_4w_12w"] = v4 / v12 if v12 and not np.isnan(v12) and v12 > 0 else nan
    window = s.close[s.available_at >= as_of - 364 * DAY]
    out["px_dd_52w"] = float(np.log(last / window.max())) if window.size else nan
    out["px_age_days"] = float((as_of - int(s.available_at[0])) / DAY)
    return out


def log_change(now: float | None, before: float | None) -> float:
    if now is None or before is None or now <= 0 or before <= 0:
        return float("nan")
    return float(np.log(now / before))


def diff(now: float | None, before: float | None) -> float:
    if now is None or before is None:
        return float("nan")
    return now - before


def cross_sectional_rank(values: dict[str, float]) -> dict[str, float]:
    """종목 간 백분위 순위(0~1). NaN 은 NaN."""
    keys = [k for k, v in values.items() if not np.isnan(v)]
    if not keys:
        return dict.fromkeys(values, float("nan"))
    order = np.argsort(np.argsort([values[k] for k in keys]))
    ranks = {k: float(r) / max(1, len(keys) - 1) for k, r in zip(keys, order, strict=True)}
    return {k: ranks.get(k, float("nan")) for k in values}


def quantiles_to_p_up(q: np.ndarray, levels: np.ndarray) -> float:
    """분위수 곡선에서 P(r > 0) — 0 이 놓인 자리를 선형 보간. 꼬리 밖은 끝 수준으로 자른다."""
    if q[0] >= 0:
        return float(1 - levels[0])
    if q[-1] <= 0:
        return float(1 - levels[-1])
    cdf_at_zero = float(np.interp(0.0, q, levels))
    return 1.0 - cdf_at_zero


OHLCV_FEATURES: tuple[str, ...] = (
    "gk_vol_1w",
    "gk_vol_4w",
    "gk_ratio_1w_4w",
    "value_log_1w",
    "value_chg_1w_3w",
)


def garman_klass_var(o: np.ndarray, h: np.ndarray, lo: np.ndarray, c: np.ndarray) -> np.ndarray:
    """일간 Garman–Klass 분산: 0.5·ln(H/L)² − (2ln2 − 1)·ln(C/O)². 종가만 쓰는 추정보다 효율이 높다."""
    with np.errstate(divide="ignore", invalid="ignore"):
        hl = np.log(h / lo)
        co = np.log(c / o)
        v = 0.5 * hl**2 - (2 * np.log(2) - 1) * co**2
    return np.where(np.isfinite(v) & (v >= 0), v, np.nan)


def ohlcv_features(s: OhlcvSeries, as_of: int) -> dict[str, float]:
    """s 는 as_of 로 잘린 OHLCV. 논문(Dudek 외 2025) 상위 피처 — 거래량 변화 · 실현 변동성 — 의 일봉 대용."""
    nan = float("nan")
    out = dict.fromkeys(OHLCV_FEATURES, nan)
    if s.close.size < 8:
        return out
    gk = garman_klass_var(s.open, s.high, s.low, s.close)
    value = s.close * s.volume  # 원화 거래대금

    def window(days: int, end_days: int = 0) -> np.ndarray:
        return (s.available_at > as_of - (days + end_days) * DAY) & (s.available_at <= as_of - end_days * DAY)

    def gk_vol(days: int) -> float:
        v = gk[window(days)]
        v = v[np.isfinite(v)]
        return float(np.sqrt(v.mean())) if v.size >= max(3, days // 2) else nan

    g1, g4 = gk_vol(7), gk_vol(28)
    out["gk_vol_1w"], out["gk_vol_4w"] = g1, g4
    out["gk_ratio_1w_4w"] = g1 / g4 if g4 and np.isfinite(g4) and g4 > 0 and np.isfinite(g1) else nan
    v1 = value[window(7)]
    v_prev = value[window(21, 7)]
    if v1.size and np.all(v1 > 0):
        out["value_log_1w"] = float(np.log(v1.mean()))
        if v_prev.size and np.all(v_prev > 0):
            out["value_chg_1w_3w"] = float(np.log(v1.mean() / v_prev.mean()))
    return out
