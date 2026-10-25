"""국내 주식 일봉 옮기기 — 첫 봉(FC-REQ-020 FR-10)."""

from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal

from salt_forecast.ingest import krx_daily
from salt_forecast.store.kr_stock import KrDailyRow

NOW = datetime(2026, 10, 23, 12, 0, tzinfo=UTC)


def _row(code: str, d: date, close: int = 100) -> KrDailyRow:
    p = Decimal(close)
    return KrDailyRow(code, d, p, p, p, p, Decimal(1))


def test_first_open_is_each_symbols_earliest_bar() -> None:
    rows = [_row("000001", date(2026, 10, 20)), _row("000001", date(2026, 10, 19)), _row("000002", date(2026, 10, 21))]
    first = krx_daily.first_open(krx_daily.to_bars(rows, NOW))
    # 봉 시작 = 거래일 00:00 KST
    assert first == {
        "000001": datetime(2026, 10, 18, 15, 0, tzinfo=UTC),
        "000002": datetime(2026, 10, 20, 15, 0, tzinfo=UTC),
    }


def test_first_open_empty_when_no_rows() -> None:
    # 서버 일봉 0건이면 지울 기준도 없다 — 받기 실패를 "이력 없음"으로 읽어 전부 지우지 않는다
    assert krx_daily.first_open([]) == {}
