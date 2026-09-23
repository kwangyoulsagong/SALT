"""분위수 전망 — 로그수익률 분포 하나를 나타내는 값 객체.

한 점 예측을 두지 않는다(ADR-003). 중앙값은 분위수 중 하나일 뿐이다.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray

LEVELS: tuple[float, ...] = (0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95)
LEVELS_ARR: NDArray[np.float64] = np.asarray(LEVELS, dtype=np.float64)

# 정규분포 분위수(z). scipy 없이 쓰려고 상수로 둔다 — LEVELS 와 같은 순서.
Z_SCORES: NDArray[np.float64] = np.asarray(
    (
        -1.6448536269514722,
        -1.2815515655446004,
        -0.6744897501960817,
        0.0,
        0.6744897501960817,
        1.2815515655446004,
        1.6448536269514722,
    ),
    dtype=np.float64,
)

Direction = Literal["up", "down", "abstain"]


@dataclass(frozen=True, slots=True)
class QuantileForecast:
    """로그수익률 분위수(LEVELS 순서) + 상승 확률."""

    q: tuple[float, ...]
    p_up: float

    def __post_init__(self) -> None:
        if len(self.q) != len(LEVELS):
            raise ValueError(f"분위수는 {len(LEVELS)}개여야 한다: {len(self.q)}")
        if any(not np.isfinite(v) for v in self.q):
            raise ValueError("분위수에 유한하지 않은 값")
        if any(a > b for a, b in zip(self.q, self.q[1:], strict=False)):
            raise ValueError("분위수가 단조가 아니다")
        if not 0.0 <= self.p_up <= 1.0:
            raise ValueError(f"p_up 범위 밖: {self.p_up}")

    @staticmethod
    def from_array(values: NDArray[np.float64], p_up: float) -> QuantileForecast:
        """정렬해서 교차를 없앤다(modeling-evaluation.md §1). 교차 수는 호출자가 센다."""
        ordered = np.sort(values)
        return QuantileForecast(q=tuple(float(v) for v in ordered), p_up=float(np.clip(p_up, 0.0, 1.0)))

    def at(self, level: float) -> float:
        return self.q[LEVELS.index(level)]

    @property
    def array(self) -> NDArray[np.float64]:
        return np.asarray(self.q, dtype=np.float64)

    def interval(self, coverage: Literal[80, 90]) -> tuple[float, float]:
        return (self.at(0.10), self.at(0.90)) if coverage == 80 else (self.at(0.05), self.at(0.95))


def crossings(values: NDArray[np.float64]) -> int:
    """정렬 전 분위수 교차 수."""
    return int(np.sum(np.diff(values) < 0))


def pinball(forecast: QuantileForecast, realized: float) -> float:
    """분위수 전체의 평균 pinball loss. 작을수록 좋다."""
    diff = realized - forecast.array
    loss = np.maximum(LEVELS_ARR * diff, (LEVELS_ARR - 1.0) * diff)
    return float(np.mean(loss))
