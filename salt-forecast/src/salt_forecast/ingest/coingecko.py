"""CoinGecko `/api/v3/global` — BTC · ETH 도미넌스 · 전체 시가총액. 키 없음 · 조회만(FC-REQ-015).

**지금 값만** 주는 원천이다(이력 `/global/market_cap_chart` 는 유료). 그래서 매일 한 번 받아 쌓고,
사전등록 dominance@1 이 정한 날(2027-05-17)에 한 번 본다. observed_at = 원천 갱신 시각 `updated_at`,
available_at = 실제로 받은 시각 — `--as-of` 로 과거 시각을 적지 않는다(market_event 스냅샷과 같다).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import httpx
from pydantic import BaseModel

from salt_forecast.ingest.http import Pacer, SourceError, get_json
from salt_forecast.store.series import SeriesPoint

SOURCE = "coingecko"
DOMINANCE_BTC = "cg:dominance:btc"
DOMINANCE_ETH = "cg:dominance:eth"
TOTAL_MCAP_USD = "cg:total_mcap:usd"
# 갱신 시각이 받은 시각보다 이만큼 넘게 오래됐으면 원천이 멈춘 것 — 쌓지 않는다
MAX_STALE = timedelta(hours=6)


class _Data(BaseModel):
    market_cap_percentage: dict[str, float]
    total_market_cap: dict[str, float]
    updated_at: int


class _Body(BaseModel):
    data: _Data


def global_snapshot(client: httpx.Client, base_url: str, pacer: Pacer, fetched_at: datetime) -> list[SeriesPoint]:
    body = get_json(client, f"{base_url.rstrip('/')}/global", {}, pacer, label="coingecko:global")
    try:
        d = _Body.model_validate(body).data
    except ValueError as e:
        raise SourceError("coingecko 응답 모양이 다르다", retryable=False) from e
    observed = datetime.fromtimestamp(d.updated_at, tz=UTC)
    if observed > fetched_at or fetched_at - observed > MAX_STALE:
        raise SourceError(f"coingecko 갱신 시각이 이상하다: {observed.isoformat()}", retryable=False)
    btc = d.market_cap_percentage.get("btc")
    eth = d.market_cap_percentage.get("eth")
    total = d.total_market_cap.get("usd")
    if btc is None or eth is None or total is None or not (0 < btc < 100 and 0 < eth < 100 and total > 0):
        raise SourceError("coingecko 도미넌스 · 시가총액 값이 없거나 범위 밖", retryable=False)
    return [
        SeriesPoint(SOURCE, DOMINANCE_BTC, observed, fetched_at, btc, "pct"),
        SeriesPoint(SOURCE, DOMINANCE_ETH, observed, fetched_at, eth, "pct"),
        SeriesPoint(SOURCE, TOTAL_MCAP_USD, observed, fetched_at, total, "usd"),
    ]
