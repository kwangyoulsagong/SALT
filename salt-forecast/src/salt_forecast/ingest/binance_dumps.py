"""바이낸스 공개 덤프(data.binance.vision) — 현물 aggTrades 일 파일 → 대형 체결 하루 합(FC-REQ-008 FR-3).

키 없음 · 조회만. 파일이 크다(대형 종목 하루 1~150MB 압축) — **받아서 집계하고 원문은 버린다.** 디스크에 남기지 않는다.
파일마다 `.CHECKSUM`(sha256)을 대조한다 — 잘린 다운로드를 집계하면 조용히 작은 값이 들어간다.

열(헤더 없음, 최근 파일은 헤더가 붙기도 한다):
agg_id, price, qty, first_id, last_id, time, is_buyer_maker, is_best_match
"""

from __future__ import annotations

import hashlib
import io
import zipfile
from datetime import UTC, date, datetime, timedelta

import httpx
import numpy as np
import polars as pl

from salt_forecast.domain.flow import DailyFlow, large_trade_flow
from salt_forecast.ingest.http import SourceError
from salt_forecast.store.series import SeriesPoint

SOURCE = "binance_vision"
TIMEOUT = httpx.Timeout(120.0, connect=10.0)
_SCHEMA = {
    "agg_id": pl.Int64,
    "price": pl.Float64,
    "qty": pl.Float64,
    "first_id": pl.Int64,
    "last_id": pl.Int64,
    "time": pl.Int64,
    "is_buyer_maker": pl.Utf8,
    "is_best_match": pl.Utf8,
}


def _get(client: httpx.Client, url: str) -> bytes | None:
    """404 는 None(그날 상장 전 · 거래 중단). 그 외 실패는 3회 재시도 뒤 SourceError."""
    for attempt in range(3):
        try:
            res = client.get(url, timeout=TIMEOUT)
        except httpx.TransportError as e:
            if attempt == 2:
                raise SourceError(f"dump 연결 실패: {type(e).__name__}", retryable=True) from e
            continue
        if res.status_code == 404:
            return None
        if res.status_code == 200:
            return res.content
        if res.status_code < 500 and res.status_code != 429:
            raise SourceError(f"dump {res.status_code}", retryable=False)
    raise SourceError("dump 재시도 소진", retryable=True)


def parse_flow(csv: bytes) -> DailyFlow:
    has_header = not csv[:1].isdigit()
    df = pl.read_csv(io.BytesIO(csv), has_header=False, skip_rows=1 if has_header else 0, schema=_SCHEMA)
    maker = df["is_buyer_maker"].str.to_lowercase() == "true"
    return large_trade_flow(
        df["price"].to_numpy().astype(np.float64),
        df["qty"].to_numpy().astype(np.float64),
        maker.to_numpy().astype(np.bool_),
    )


def daily_flow(client: httpx.Client, base_url: str, pair: str, day: date) -> DailyFlow | None:
    name = f"{pair}-aggTrades-{day.isoformat()}.zip"
    url = f"{base_url.rstrip('/')}/data/spot/daily/aggTrades/{pair}/{name}"
    blob = _get(client, url)
    if blob is None:
        return None
    check = _get(client, url + ".CHECKSUM")
    if check is not None:
        expected = check.decode().split()[0].strip().lower()
        if hashlib.sha256(blob).hexdigest() != expected:
            raise SourceError(f"{name} 체크섬 불일치", retryable=True)
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        return parse_flow(z.read(z.namelist()[0]))


def points(base: str, day: date, flow: DailyFlow) -> list[SeriesPoint]:
    """관측 = 그날 00:00 UTC, 공개 = 그날 마감. 체결은 실시간 공개라 마감에 이미 안다."""
    observed = datetime(day.year, day.month, day.day, tzinfo=UTC)
    available = observed + timedelta(days=1)
    return [
        SeriesPoint(SOURCE, f"whale_buy_usd:{base}", observed, available, flow.buy_usd, "USD"),
        SeriesPoint(SOURCE, f"whale_sell_usd:{base}", observed, available, flow.sell_usd, "USD"),
        SeriesPoint(SOURCE, f"whale_n:{base}", observed, available, float(flow.n_buy + flow.n_sell), "count"),
    ]
