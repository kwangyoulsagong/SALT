"""Deribit DVOL(30일 만기 내재 변동성 지수, BTC · ETH) — 공개 API. 키 없음 · 조회만(FC-REQ-014).

`public/get_volatility_index_data` 1D 봉 [시작 ms, open, high, low, close]. 값은 연율 %.
봉 시각은 **시작**이다 — close 는 봉이 닫힌 뒤(시작 + 1일)에야 안다. 그래서 observed_at = 시작,
available_at = 시작 + 1일(time-and-leakage.md §1). 아직 닫히지 않은 오늘 봉은 버린다.

한 번에 돌려주는 봉 수에 상한이 있어서 구간을 `CHUNK_DAYS` 로 나눠 부른다.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import httpx
from pydantic import BaseModel

from salt_forecast.ingest.http import Pacer, SourceError, get_json
from salt_forecast.store.series import SeriesPoint

SOURCE = "deribit"
CURRENCIES = ("BTC", "ETH")
BAR = timedelta(days=1)
CHUNK_DAYS = 500
# 원천 이력 시작(2021-03-24) 앞 — 여기서부터 부르면 전체 이력이다
HISTORY_START = datetime(2021, 3, 1, tzinfo=UTC)


def series_id(currency: str) -> str:
    return f"dvol:{currency}"


class _Result(BaseModel):
    data: list[tuple[int, float, float, float, float]]


class _Body(BaseModel):
    result: _Result


def dvol(
    client: httpx.Client, base_url: str, pacer: Pacer, currency: str, since: datetime, now: datetime
) -> Iterator[SeriesPoint]:
    """[since, now) 에 시작한 1D 봉 중 닫힌 것의 close. 값이 0 이하이면 원천 오류 — 버린다."""
    url = f"{base_url.rstrip('/')}/public/get_volatility_index_data"
    start = since
    while start < now:
        end = min(start + timedelta(days=CHUNK_DAYS), now)
        params: dict[str, str | int] = {
            "currency": currency,
            "resolution": "1D",
            "start_timestamp": int(start.timestamp() * 1000),
            "end_timestamp": int(end.timestamp() * 1000),
        }
        body = get_json(client, url, params, pacer, label=f"dvol:{currency}")
        try:
            rows = _Body.model_validate(body).result.data
        except ValueError as e:
            raise SourceError("deribit 응답 모양이 다르다", retryable=False) from e
        for ms, _o, _h, _l, close in rows:
            observed = datetime.fromtimestamp(ms / 1000, tz=UTC)
            available = observed + BAR
            if close > 0 and start <= observed < end and available <= now:
                yield SeriesPoint(SOURCE, series_id(currency), observed, available, float(close), "pct_annual")
        start = end
