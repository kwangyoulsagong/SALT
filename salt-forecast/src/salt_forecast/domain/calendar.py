"""as_of 격자와 라벨 기간 — 자산군마다 하나(FC-REQ-009).

코인은 24/7 이라 주 = 7일, 업비트 일봉은 00:00 UTC 에 닫힌다(`WeeklyUtc`).
국내 주식은 거래일만 있다 — 주 = 5거래일, 격자 = 주 첫 거래일, 종가는 장 마감 뒤에야 안다(`KrxSessions`).
엔진 · 채점은 이 둘을 같은 모양(`Schedule`)으로 받는다. 시각은 전부 UTC epoch 초.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from salt_forecast.domain.series import DAY, WEEK, CloseSeries, realized_log_return

# 1970-01-05 (월) 00:00 UTC — 주 격자 기준점
_MONDAY_EPOCH = 4 * DAY
# 코인: 마지막 봉이 이보다 오래됐으면 전망하지 않는다(상장폐지 · 거래 중단 — 멈춘 가격으로 예측하지 않는다)
COIN_MAX_STALENESS = 2 * DAY


def floor_day(t: int) -> int:
    return t - t % DAY


def weekly_grid(start: int, end: int) -> list[int]:
    """[start, end] 안의 월요일 00:00 UTC."""
    first = start + (-(start - _MONDAY_EPOCH)) % WEEK
    return list(range(first, end + 1, WEEK))


def on_weekly_grid(t: int) -> bool:
    """t 가 월요일 00:00 UTC 격자 위에 있나. 라이브 게이트 표본은 이 격자 위의 as_of 만 센다(FC-REQ-001 FR-11)."""
    return (t - _MONDAY_EPOCH) % WEEK == 0


class Schedule(Protocol):
    """자산군의 시간 규칙. 엔진 · 채점 · 게이트가 이것만 본다."""

    @property
    def days_per_week(self) -> int:
        """1주 기간을 일봉 몇 개로 보나 — 코인 7 · 국내 주식 5(거래일)."""
        ...

    @property
    def max_gap(self) -> int | None:
        """일간 수익률로 인정하는 봉 간격 상한(초). None 이면 이웃 봉이 곧 이웃 거래일이다."""
        ...

    def grid(self, start: int, end: int) -> list[int]: ...

    def on_grid(self, t: int) -> bool: ...

    def label_end(self, as_of: int, horizon_weeks: int) -> int | None:
        """라벨(실현 수익률)을 알게 되는 시각. 달력이 아직 모르면 None."""
        ...

    def realized(self, series: CloseSeries, as_of: int, horizon_weeks: int) -> float | None: ...

    def fresh(self, series: CloseSeries, as_of: int) -> bool:
        """as_of 에 이 종목을 전망해도 되나 — 직전 봉이 있어야 한다."""
        ...


@dataclass(frozen=True, slots=True)
class WeeklyUtc:
    """코인 — 기존 동작 그대로(월요일 00:00 UTC · 7일 · 1.5일 간격 상한)."""

    days_per_week: int = 7
    max_gap: int | None = int(1.5 * DAY)

    def grid(self, start: int, end: int) -> list[int]:
        return weekly_grid(start, end)

    def on_grid(self, t: int) -> bool:
        return on_weekly_grid(t)

    def label_end(self, as_of: int, horizon_weeks: int) -> int | None:
        return as_of + horizon_weeks * WEEK

    def realized(self, series: CloseSeries, as_of: int, horizon_weeks: int) -> float | None:
        return realized_log_return(series, as_of, horizon_weeks)

    def fresh(self, series: CloseSeries, as_of: int) -> bool:
        last = series.last_at()
        return last is not None and last >= as_of - COIN_MAX_STALENESS


COIN = WeeklyUtc()
