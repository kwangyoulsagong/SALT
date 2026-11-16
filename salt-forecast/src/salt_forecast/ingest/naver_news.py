"""네이버 뉴스 검색 — NAVER API HUB(FC-REQ-016, 2026-11-16). 데이터랩과 같은 HUB 앱 키.

국내 언론을 Google 뉴스 검색보다 넓게 모은다. 날짜 지정이 없고 최신순으로 100건씩 최대 1,100건(start ≤ 1000)까지만
거슬러 간다 — '비트코인' 은 약 3일 · '업비트' 약 10일(2026-11-16 실측). 그래서 Google 날짜 검색의 **보조**다.

- 평소(매시): 검색어마다 첫 쪽 100건만
- 잠든 뒤: 마지막 성공 시각보다 오래된 기사가 나올 때까지 쪽을 넘긴다(최대 11쪽)

source = `naver:<검색어>` — 등록 `news-sentiment@1` 원천(RSS 13개)이 아니다.
시각 규칙은 RSS 와 같다(published = pubDate, available = 받은 시각).
제목 · 요약만(본문 0), 링크는 언론사 원문(originallink) 우선.
"""

from __future__ import annotations

from datetime import datetime

import httpx
from pydantic import BaseModel

from salt_forecast.domain.news_text import SUMMARY_MAX, detect_lang, item_id, title_key
from salt_forecast.ingest.http import TIMEOUT, Pacer, SourceError
from salt_forecast.ingest.rss import NewsItem, _clean, _published  # pyright: ignore[reportPrivateUsage]

# 데이터랩과 같은 HUB 앱 키 — openapi.naver.com 은 이 키로 401(2026-11-16 확인)
URL = "https://naverapihub.apigw.ntruss.com/search/v1/news"
PAGE = 100
# start 는 1000 까지 — 1 · 101 … 901 · 1000 (마지막 쪽은 앞 쪽과 1건 겹친다)
STARTS = (*range(1, 1000, PAGE), 1000)


class _Item(BaseModel):
    title: str
    originallink: str = ""
    link: str = ""
    description: str = ""
    pubDate: str = ""


class _Body(BaseModel):
    items: list[_Item]


def parse(body: _Body, source: str, fetched_at: datetime) -> list[NewsItem]:
    out: list[NewsItem] = []
    for it in body.items:
        title = _clean(it.title)
        url = it.originallink or it.link
        if not title or not url.startswith(("http://", "https://")):
            continue
        out.append(
            NewsItem(
                item_id=item_id(url),
                source=source,
                lang=detect_lang(title),
                title=title,
                summary=_clean(it.description)[:SUMMARY_MAX] or None,
                url=url,
                title_key=title_key(title),
                published_at=_published(it.pubDate, fetched_at),
                fetched_at=fetched_at,
            )
        )
    return out


def _page(client: httpx.Client, url: str, headers: dict[str, str], pacer: Pacer, query: str, start: int) -> _Body:
    params: dict[str, str | int] = {"query": query, "display": PAGE, "start": start, "sort": "date"}
    for attempt in range(2):
        pacer.wait()
        try:
            res = client.get(url, params=params, headers=headers, timeout=TIMEOUT)
        except httpx.TransportError as e:
            if attempt == 1:
                raise SourceError(f"naver news 연결 실패: {type(e).__name__}", retryable=True) from e
            continue
        if res.status_code == 200:
            try:
                return _Body.model_validate(res.json())
            except ValueError as e:
                raise SourceError("naver news 응답 모양이 다르다", retryable=False) from e
        if res.status_code != 429 and res.status_code < 500:
            raise SourceError(f"naver news {res.status_code}", retryable=False)  # 키 · 본문은 싣지 않는다
        if attempt == 1:
            raise SourceError(f"naver news {res.status_code} 재시도 소진", retryable=True)
    raise AssertionError("unreachable")


def search(
    client: httpx.Client,
    url: str,
    client_id: str,
    client_secret: str,
    pacer: Pacer,
    query: str,
    fetched_at: datetime,
    since: datetime | None,
) -> list[NewsItem]:
    """since 가 없으면 첫 쪽만. 있으면 since 보다 오래된 기사가 나오거나 쪽이 덜 차거나 1,100건이 될 때까지."""
    headers = {"X-NCP-APIGW-API-KEY-ID": client_id, "X-NCP-APIGW-API-KEY": client_secret}
    source = f"naver:{query}"
    out: list[NewsItem] = []
    for start in STARTS if since is not None else STARTS[:1]:
        body = _page(client, url, headers, pacer, query, start)
        items = parse(body, source, fetched_at)
        out.extend(items)
        if since is None or len(body.items) < PAGE or not items:
            break
        if min(i.published_at for i in items) < since:
            break
    return out
