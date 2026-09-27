"""주 격자 판정 — 라이브 게이트 표본은 월요일 00:00 UTC 위의 as_of 만 센다(FC-REQ-001 FR-11)."""

from salt_forecast.domain.calendar import floor_day, on_weekly_grid, weekly_grid
from salt_forecast.domain.series import DAY, WEEK

MONDAY_2026_01_05 = 1_767_571_200  # 2026-01-05 00:00 UTC (월)


def test_on_weekly_grid_matches_weekly_grid() -> None:
    """weekly_grid 가 내는 점은 전부 격자 위, 그 사이의 날은 전부 격자 밖."""
    start, end = MONDAY_2026_01_05 - 3 * DAY, MONDAY_2026_01_05 + 10 * WEEK
    grid = set(weekly_grid(start, end))
    assert grid
    for t in range(floor_day(start), end + 1, DAY):
        assert on_weekly_grid(t) == (t in grid)


def test_on_weekly_grid_rejects_midweek_and_intraday() -> None:
    assert on_weekly_grid(MONDAY_2026_01_05)
    assert not on_weekly_grid(MONDAY_2026_01_05 + DAY)  # 화요일
    assert not on_weekly_grid(MONDAY_2026_01_05 + 3600)  # 월요일 01:00
    assert on_weekly_grid(MONDAY_2026_01_05 + 52 * WEEK)


def test_weekly_grid_is_noop_for_weekly_points() -> None:
    """백테스트 행은 이미 주 격자 — 같은 필터를 걸어도 하나도 빠지지 않는다."""
    points = weekly_grid(MONDAY_2026_01_05, MONDAY_2026_01_05 + 60 * WEEK)
    assert [t for t in points if on_weekly_grid(t)] == points
