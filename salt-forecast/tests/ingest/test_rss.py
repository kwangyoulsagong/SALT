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
