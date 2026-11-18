"""소비자물가 — 그 달을 알게 된 시각(FC-REQ-024 FR-6 · 수용 기준 3 누수)."""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from salt_forecast.domain.price_index import available_at, month_observed

KST = ZoneInfo("Asia/Seoul")
RELEASES = [
    datetime(2026, 9, 2, 8, tzinfo=KST),  # 8월분
    datetime(2026, 10, 2, 8, tzinfo=KST),  # 9월분
    datetime(2026, 11, 4, 8, tzinfo=KST),  # 10월분
]


def test_release_after_month_end_is_that_months_release() -> None:
    assert available_at(date(2026, 10, 1), RELEASES) == datetime(2026, 11, 4, 8, tzinfo=KST)
    assert available_at(date(2026, 9, 1), RELEASES) == datetime(2026, 10, 2, 8, tzinfo=KST)


def test_no_release_falls_back_to_15th_of_next_month() -> None:
    assert available_at(date(2026, 11, 1), RELEASES) == datetime(2026, 12, 15, tzinfo=KST)
    assert available_at(date(2015, 3, 1), RELEASES) == datetime(2015, 4, 15, tzinfo=KST)
    assert available_at(date(2026, 12, 1), []) == datetime(2027, 1, 15, tzinfo=KST)


def test_never_before_month_ends() -> None:
    """어떤 보도 표든 그 달이 끝나기 전 시각을 주지 않는다 — 같은 달 안의 보도는 지난달 것이다."""
    same_month = [datetime(2026, 10, 2, 8, tzinfo=KST)]
    for m in range(1, 13):
        month = date(2026, m, 1)
        nxt = date(2026 + m // 12, m % 12 + 1, 1)
        assert available_at(month, same_month) >= datetime(nxt.year, nxt.month, nxt.day, tzinfo=KST)


def test_late_release_beyond_window_is_not_used() -> None:
    """다음 달 20일이 넘어서 온 보도는 그 달 것이 아니다(다음 달 것) — 보수 15일로."""
    assert available_at(date(2026, 10, 1), [datetime(2026, 11, 25, 8, tzinfo=KST)]) == datetime(
        2026, 11, 15, tzinfo=KST
    )


def test_observed_is_month_start_kst() -> None:
    assert month_observed(date(2026, 10, 17)) == datetime(2026, 10, 1, tzinfo=KST)
