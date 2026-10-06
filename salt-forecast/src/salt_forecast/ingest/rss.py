"""뉴스 RSS — 서버 크롤러와 같은 피드(F010 슬라이스 6 3차 · FC-REQ-016).

서버 `news` 크롤러는 서버가 떠 있을 때만 돈다(로컬 서버는 2026-09-29 뒤로 꺼져 있었다 — 뉴스 테이블이 그날 멈췄다).
라이브 사전등록(news-sentiment@1)은 빈 주가 생기면 안 되므로 이 작업이 **직접** 받는다. 같은 피드를 쓰지만
서버 테이블(`public.news_articles`)과 섞지 않는다 — 시각 규칙이 다르다(아래).

## 두 개의 시각

- `published_at` = RSS `pubDate`(원천 게시 시각, observed_at). 없거나 받은 시각보다 미래면 받은 시각.
- `fetched_at` = 우리가 받은 시각(available_at). 첫 수집 때 며칠 묵은 기사가 섞여 오므로 둘은 다르다 —
  채점은 `fetched_at` 으로 자른다. 같은 기사를 다시 받아도 처음 행이 남는다(DO NOTHING).

본문은 받지 않는다 — 제목 · RSS 요약만(피처 전용, 화면 표시 없음).
"""

from __future__ import annotations

import html
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from urllib.parse import quote

import httpx

from salt_forecast.domain.news_text import SUMMARY_MAX, detect_lang, item_id, title_key
from salt_forecast.ingest.http import TIMEOUT, Pacer, SourceError

# 서버 KoreanNewsFeed 와 같은 검색어 — 피드 구성이 같아야 두 원장이 같은 세상을 본다
GOOGLE_KO_QUERIES = tuple(
    ["가상화폐", "암호화폐", "코인", "비트코인", "이더리움", "알트코인", "블록체인", "거래소", "업비트", "빗썸"]
)
EN_FEEDS = {
    "coindesk": "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "cointelegraph": "https://cointelegraph.com/rss",
    "cryptoslate": "https://cryptoslate.com/feed/",
}
# 피드 하나에서 받는 최대 기사 수 — 서버와 같은 30
PER_FEED = 30
MAX_BYTES = 2_000_000
_TAG = re.compile(r"<[^>]+>")


def google_news_url(query: str) -> str:
    return f"https://news.google.com/rss/search?q={quote(query)}&hl=ko&gl=KR&ceid=KR:ko"


def feeds() -> list[tuple[str, str]]:
    """(source, url). source 이름은 news_item.source 에 그대로 간다."""
    return [(f"rss:google:{q}", google_news_url(q)) for q in GOOGLE_KO_QUERIES] + [
        (f"rss:{name}", url) for name, url in EN_FEEDS.items()
    ]


@dataclass(frozen=True, slots=True)
class NewsItem:
    item_id: str
    source: str
    lang: str
    title: str
    summary: str | None
    url: str
    title_key: str
    published_at: datetime
    fetched_at: datetime


def _text(el: ET.Element | None) -> str:
    return "" if el is None or el.text is None else el.text.strip()


def _clean(raw: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(_TAG.sub(" ", raw))).strip()


def _published(raw: str, fetched_at: datetime) -> datetime:
    try:
        d = parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        return fetched_at
    d = d.astimezone(UTC) if d.tzinfo else d.replace(tzinfo=UTC)
    return min(d, fetched_at)  # 미래 게시 시각은 믿지 않는다


def parse_feed(body: bytes, source: str, fetched_at: datetime) -> list[NewsItem]:
    """RSS 2.0 `channel/item`. 제목이나 링크가 없는 항목은 건너뛴다. 모양이 아예 다르면 SourceError."""
    if len(body) > MAX_BYTES:
        raise SourceError(f"{source} 응답이 너무 크다({len(body)}B)", retryable=False)
    try:
        root = ET.fromstring(body)
    except ET.ParseError as e:
        raise SourceError(f"{source} XML 파싱 실패", retryable=False) from e
    channel = root.find("channel")
    if channel is None:
        raise SourceError(f"{source} RSS channel 없음", retryable=False)
    out: list[NewsItem] = []
    for el in channel.findall("item")[:PER_FEED]:
        title = _clean(_text(el.find("title")))
        url = _text(el.find("link"))
        if not title or not url.startswith(("http://", "https://")):
            continue
        summary = _clean(_text(el.find("description")))[:SUMMARY_MAX] or None
        out.append(
            NewsItem(
                item_id=item_id(url),
                source=source,
                lang=detect_lang(title),
                title=title,
                summary=summary,
                url=url,
                title_key=title_key(title),
                published_at=_published(_text(el.find("pubDate")), fetched_at),
                fetched_at=fetched_at,
            )
        )
    return out


def fetch_feed(client: httpx.Client, source: str, url: str, pacer: Pacer, fetched_at: datetime) -> list[NewsItem]:
    """피드 하나. 재시도는 연결 오류 · 429 · 5xx 한 번만 — 매시 다시 돈다."""
    for attempt in range(2):
        pacer.wait()
        try:
            res = client.get(url, timeout=TIMEOUT, follow_redirects=True)
        except httpx.TransportError as e:
            if attempt == 1:
                raise SourceError(f"{source} 연결 실패: {type(e).__name__}", retryable=True) from e
            continue
        if res.status_code == 200:
            return parse_feed(res.content, source, fetched_at)
        if res.status_code != 429 and res.status_code < 500:
            raise SourceError(f"{source} {res.status_code}", retryable=False)
        if attempt == 1:
            raise SourceError(f"{source} {res.status_code} 재시도 소진", retryable=True)
    raise AssertionError("unreachable")
