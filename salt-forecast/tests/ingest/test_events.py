from datetime import UTC, date, datetime
from pathlib import Path

from salt_forecast.domain.events import scheduled
from salt_forecast.ingest.events import monthly_release_days, parse_fomc_calendar

FIXTURE = Path(__file__).parent / "fixtures" / "federalreserve" / "fomccalendars.html"


def test_fomc_decision_is_last_day_and_skips_notation_votes() -> None:
    days = parse_fomc_calendar(FIXTURE.read_text(encoding="utf-8"))
    assert days == [date(2024, 5, 1), date(2025, 1, 29), date(2025, 3, 19)]


def test_fomc_zero_when_structure_changes() -> None:
    assert parse_fomc_calendar("<html>새 디자인</html>") == []


def test_monthly_release_keeps_the_main_release_not_the_revision() -> None:
    days = [date(2021, 2, 8), date(2021, 2, 10), date(2021, 3, 10)]
    assert monthly_release_days(days) == [date(2021, 2, 10), date(2021, 3, 10)]


def test_release_time_follows_daylight_saving() -> None:
    winter = scheduled("cpi", date(2026, 1, 13), "fred", "release:10")
    summer = scheduled("cpi", date(2026, 7, 14), "fred", "release:10")
    assert winter.event_at == datetime(2026, 1, 13, 13, 30, tzinfo=UTC)
    assert summer.event_at == datetime(2026, 7, 14, 12, 30, tzinfo=UTC)
    fomc = scheduled("fomc", date(2026, 10, 28), "federalreserve", "x")
    assert fomc.event_at == datetime(2026, 10, 28, 18, 0, tzinfo=UTC)
    assert fomc.announced_at < fomc.event_at
