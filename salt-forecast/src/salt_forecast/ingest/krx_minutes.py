"""국내 주식 5분봉 — 서버 `public.price_history`(kr_stock 5m)를 `forecast.price_bar` kis 5m 로 옮긴다(FC-REQ-028 FR-7).

외부 호출 0(키는 서버에만). 서버도 국내 5분봉을 400일 두지만(2026-11-16), 장중 기저율(`base-rate@3`)의 이력은 예측 표에
지우지 않고 쌓는다 — 서버 보관 정책이 바뀌어도 사전등록 표본이 사라지지 않게.

시각: 그날 정규장 봉만(평상일 09:00 ~ 15:30 · 수능일 10:00 ~ 16:30 · 새해 첫 개장일 10:00 ~ 15:30 KST —
`calendar.krx_regular_minutes`). available_at = 봉 마감(시작 + 5분). 고정 09:00 ~ 15:30 이던 때 수능일(2026-11-19)
동시호가 예상가 봉(09:30 · 09:35)을 옮기고 15:30 ~ 16:30(종가 단일가 포함)을 버렸다.
마감 전 봉은 장중 미확정이라 버린다(time-and-leakage.md §1).
서버는 그날 5분봉을 15:40 · 20:40 에 KIS 분봉으로 덮어쓴다 — 그래서 매번 최근 며칠을 겹쳐 다시 옮긴다(upsert).
"""

from __future__ import annotations

from collections.abc import Collection, Iterable, Iterator
from datetime import date, datetime, timedelta

from salt_forecast.domain.calendar import krx_regular_minutes
from salt_forecast.store.kr_stock import KrMinuteRow
from salt_forecast.store.prices import Bar

SOURCE = "kis"
INTERVAL = "5m"
_KST = timedelta(hours=9)
_LENGTH = timedelta(minutes=5)


def to_bars(rows: Iterable[KrMinuteRow], now: datetime, closed: Collection[date]) -> Iterator[Bar]:
    """그날 정규장 밖(장전 동시호가 · 시간외) · 아직 안 닫힌 봉은 버린다. `closed` = KRX 휴장일(새해 첫 개장일 판정)."""
    hours: dict[date, tuple[int, int]] = {}
    for r in rows:
        kst = r.start + _KST
        day = kst.date()
        if day not in hours:
            hours[day] = krx_regular_minutes(day, closed)
        open_min, close_min = hours[day]
        minute = kst.hour * 60 + kst.minute
        closes = r.start + _LENGTH
        if not open_min <= minute < close_min or closes > now:
            continue
        yield Bar(SOURCE, r.code, INTERVAL, r.start, closes, closes, r.open, r.high, r.low, r.close, r.volume)
