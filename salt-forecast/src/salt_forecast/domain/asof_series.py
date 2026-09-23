"""빈티지 있는 시계열의 시점 고정 조회 — time-and-leakage.md §1 · §3.

한 시리즈의 점들(관측 시각 observed, 알게 된 시각 available, 값)에서
"t 시점에 알던, observed ≤ cutoff 인 가장 최근 관측의 그 시점 최신 빈티지"를 돌려준다.
수정 전 값으로 과거를 본다 — 나중에 수정된 값으로 과거를 학습하지 않는다.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True, slots=True)
class VintagedSeries:
    observed: NDArray[np.int64]
    available: NDArray[np.int64]
    value: NDArray[np.float64]

    def __post_init__(self) -> None:
        if not (self.observed.shape == self.available.shape == self.value.shape):
            raise ValueError("길이가 다르다")

    @staticmethod
    def build(observed: NDArray[np.int64], available: NDArray[np.int64], value: NDArray[np.float64]) -> VintagedSeries:
        order = np.lexsort((available, observed))
        return VintagedSeries(observed[order], available[order], value[order])

    def value_as_of(self, t: int, cutoff: int | None = None) -> float | None:
        """t 에 알 수 있던 것 중 observed ≤ cutoff(기본 t) 인 가장 최근 관측의, t 기준 최신 빈티지 값."""
        c = t if cutoff is None else min(cutoff, t)
        known = (self.available <= t) & (self.observed <= c)
        if not known.any():
            return None
        obs = self.observed[known]
        latest_obs = obs.max()
        pick = known & (self.observed == latest_obs)
        idx = np.flatnonzero(pick)
        return float(self.value[idx[np.argmax(self.available[idx])]])
