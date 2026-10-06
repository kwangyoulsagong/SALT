"""네이버 데이터랩 검색어트렌드 — 종목 한글명 검색 관심(FC-REQ-017 · search-interest@1).

NAVER API HUB `POST /search-trend/v1/search`(네이버 클라우드). 개발자센터 `openapi.naver.com/v1/datalab/search` 는
2026-07-31 부터 신규 키를 안 낸다 — 본문 · 응답 모양은 같고 호스트 · 헤더만 다르다.
이관기 무료 · 월 5만 회 · 키 필요(`FORECAST_NAVER_CLIENT_ID` · `_SECRET` = HUB 앱 Client ID/Secret).
값은 요청 구간 최댓값 = 100 인 **상대 지수**다(`domain/search_interest.py`).
키워드 하나 = 요청 하나 — 여러 묶음을 한 요청에 넣으면 가장 큰 묶음에
맞춰 작은 종목이 0 근처로 눌린다.

두 개의 시각: observed_at = 그날 00:00 KST, available_at = observed_at + 48시간(그날 하루치가 다음 날 집계된다고 보고
보수적으로 하루 더). 원천에 공개 시각이 없어 추정 상한이다(`data-pipeline.md` §4 표에 적었다).
"""

from __future__ import annotations

from datetime import date

import httpx
from pydantic import BaseModel

from salt_forecast.domain.search_interest import AVAILABLE_LAG, KST, SOURCE, observed_at, series_id
from salt_forecast.ingest.http import TIMEOUT, Pacer, SourceError

__all__ = ["AVAILABLE_LAG", "FIRST_DAY", "KST", "SOURCE", "UNIT", "observed_at", "search_daily", "series_id"]

UNIT = "index"
FIRST_DAY = date(2016, 1, 1)  # 데이터랩 검색어트렌드 시작


class _Point(BaseModel):
    period: date
    ratio: float


class _Result(BaseModel):
    title: str
    data: list[_Point]


class _Body(BaseModel):
    results: list[_Result]


def search_daily(
    client: httpx.Client,
    url: str,
    client_id: str,
    client_secret: str,
    pacer: Pacer,
    keyword: str,
    start: date,
    end: date,
) -> dict[date, float]:
    """키워드 하나의 일별 지수. 오류 메시지 · 로그에 키를 싣지 않는다. 재시도는 429 · 5xx · 연결만 2회."""
    body = {
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "timeUnit": "date",
        "keywordGroups": [{"groupName": keyword, "keywords": [keyword]}],
    }
    headers = {"X-NCP-APIGW-API-KEY-ID": client_id, "X-NCP-APIGW-API-KEY": client_secret}
    for attempt in range(3):
        pacer.wait()
        try:
            res = client.post(url, json=body, headers=headers, timeout=TIMEOUT)
        except httpx.TransportError as e:
            if attempt == 2:
                raise SourceError(f"datalab 연결 실패: {type(e).__name__}", retryable=True) from e
            continue
        if res.status_code == 200:
            try:
                parsed = _Body.model_validate(res.json())
            except ValueError as e:
                raise SourceError("datalab 응답 모양이 다르다", retryable=False) from e
            if len(parsed.results) != 1:
                raise SourceError(f"datalab 결과 묶음 {len(parsed.results)}개", retryable=False)
            out = {p.period: p.ratio for p in parsed.results[0].data if start <= p.period <= end}
            if any(not (0 <= v <= 100) for v in out.values()):
                raise SourceError("datalab 지수가 0~100 밖", retryable=False)
            return out
        if res.status_code != 429 and res.status_code < 500:
            raise SourceError(f"datalab {res.status_code}", retryable=False)
        if attempt == 2:
            raise SourceError(f"datalab {res.status_code} 재시도 소진", retryable=True)
    raise AssertionError("unreachable")
