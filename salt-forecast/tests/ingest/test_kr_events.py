from datetime import UTC, date, datetime
from pathlib import Path

from salt_forecast.ingest.kr_events import (
    CpiRelease,
    merge_cpi,
    parse_bok_year,
    parse_mods_board,
    parse_mods_plan,
    plausible,
)

FIX = Path(__file__).parent / "fixtures"


def test_bok_year_page_gives_eight_meetings() -> None:
    year, days = parse_bok_year((FIX / "bok" / "listYear_2024.html").read_text(encoding="utf-8"))
    assert year == 2024
    assert days == [
        date(2024, 1, 11),
        date(2024, 2, 22),
        date(2024, 4, 12),
        date(2024, 5, 23),
        date(2024, 7, 11),
        date(2024, 8, 22),
        date(2024, 10, 11),
        date(2024, 11, 28),
    ]


def test_bok_next_year_before_publication_is_empty_not_error() -> None:
    year, days = parse_bok_year((FIX / "bok" / "listYear_2027.html").read_text(encoding="utf-8"))
    assert year == 2027 and days == []


def test_bok_structure_change_gives_no_year() -> None:
    assert parse_bok_year("<html>새 디자인</html>") == (None, [])


def test_plan_has_every_cpi_release_of_the_year_including_december_and_annual() -> None:
    plan = parse_mods_plan((FIX / "mods" / "newsPln_all.html").read_text(encoding="utf-8"))
    assert len(plan) == 12
    assert plan[0] == CpiRelease(2026, 1, date(2026, 2, 3))
    assert plan[-1] == CpiRelease(2026, 12, date(2026, 12, 31))


def test_board_post_dates_and_edited_row_is_rejected() -> None:
    board = parse_mods_board((FIX / "mods" / "board_cpi_p2.html").read_text(encoding="utf-8"))
    edited = CpiRelease(2026, 1, date(2026, 3, 6))  # 게시일이 수정일로 바뀐 행 — 실제 보도 02-03
    assert edited in board and not plausible(edited)
    assert plausible(CpiRelease(2025, 12, date(2025, 12, 31)))
    merged, rejected = merge_cpi([CpiRelease(2026, 1, date(2026, 2, 3))], board)
    assert rejected == 1
    assert CpiRelease(2026, 1, date(2026, 2, 3)) in merged and edited not in merged
    assert datetime(2026, 1, 1, tzinfo=UTC)  # 픽스처는 2026-11-02 수집
