"""국내 주식 일봉 — 서버가 KIS 에서 받아 `public.price_history` 에 둔 것을 `forecast.price_bar` 로 옮긴다(FC-REQ-009).

외부 호출이 없는 유일한 수집이다 — 키 보유처를 서버 한 곳으로 둔다(FEATURE-011 FR-80).
available_at = 거래일 16:00 KST(15:30 마감 + 정정 여유 30분, 서버 확정 작업은 15:45). 그 전에 본 봉은 장중
미확정이라 버린다(time-and-leakage.md §1).
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator
from datetime import UTC, datetime, timedelta

from salt_forecast.domain.calendar import KRX_CLOSE_AVAILABLE, krx_session
from salt_forecast.store.kr_stock import KrDailyRow
from salt_forecast.store.prices import Bar

SOURCE = "kis"
INTERVAL = "1d"
# 봉 시작 = 거래일 00:00 KST, 마감 = 15:30 KST
_OPEN_OFFSET = timedelta(hours=-9)
_CLOSE_OFFSET = timedelta(hours=6, minutes=30)


def to_bars(rows: Iterable[KrDailyRow], now: datetime) -> Iterator[Bar]:
    """now 에 아직 공개 전(16:00 KST 전)인 봉은 버린다."""
    for r in rows:
        session = datetime.fromtimestamp(krx_session(r.trade_date), tz=UTC)
        available = session + timedelta(seconds=KRX_CLOSE_AVAILABLE)
        if available > now:
            continue
        yield Bar(
            SOURCE,
            r.code,
            INTERVAL,
            session + _OPEN_OFFSET,
            session + _CLOSE_OFFSET,
            available,
            r.open,
            r.high,
            r.low,
            r.close,
            r.volume,
        )
