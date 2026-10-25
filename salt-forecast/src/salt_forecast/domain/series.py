"""시점 고정 종가 시계열.

시각은 전부 `available_at`(알 수 있게 된 시각) 기준이다 — time-and-leakage.md §1.
시각 표현은 UTC epoch 초(int64). datetime 변환은 store 가 한다.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from numpy.typing import NDArray

DAY = 86_400
WEEK = 7 * DAY


@dataclass(frozen=True, slots=True)
class CloseSeries:
    """한 종목의 종가. available_at 오름차순, 중복 없음."""

    symbol: str
    available_at: NDArray[np.int64]
    close: NDArray[np.float64]
    # 원천 이력이 끊긴 봉의 available_at(오름차순) — 그 봉 앞과 뒤는 다른 기준이라 잇지 않는다(FC-REQ-020 FR-10).
    # 국내 주식만 채운다(`domain/kr_breaks`). 비어 있으면 동작이 전과 같다
    breaks: NDArray[np.int64] = field(default_factory=lambda: np.empty(0, dtype=np.int64))

    def __post_init__(self) -> None:
        if self.available_at.shape != self.close.shape:
            raise ValueError("시각과 종가 길이가 다르다")
        if self.available_at.size and np.any(np.diff(self.available_at) <= 0):
            raise ValueError("available_at 이 엄격히 증가하지 않는다")
        if self.close.size and np.any(self.close <= 0):
            raise ValueError("0 이하 종가")

    def as_of(self, t: int) -> CloseSeries:
        """t 시점에 알 수 있었던 부분만. 피처는 반드시 이걸 거친다.

        끊김이 있으면 **t 까지 생긴 마지막 끊김 봉부터** — 그 앞은 다른 기준이다. t 뒤의 끊김은 모른다(누수 없음).
        """
        end = int(np.searchsorted(self.available_at, t, side="right"))
        if not self.breaks.size:
            return CloseSeries(self.symbol, self.available_at[:end], self.close[:end])
        k = int(np.searchsorted(self.breaks, t, side="right"))
        start = int(np.searchsorted(self.available_at, int(self.breaks[k - 1]), side="left")) if k else 0
        return CloseSeries(self.symbol, self.available_at[start:end], self.close[start:end], self.breaks[:k])

    def crosses_break(self, after: int, until: int) -> bool:
        """(after, until] 에 끊김이 있나 — 그 구간 수익률은 두 기준을 잇는다."""
        if not self.breaks.size:
            return False
        hi = int(np.searchsorted(self.breaks, until, side="right"))
        return hi > int(np.searchsorted(self.breaks, after, side="right"))

    def last_close(self) -> float | None:
        return float(self.close[-1]) if self.close.size else None

    def last_at(self) -> int | None:
        return int(self.available_at[-1]) if self.available_at.size else None

    def close_at_or_before(self, t: int) -> float | None:
        idx = int(np.searchsorted(self.available_at, t, side="right")) - 1
        return float(self.close[idx]) if idx >= 0 else None


def realized_log_return(series: CloseSeries, as_of: int, horizon_weeks: int) -> float | None:
    """as_of 의 기준 종가 → as_of + h 주 시점에 알 수 있던 종가. 아직 기간이 안 지났으면 None.

    기간 끝 시점의 종가가 as_of 이후에 새로 생긴 값이어야 한다(가격이 멈춘 종목의 가짜 0 수익률 방지).
    """
    end = as_of + horizon_weeks * WEEK
    last = series.last_at()
    if last is None or last < end:
        return None
    base = series.close_at_or_before(as_of)
    final = series.close_at_or_before(end)
    if base is None or final is None:
        return None
    return float(np.log(final / base))


@dataclass(frozen=True, slots=True)
class OhlcvSeries:
    """일봉 OHLCV. available_at 오름차순. 거래량 · 장중 범위 피처(v0.6)용."""

    symbol: str
    available_at: NDArray[np.int64]
    open: NDArray[np.float64]
    high: NDArray[np.float64]
    low: NDArray[np.float64]
    close: NDArray[np.float64]
    volume: NDArray[np.float64]

    def __post_init__(self) -> None:
        n = self.available_at.shape
        if not all(a.shape == n for a in (self.open, self.high, self.low, self.close, self.volume)):
            raise ValueError("OHLCV 길이가 다르다")

    def as_of(self, t: int) -> OhlcvSeries:
        end = int(np.searchsorted(self.available_at, t, side="right"))
        return OhlcvSeries(
            self.symbol,
            self.available_at[:end],
            self.open[:end],
            self.high[:end],
            self.low[:end],
            self.close[:end],
            self.volume[:end],
        )
