"""업비트 일봉 — 공개 시세 API. 키 없음.

available_at = 봉 마감(= 다음 날 00:00 UTC). 아직 닫히지 않은 오늘 봉은 버린다(time-and-leakage.md §1).
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import httpx
from pydantic import BaseModel

from salt_forecast.ingest.http import Pacer as _BasePacer
from salt_forecast.ingest.http import SourceError, get_json
from salt_forecast.store.prices import Bar

SOURCE = "upbit"
INTERVAL = "1d"
PAGE = 200


class _Market(BaseModel):
    market: str


class _DayCandle(BaseModel):
    market: str
    candle_date_time_utc: datetime
    opening_price: Decimal
    high_price: Decimal
    low_price: Decimal
    trade_price: Decimal
    candle_acc_trade_volume: Decimal | None = None


class Pacer(_BasePacer):
    """업비트 `Remaining-Req` 헤더까지 보는 pacer."""

    def observe(self, remaining_req: str | None) -> None:
        """`group=candles; min=600; sec=0`. 같은 IP 를 쓰는 다른 프로세스(로컬 salt-server)와
        한도를 나눠 쓰므로, 남은 수가 0 이면 429 를 맞기 전에 다음 초까지 쉰다."""
        if not remaining_req:
            return
        parts = dict(kv.strip().split("=", 1) for kv in remaining_req.split(";") if "=" in kv)
        if parts.get("sec") == "0":
            self.hold(1.0)


class UpbitDaily:
    def __init__(self, client: httpx.Client, base_url: str, pacer: Pacer) -> None:
        self.client = client
        self.base_url = base_url.rstrip("/")
        self.pacer = pacer

    def _get(self, path: str, params: dict[str, str | int]) -> list[dict[str, object]]:
        body = get_json(
            self.client,
            f"{self.base_url}{path}",
            params,
            self.pacer,
            observe=lambda r: self.pacer.observe(r.headers.get("Remaining-Req")),
            label=path,
        )
        if not isinstance(body, list):
            raise SourceError(f"{path} 응답이 목록이 아니다", retryable=False)
        return body  # pyright: ignore[reportUnknownVariableType]

    def krw_markets(self) -> list[str]:
        rows = self._get("/market/all", {"isDetails": "false"})
        return sorted(m.market for m in (_Market.model_validate(r) for r in rows) if m.market.startswith("KRW-"))

    def fetch(self, symbol: str, since: datetime, until: datetime, now: datetime) -> Iterator[Bar]:
        """until 부터 거꾸로 since 까지. 닫히지 않은 봉(마감 > now)은 버린다."""
        cursor = until
        while cursor > since:
            rows = self._get(
                "/candles/days",
                {"market": symbol, "count": PAGE, "to": cursor.strftime("%Y-%m-%dT%H:%M:%SZ")},
            )
            if not rows:
                return
            candles = [_DayCandle.model_validate(r) for r in rows]
            for c in candles:
                open_time = c.candle_date_time_utc.replace(tzinfo=UTC)
                close_time = open_time + timedelta(days=1)
                if close_time > now or open_time < since:
                    continue
                yield Bar(
                    SOURCE,
                    symbol,
                    INTERVAL,
                    open_time,
                    close_time,
                    close_time,
                    c.opening_price,
                    c.high_price,
                    c.low_price,
                    c.trade_price,
                    c.candle_acc_trade_volume,
                )
            oldest = min(c.candle_date_time_utc for c in candles).replace(tzinfo=UTC)
            if len(candles) < PAGE or oldest >= cursor:
                return
            cursor = oldest
