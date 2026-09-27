"""유럽중앙은행(ECB) 기준 환율 — Frankfurter 공개 API 로 받는다. 키 없음 · 조회만 (FC-REQ-007 FR-1).

김치 프리미엄 분모의 원/달러. FRED `DEXKOUS` 는 주 1회 공표라 최대 9일 늦어(2026-09-27 실측) 0 교차를 못 잡는다.
ECB 는 영업일 16:00 CET 에 공표한다 — available_at 은 **다음 날 00:00 UTC**(보수 추정). 그래도 그날 업비트 일봉
(마감 00:00 UTC)에는 쓸 수 있다.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta

import httpx
from pydantic import BaseModel

from salt_forecast.ingest.http import Pacer, get_json
from salt_forecast.store.series import SeriesPoint

SOURCE = "ecb"
SERIES = "USDKRW"
PUBLISH_LAG = timedelta(days=1)


class _Rates(BaseModel):
    rates: dict[str, dict[str, float]]


def usd_krw(client: httpx.Client, base_url: str, pacer: Pacer, since: date, now: datetime) -> Iterator[SeriesPoint]:
    """영업일마다 1점. 주말 · 휴일은 점이 없다(앞 값을 쓰는 건 피처 층의 몫)."""
    if since > now.date():
        return
    raw = get_json(
        client,
        f"{base_url.rstrip('/')}/{since.isoformat()}..{now.date().isoformat()}",
        {"base": "USD", "symbols": "KRW"},
        pacer,
        label="frankfurter",
    )
    for day, quote in _Rates.model_validate(raw).rates.items():
        observed = datetime.combine(date.fromisoformat(day), datetime.min.time(), tzinfo=UTC)
        available = observed + PUBLISH_LAG
        value = quote.get("KRW")
        if value is None or available > now:
            continue
        yield SeriesPoint(SOURCE, SERIES, observed, available, float(value), "KRW")
