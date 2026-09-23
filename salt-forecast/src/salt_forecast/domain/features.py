"""피처 정의 — 순수 계산. 입력은 이미 as_of 로 잘린 시계열과 시점 고정 조회 결과다.

이름 규칙 `<source>_<what>_<window>` (modeling-evaluation.md §7). 결측은 NaN 으로 둔다(0 으로 채우지 않는다).
"""

from __future__ import annotations

import numpy as np

from salt_forecast.domain.series import DAY, CloseSeries

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
