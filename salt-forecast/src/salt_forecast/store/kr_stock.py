"""국내 주식 원천 읽기 — 서버가 채운 `public` 표를 **읽기만** 한다(db-contract.md §1, FEATURE-011 FR-80).

Python 은 KIS 를 부르지 않는다 — 키 보유처를 서버 한 곳으로 둔다. `price_history.timestamp` 는 시간대 없는
UTC 이고 거래일 00:00 KST 다(2026-10-07 = 2026-10-06 15:00). 날짜 변환은 세션 시간대와 무관하게 SQL 에서 한다.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy import Engine, text

# timestamp(UTC, 시간대 없음) → KST 날짜. 세션 tz 가 Asia/Seoul 이어도 같은 값(local-fullstack 의 9시간 사고)
_KST_DATE = "((ph.timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date"


@dataclass(frozen=True, slots=True)
class KrDailyRow:
    code: str
    trade_date: date
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal | None


def kr_daily_rows(engine: Engine) -> list[KrDailyRow]:
    """국내 주식 일봉 전부."""
    sql = (
        f"SELECT ph.symbol, {_KST_DATE} AS d, ph.open, ph.high, ph.low, ph.close, ph.volume "
        "FROM public.price_history ph "
        "WHERE ph.asset_type = 'kr_stock' AND ph.timeframe = '1d' ORDER BY ph.symbol, d"
    )
    with engine.connect() as conn:
        rows = conn.execute(text(sql)).all()
    return [KrDailyRow(str(r[0]), r[1], r[2], r[3], r[4], r[5], r[6]) for r in rows]


def krx_open_dates(engine: Engine) -> list[date]:
    """KRX 개장일(`market_holidays.is_open`) 전부.

    `synced_at` 으로 시점을 자르지 않는다 — 서버가 재동기화마다 그 값을 새로 써서(2026-10-08 실측: 전 행이 같은 시각)
    과거 as_of 로 돌리면 달력이 비고, 장이 열린 날을 휴장으로 읽는다. 거래일 날짜는 가격 정보가 아니고, as_of 뒤의
    거래일은 엔진 계산에 들어가지 않는다(`tests/leakage/test_kr_leakage.py` 달력 확장 테스트).
    """
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT date FROM public.market_holidays WHERE market = 'KRX' AND is_open ORDER BY date")
        ).all()
    return [r[0] for r in rows]
