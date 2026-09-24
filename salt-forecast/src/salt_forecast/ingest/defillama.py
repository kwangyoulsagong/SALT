"""DefiLlama 스테이블코인 총 발행량(USD) — 키 없음. 일 단위, available_at = 그날 + 1일(보수적)."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import httpx

from salt_forecast.ingest.http import Pacer, get_json
from salt_forecast.store.series import SeriesPoint

SOURCE = "defillama"
SERIES = "stablecoins_total_usd"


def stablecoin_total(client: httpx.Client, base_url: str, pacer: Pacer, now: datetime) -> Iterator[SeriesPoint]:
    rows = get_json(client, f"{base_url.rstrip('/')}/stablecoincharts/all", {}, pacer, label="stablecoincharts")
    for r in rows:
        observed = datetime.fromtimestamp(int(r["date"]), tz=UTC)
        available = observed + timedelta(days=1)
        value = r.get("totalCirculatingUSD", {}).get("peggedUSD")
        if value is None or available > now:
            continue
        yield SeriesPoint(SOURCE, SERIES, observed, available, float(value), "USD")
