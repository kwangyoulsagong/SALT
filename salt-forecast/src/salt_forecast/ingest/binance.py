"""바이낸스 공개 API — 선물 미결제약정 · 펀딩비, 현물 일봉(김치 프리미엄 계산용). 키 없음 · 조회만.

미결제약정 이력은 **최근 30일만** 준다 — 매일 돌아야 구멍이 안 생긴다(FEATURE-008 FR-32).
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import httpx
from pydantic import BaseModel

from salt_forecast.ingest.http import Pacer, get_json
from salt_forecast.store.prices import Bar
from salt_forecast.store.series import SeriesPoint

SOURCE = "binance"
OI_PERIOD = "1h"
OI_LAG = timedelta(minutes=5)  # 스냅샷 시각 직후 공개 — 보수적 지연
OI_HISTORY = timedelta(days=30)


def _ms(d: datetime) -> int:
    return int(d.timestamp() * 1000)


def _dt(ms: int) -> datetime:
    return datetime.fromtimestamp(ms / 1000, tz=UTC)


class _OI(BaseModel):
    symbol: str
    sumOpenInterestValue: float
    timestamp: int


class _Funding(BaseModel):
    symbol: str
    fundingTime: int
    fundingRate: float


class Binance:
    def __init__(self, client: httpx.Client, futures_url: str, spot_url: str, pacer: Pacer) -> None:
        self.client = client
        self.futures = futures_url.rstrip("/")
        self.spot = spot_url.rstrip("/")
        self.pacer = pacer

    def perpetual_bases(self) -> set[str]:
        info = get_json(self.client, f"{self.futures}/fapi/v1/exchangeInfo", {}, self.pacer, label="exchangeInfo")
        return {
            str(s["baseAsset"])
            for s in info["symbols"]
            if s.get("contractType") == "PERPETUAL" and s.get("quoteAsset") == "USDT" and s.get("status") == "TRADING"
        }

    def open_interest(self, base: str, now: datetime) -> Iterator[SeriesPoint]:
        """최근 30일 1시간 스냅샷(USD 가치)."""
        start = now - OI_HISTORY + timedelta(hours=1)
        while start < now:
            rows = get_json(
                self.client,
                f"{self.futures}/futures/data/openInterestHist",
                {"symbol": f"{base}USDT", "period": OI_PERIOD, "limit": 500, "startTime": _ms(start)},
                self.pacer,
                label="openInterestHist",
            )
            if not rows:
                return
            last = start
            for r in (_OI.model_validate(x) for x in rows):
                t = _dt(r.timestamp)
                last = max(last, t)
                if t + OI_LAG <= now:
                    yield SeriesPoint(SOURCE, f"oi_usd:{base}", t, t + OI_LAG, r.sumOpenInterestValue, "USD")
            if len(rows) < 500:
                return
            start = last + timedelta(hours=1)

    def funding(self, base: str, since: datetime, now: datetime) -> Iterator[SeriesPoint]:
        """펀딩비 전체 이력(8시간마다). available_at = 정산 시각."""
        start = since
        while start < now:
            rows = get_json(
                self.client,
                f"{self.futures}/fapi/v1/fundingRate",
                {"symbol": f"{base}USDT", "startTime": _ms(start), "limit": 1000},
                self.pacer,
                label="fundingRate",
            )
            if not rows:
                return
            items = [_Funding.model_validate(x) for x in rows]
            for f in items:
                t = _dt(f.fundingTime)
                if t <= now:
                    yield SeriesPoint(SOURCE, f"funding:{base}", t, t, f.fundingRate, "rate")
            if len(items) < 1000:
                return
            start = _dt(items[-1].fundingTime) + timedelta(milliseconds=1)

    def spot_daily(self, base: str, since: datetime, now: datetime) -> Iterator[Bar]:
        """USDT 현물 일봉. 닫힌 봉만(available_at = 마감)."""
        start = since
        while start < now:
            rows = get_json(
                self.client,
                f"{self.spot}/api/v3/klines",
                {"symbol": f"{base}USDT", "interval": "1d", "startTime": _ms(start), "limit": 1000},
                self.pacer,
                label="klines",
            )
            if not rows:
                return
            for k in rows:
                open_time = _dt(int(k[0]))
                close_time = open_time + timedelta(days=1)
                if close_time > now:
                    continue
                yield Bar(
                    SOURCE,
                    f"{base}USDT",
                    "1d",
                    open_time,
                    close_time,
                    close_time,
                    Decimal(str(k[1])),
                    Decimal(str(k[2])),
                    Decimal(str(k[3])),
                    Decimal(str(k[4])),
                    Decimal(str(k[5])),
                )
            if len(rows) < 1000:
                return
            start = _dt(int(rows[-1][0])) + timedelta(days=1)
