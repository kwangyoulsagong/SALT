"""기준 모델 — 이걸 못 이기면 예측이 아니다(modeling-evaluation.md §2).

입력은 이미 `as_of` 로 잘린 시계열이어야 한다. 이 모듈은 시각을 모른다.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.quantiles import LEVELS_ARR, Z_SCORES, QuantileForecast
from salt_forecast.domain.series import DAY, CloseSeries

VOL_LOOKBACK_DAYS = 365
EMPIRICAL_LOOKBACK_DAYS = 730
MIN_DAILY_RETURNS = 120


@dataclass(frozen=True, slots=True)
class RawForecast:
    forecast: QuantileForecast
    scale: float  # 정규화 잔차에 쓰는 스케일 = 일 변동성 × √(기간 일수)


def daily_log_returns(series: CloseSeries, lookback_days: int) -> NDArray[np.float64]:
    """최근 lookback_days 안의 일간 로그수익률.

    관측 간격이 하루보다 길면 그 구간은 버린다(결측을 0 으로 만들지 않는다).
    """
    if series.close.size < 2:
        return np.empty(0, dtype=np.float64)
    start = series.available_at[-1] - lookback_days * DAY
    mask = series.available_at >= start
    t = series.available_at[mask]
    c = series.close[mask]
    gaps = np.diff(t)
    r = np.diff(np.log(c))
    return r[(gaps > 0) & (gaps <= int(1.5 * DAY))]


def random_walk_normal(series: CloseSeries, horizon_weeks: int) -> RawForecast | None:
    """기준 A — 중앙값 0, 과거 1년 일 변동성 × √n 정규 분위수. 상승 확률 0.5."""
    r = daily_log_returns(series, VOL_LOOKBACK_DAYS)
    if r.size < MIN_DAILY_RETURNS:
        return None
    sigma = float(np.std(r, ddof=1))
    scale = sigma * float(np.sqrt(7 * horizon_weeks))
    if scale <= 0:
        return None
    return RawForecast(QuantileForecast.from_array(Z_SCORES * scale, 0.5), scale)


def empirical_horizon_returns(series: CloseSeries, horizon_weeks: int) -> NDArray[np.float64]:
    """최근 2년 안에서 **이미 끝난** n 일 수익률(겹침 허용). 끝이 as_of 이후인 표본은 없다 — 입력이 이미 잘려 있다."""
    n = 7 * horizon_weeks
    if series.close.size <= n:
        return np.empty(0, dtype=np.float64)
    start = series.available_at[-1] - EMPIRICAL_LOOKBACK_DAYS * DAY
    mask = series.available_at >= start
    c = series.close[mask]
    if c.size <= n:
        return np.empty(0, dtype=np.float64)
    return np.log(c[n:] / c[:-n])


def empirical_quantiles(series: CloseSeries, horizon_weeks: int) -> RawForecast | None:
    """기준 B — 과거 n 일 수익률의 경험 분위수 · 경험 상승 확률."""
    base = random_walk_normal(series, horizon_weeks)
    samples = empirical_horizon_returns(series, horizon_weeks)
    if base is None or samples.size < 60:
        return None
    q = np.quantile(samples, LEVELS_ARR)
    p_up = float(np.mean(samples > 0))
    return RawForecast(QuantileForecast.from_array(q, p_up), base.scale)


def ensemble(parts: list[RawForecast]) -> RawForecast | None:
    """분위수 평균 · 상승 확률 평균. 스케일은 첫 모델(기준 A)의 것을 쓴다 — 보정 정규화 단위를 모델 사이에 맞추려고."""
    if not parts:
        return None
    q = np.mean(np.stack([p.forecast.array for p in parts]), axis=0)
    p_up = float(np.mean([p.forecast.p_up for p in parts]))
    return RawForecast(QuantileForecast.from_array(q, p_up), parts[0].scale)
