"""시점 고정 입력 — 모든 모델 입력은 여기를 거친다(time-and-leakage.md §2).

슬라이스 16 은 종가뿐이다. 공시 · 내부자 · 감성 피처(슬라이스 20~)도 같은 as_of 인자를 필수로 받는다.
"""

from __future__ import annotations

from collections.abc import Mapping

from salt_forecast.domain.series import CloseSeries


def closes_as_of(series: Mapping[str, CloseSeries], as_of: int) -> dict[str, CloseSeries]:
    return {s: c.as_of(as_of) for s, c in series.items()}
