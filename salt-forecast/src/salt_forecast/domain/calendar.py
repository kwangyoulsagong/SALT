"""as_of 격자. 코인은 24/7 이라 주 = 7일. 업비트 일봉은 00:00 UTC 에 닫힌다."""

from __future__ import annotations

from salt_forecast.domain.series import DAY, WEEK

# 1970-01-05 (월) 00:00 UTC — 주 격자 기준점
_MONDAY_EPOCH = 4 * DAY


def floor_day(t: int) -> int:
    return t - t % DAY


def weekly_grid(start: int, end: int) -> list[int]:
    """[start, end] 안의 월요일 00:00 UTC."""
    first = start + (-(start - _MONDAY_EPOCH)) % WEEK
    return list(range(first, end + 1, WEEK))
