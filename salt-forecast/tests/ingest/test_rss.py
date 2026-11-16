"""RSS 파싱(FC-REQ-016) — 녹화 픽스처, 네트워크 0."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pytest

from salt_forecast.ingest.http import SourceError
from salt_forecast.ingest.rss import feeds, parse_feed

FIX = Path(__file__).parent / "fixtures" / "rss"
NOW = datetime(2026, 10, 6, 4, 0, tzinfo=UTC)


def test_parse_keeps_valid_items_with_two_times() -> None:
    items = parse_feed((FIX / "google.xml").read_bytes(), "rss:google:코인", NOW)
    assert [i.title for i in items] == ["비트코인 8만 달러 회복 - 매일경제", "미래 기사"]
    first = items[0]
    assert first.published_at == datetime(2026, 10, 6, 3, 10, tzinfo=UTC)
    assert first.fetched_at == NOW
    assert first.lang == "ko"
    assert first.summary == "비트코인 8만 달러 회복 매일경제"  # 태그 · 엔티티 제거


def test_future_pubdate_is_clamped_to_fetch_time() -> None:
    items = parse_feed((FIX / "google.xml").read_bytes(), "s", NOW)
    assert items[1].published_at == NOW


def test_bad_xml_is_a_source_error() -> None:
    with pytest.raises(SourceError):
        parse_feed(b"<html>blocked</html>", "s", NOW)
    with pytest.raises(SourceError):
        parse_feed(b"not xml", "s", NOW)


def test_feed_list_matches_server_queries() -> None:
    names = [s for s, _ in feeds()]
    assert len(names) == 13 and len(set(names)) == 13
    assert "rss:google:비트코인" in names and "rss:coindesk" in names


def test_gap_days_boundary_table() -> None:
    """잠든 동안 빈 날 — 매시 한 번 빠진 정도는 메우지 않고, 길게 잠들면 앞뒤 하루씩 겹쳐 다시 검색한다."""
    from datetime import UTC, date, datetime, timedelta

    from salt_forecast.ingest.rss import GAP_CAP_DAYS, gap_days

    now = datetime(2026, 11, 17, 1, 0, tzinfo=UTC)
    assert gap_days(None, now) == []  # 첫 수집 — 과거 백필은 이 작업 몫이 아니다
    assert gap_days(now - timedelta(minutes=70), now) == []  # 한 번 빠짐 — 30건 안
    assert gap_days(now - timedelta(hours=15), now) == [date(2026, 11, 15), date(2026, 11, 16), date(2026, 11, 17)]
    weekend = gap_days(datetime(2026, 11, 13, 9, tzinfo=UTC), datetime(2026, 11, 16, 0, 30, tzinfo=UTC))
    assert weekend[0] == date(2026, 11, 12) and weekend[-1] == date(2026, 11, 16)  # 금 밤 ~ 월 아침
    long = gap_days(now - timedelta(days=40), now)
    assert len(long) == GAP_CAP_DAYS + 1 and long[-1] == now.date()


def test_gap_feeds_use_same_source_names_with_date_range() -> None:
    from datetime import date
    from urllib.parse import unquote

    from salt_forecast.ingest.rss import GOOGLE_KO_QUERIES, gap_feeds

    got = gap_feeds([date(2026, 11, 10)])
    assert [s for s, _ in got] == [f"rss:google:{q}" for q in GOOGLE_KO_QUERIES]
    assert "비트코인 after:2026-11-10 before:2026-11-11" in unquote(got[3][1])
