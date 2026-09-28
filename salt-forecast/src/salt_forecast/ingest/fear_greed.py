"""공포탐욕 지수(크립토) 전체 이력 — alternative.me 공개 API. 키 없음 · 조회만.

지수는 매일 00:00 UTC 에 그날 값으로 갱신된다. 게시 시각이 응답에 없어서 available_at 은 보수적으로
관측 + 1시간이다(time-and-leakage.md §1). 서버 코치가 쓰는 값과 같은 원천이다(`FearGreedPort`).
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import httpx
from pydantic import BaseModel

from salt_forecast.ingest.http import Pacer, SourceError, get_json
from salt_forecast.store.series import SeriesPoint

SOURCE = "alternative_me"
SERIES = "fear_greed"
LAG = timedelta(hours=1)


class _Point(BaseModel):
    value: int
    timestamp: int


class _Body(BaseModel):
    data: list[_Point]


def history(client: httpx.Client, base_url: str, pacer: Pacer, now: datetime) -> Iterator[SeriesPoint]:
    """`limit=0` 이 전체 이력이다(2018-02~). 한 번 호출."""
    body = get_json(client, f"{base_url.rstrip('/')}/fng/", {"limit": 0, "format": "json"}, pacer, label="fng")
    try:
        rows = _Body.model_validate(body).data
    except ValueError as e:
        raise SourceError("fng 응답 모양이 다르다", retryable=False) from e
    for p in rows:
        if not 0 <= p.value <= 100:
            continue  # 범위 밖은 원천 오류 — 버린다(0 은 유효한 극단 공포다)
        observed = datetime.fromtimestamp(p.timestamp, tz=UTC)
        available = observed + LAG
        if available <= now:
            yield SeriesPoint(SOURCE, SERIES, observed, available, float(p.value), "index")
