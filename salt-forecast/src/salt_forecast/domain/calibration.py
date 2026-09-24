"""분위수 보정 — 정규화 CQR(conformalized quantile regression), 종목 풀링.

구간 [lo, hi] 의 적합도 점수 e = max(lo − y, y − hi) / scale 을 **이미 실현된** 과거 예측에서 모아,
명목 커버리지(1−α)에 맞는 조정량만큼 구간을 넓히거나 좁힌다. 스케일로 나눠 종목 간 풀링이 가능하다.

풀링이라 조정량은 as_of × 기간마다 **한 번** 계산하고 종목마다 scale 만 곱한다(performance.md §2).
잔차 풀은 호출자가 "라벨이 as_of 이전에 끝난" 것만 넘긴다 — 엠바고(time-and-leakage.md §4).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.quantiles import LEVELS, QuantileForecast

# 보정하는 구간: (아래 분위수, 위 분위수, 명목 커버리지)
INTERVALS: tuple[tuple[float, float, float], ...] = ((0.05, 0.95, 0.90), (0.10, 0.90, 0.80), (0.25, 0.75, 0.50))
MIN_POOL = 50


@dataclass(frozen=True, slots=True)
class ResidualPool:
    """실현된 과거 예측 m 개. raw_q: (m, 7) 보정 전 분위수, scale: (m,), realized: (m,)."""

    raw_q: NDArray[np.float64]
    scale: NDArray[np.float64]
    realized: NDArray[np.float64]

    def __post_init__(self) -> None:
        m = self.realized.shape[0]
        if self.raw_q.shape != (m, len(LEVELS)) or self.scale.shape != (m,):
            raise ValueError("잔차 풀 모양이 맞지 않는다")

    @property
    def size(self) -> int:
        return int(self.realized.shape[0])


@dataclass(frozen=True, slots=True)
class Adjustments:
    """구간별 정규화 조정량. 양수 = 넓힌다, 음수 = 좁힌다."""

    by_interval: tuple[float, ...]


def conformity_scores(pool: ResidualPool, lo: float, hi: float) -> NDArray[np.float64]:
    i_lo, i_hi = LEVELS.index(lo), LEVELS.index(hi)
    return np.maximum(pool.raw_q[:, i_lo] - pool.realized, pool.realized - pool.raw_q[:, i_hi]) / pool.scale


def finite_sample_quantile(scores: NDArray[np.float64], coverage: float) -> float:
    """유한 표본 보정 분위수 ⌈(m+1)(1−α)⌉/m."""
    m = scores.size
    level = min(1.0, float(np.ceil((m + 1) * coverage)) / m)
    return float(np.quantile(scores, level, method="higher"))


def fit_adjustments(pool: ResidualPool) -> Adjustments | None:
    """풀이 작으면 None — 보정 안 된 구간을 내보내지 않는다."""
    if pool.size < MIN_POOL:
        return None
    return Adjustments(tuple(finite_sample_quantile(conformity_scores(pool, lo, hi), cov) for lo, hi, cov in INTERVALS))


def apply(raw: QuantileForecast, scale: float, adj: Adjustments) -> QuantileForecast:
    q = raw.array.copy()
    for (lo, hi, _), a in zip(INTERVALS, adj.by_interval, strict=True):
        q[LEVELS.index(lo)] -= a * scale
        q[LEVELS.index(hi)] += a * scale
    return QuantileForecast.from_array(q, raw.p_up)
