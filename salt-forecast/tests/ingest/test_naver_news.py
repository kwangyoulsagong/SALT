"""네이버 뉴스 검색 — 녹화 응답 모양(2026-11-16 실측 키), 네트워크 0."""

from datetime import UTC, datetime, timedelta

import httpx
import respx

from salt_forecast.ingest import naver_news
from salt_forecast.ingest.http import Pacer

URL = "https://naverapihub.apigw.ntruss.com/search/v1/news"
NOW = datetime(2026, 11, 17, 1, 0, tzinfo=UTC)


def _items(newest: datetime, n: int, step: timedelta) -> list[dict[str, str]]:
    return [
        {
            "title": f"<b>비트코인</b> 소식 {i} &quot;급등&quot;",
            "originallink": f"https://press.example/{newest.timestamp():.0f}/{i}",
            "link": f"https://n.news.naver.com/{i}",
            "description": "요약 <b>비트코인</b>",
            "pubDate": (newest - i * step).strftime("%a, %d %b %Y %H:%M:%S +0000"),
        }
        for i in range(n)
    ]


def _search(since: datetime | None) -> list[naver_news.NewsItem]:
    with httpx.Client() as c:
        return naver_news.search(c, URL, "id", "secret", Pacer(1000), "비트코인", NOW, since)


@respx.mock
def test_normal_run_reads_first_page_only_and_cleans() -> None:
    route = respx.get(URL).mock(
        return_value=httpx.Response(200, json={"items": _items(NOW, 100, timedelta(minutes=5))})
    )
    got = _search(None)
    assert route.call_count == 1
    assert len(got) == 100 and got[0].source == "naver:비트코인"
    assert got[0].title == '비트코인 소식 0 "급등"'  # 태그 · 엔티티 제거
    assert got[0].url.startswith("https://press.example/")  # 원문 링크 우선
    assert got[0].fetched_at == NOW and got[0].published_at <= NOW
    headers = route.calls.last.request.headers
    assert headers["X-NCP-APIGW-API-KEY-ID"] == "id"


@respx.mock
def test_gap_run_pages_until_older_than_since() -> None:
    pages = [
        httpx.Response(200, json={"items": _items(NOW - k * timedelta(hours=10), 100, timedelta(minutes=6))})
        for k in range(5)
    ]
    route = respx.get(URL).mock(side_effect=pages)
    got = _search(NOW - timedelta(hours=25))  # 쪽마다 10시간 — 셋째 쪽에서 since 보다 오래된 기사가 나온다
    assert route.call_count == 3
    assert route.calls.last.request.url.params["start"] == "201"  # 1 · 101 · 201
    assert len(got) == 300


@respx.mock
def test_gap_run_stops_on_short_page_and_caps_at_1100() -> None:
    respx.get(URL).mock(return_value=httpx.Response(200, json={"items": _items(NOW, 40, timedelta(minutes=1))}))
    assert len(_search(NOW - timedelta(days=30))) == 40  # 덜 찬 쪽 — 끝
    respx.reset()
    route = respx.get(URL).mock(
        return_value=httpx.Response(200, json={"items": _items(NOW, 100, timedelta(seconds=1))})
    )
    _search(NOW - timedelta(days=30))  # 늘 since 안쪽 — 상한
    assert route.call_count == len(naver_news.STARTS) == 11
    assert route.calls.last.request.url.params["start"] == "1000"


@respx.mock
def test_auth_error_does_not_leak_key() -> None:
    respx.get(URL).mock(return_value=httpx.Response(401, json={"error": "x"}))
    with httpx.Client() as c:
        try:
            naver_news.search(c, URL, "id", "SECRET123", Pacer(1000), "비트코인", NOW, None)
            raise AssertionError("expected SourceError")
        except naver_news.SourceError as e:
            assert "SECRET123" not in str(e) and "401" in str(e)
