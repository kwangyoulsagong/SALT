"""as_of 격자와 라벨 기간 — 자산군마다 하나(FC-REQ-009).

코인은 24/7 이라 주 = 7일, 업비트 일봉은 00:00 UTC 에 닫힌다(`WeeklyUtc`).
국내 주식은 거래일만 있다 — 주 = 5거래일, 격자 = 주 첫 거래일, 종가는 장 마감 뒤에야 안다(`KrxSessions`).
엔진 · 채점은 이 둘을 같은 모양(`Schedule`)으로 받는다. 시각은 전부 UTC epoch 초.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from typing import Protocol

import numpy as np
from numpy.typing import NDArray

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

# KRX 정규장 15:30 KST 마감 + 정정 여유 30분 = 16:00 KST = 07:00 UTC(FEATURE-011 FR-80)
KRX_CLOSE_AVAILABLE = 7 * 3600
KRX_DAYS_PER_WEEK = 5


def krx_session(d: date) -> int:
    """거래일 d 의 as_of 시각 = d 00:00 UTC = 09:00 KST(장 시작). 그날 종가는 아직 모른다."""
    return int(datetime(d.year, d.month, d.day, tzinfo=UTC).timestamp())


@dataclass(frozen=True, slots=True)
class KrxSessions:
    """국내 주식 거래일 달력. `sessions` = 거래일마다 `krx_session` 값, 오름차순 · 중복 없음.

    라벨 h주 = 기준 거래일(as_of 에 종가를 아는 마지막 거래일)부터 **5h 거래일 뒤** 종가(FR-81).
    달력이 그 날까지 없으면(아직 안 왔거나 휴장 여부를 모르면) 라벨도 없다 — 추정하지 않는다.
    """

    sessions: NDArray[np.int64]
    days_per_week: int = KRX_DAYS_PER_WEEK
    max_gap: int | None = None
    _grid: frozenset[int] = field(default=frozenset(), init=False)

    def __post_init__(self) -> None:
        s = self.sessions
        if s.size and (np.any(np.diff(s) <= 0) or np.any(s % DAY != 0)):
            raise ValueError("거래일은 00:00 UTC 시각 오름차순이어야 한다")
        weeks = (s - _MONDAY_EPOCH) // WEEK
        first = np.ones(s.size, dtype=bool)
        first[1:] = weeks[1:] != weeks[:-1]
        object.__setattr__(self, "_grid", frozenset(int(t) for t in s[first]))

    @classmethod
    def from_dates(cls, dates: Iterable[date]) -> KrxSessions:
        return cls(np.asarray(sorted({krx_session(d) for d in dates}), dtype=np.int64))

    def grid(self, start: int, end: int) -> list[int]:
        """[start, end] 안의 **주 첫 거래일**(월요일 휴장이면 화요일)."""
        return sorted(t for t in self._grid if start <= t <= end)

    def on_grid(self, t: int) -> bool:
        return t in self._grid

    def _base(self, as_of: int) -> int:
        """as_of 에 종가를 아는 마지막 거래일 위치. 없으면 -1."""
        return int(np.searchsorted(self.sessions + KRX_CLOSE_AVAILABLE, as_of, side="right")) - 1

    def label_end(self, as_of: int, horizon_weeks: int) -> int | None:
        i = self._base(as_of)
        j = i + self.days_per_week * horizon_weeks
        if i < 0 or j >= self.sessions.size:
            return None
        return int(self.sessions[j]) + KRX_CLOSE_AVAILABLE

    def realized(self, series: CloseSeries, as_of: int, horizon_weeks: int) -> float | None:
        """코인과 같은 정의 — 기준 종가는 as_of 에 알던 것, 끝 종가는 기간 끝에 알던 것."""
        end = self.label_end(as_of, horizon_weeks)
        last = series.last_at()
        if end is None or last is None or last < end:
            return None
        base = series.close_at_or_before(as_of)
        final = series.close_at_or_before(end)
        if base is None or final is None:
            return None
        return float(np.log(final / base))

    def fresh(self, series: CloseSeries, as_of: int, slack: int = 0) -> bool:
        """직전 거래일 봉이 있어야 한다 — 거래정지 · 상장폐지 종목의 멈춘 가격으로 전망하지 않는다.

        slack 거래일만큼 늦어도 봐준다. 게이트 신선도는 slack=1(2 영업일, data-pipeline.md §4) — 서버 일봉 확정이
        하루 빠졌다고 전 종목을 끄지 않는다. 전망 자체는 slack=0(기준 종가가 직전 거래일 것이어야 한다).
        """
        i = self._base(as_of) - slack
        last = series.last_at()
        return i >= 0 and last is not None and last >= int(self.sessions[i]) + KRX_CLOSE_AVAILABLE

    def latest_session(self, now: int) -> int | None:
        """now 이전에 시작한 마지막 거래일 — 매일 작업의 as_of."""
        i = int(np.searchsorted(self.sessions, now, side="right")) - 1
        return int(self.sessions[i]) if i >= 0 else None
