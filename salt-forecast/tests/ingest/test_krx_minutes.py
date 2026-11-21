"""국내 주식 5분봉 옮기기 — 그날 장 시간으로 거른다(2026-11-21 수능일 · 새해 첫 개장일)."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from salt_forecast.ingest import krx_minutes
from salt_forecast.store.kr_stock import KrMinuteRow

_KST = timedelta(hours=9)
NOW = datetime(2026, 11, 21, 0, 0, tzinfo=UTC)


def _row(d: date, hhmm: str) -> KrMinuteRow:
    h, m = int(hhmm[:2]), int(hhmm[3:])
    p = Decimal(100)
    return KrMinuteRow("005930", datetime(d.year, d.month, d.day, h, m, tzinfo=UTC) - _KST, p, p, p, p, Decimal(1))


def _kept(rows: list[KrMinuteRow], closed: set[date] | None = None) -> list[str]:
    bars = krx_minutes.to_bars(rows, NOW, closed or set())
    return [(b.open_time + _KST).strftime("%m-%d %H:%M") for b in bars]


def test_normal_day_keeps_0900_to_1525() -> None:
    d = date(2026, 11, 18)
    rows = [_row(d, t) for t in ("08:55", "09:00", "15:25", "15:30")]
    assert _kept(rows) == ["11-18 09:00", "11-18 15:25"]


def test_csat_drops_preopen_auction_and_keeps_until_1625() -> None:
    d = date(2026, 11, 19)
    rows = [_row(d, t) for t in ("09:30", "09:35", "10:00", "15:30", "16:25", "16:30")]
    assert _kept(rows) == ["11-19 10:00", "11-19 15:30", "11-19 16:25"]


def test_first_open_day_of_year_starts_at_1000() -> None:
    d = date(2026, 1, 2)
    rows = [_row(d, t) for t in ("09:00", "09:55", "10:00", "15:25")]
    assert _kept(rows) == ["01-02 10:00", "01-02 15:25"]
    # 1월 2일이 휴장이면 평상 시간 — 다음 개장일이 첫날
    assert _kept(rows, {date(2026, 1, 2)}) == ["01-02 09:00", "01-02 09:55", "01-02 10:00", "01-02 15:25"]


def test_unclosed_bar_is_dropped() -> None:
    d = date(2026, 11, 20)
    now = datetime(2026, 11, 20, 10, 3, tzinfo=UTC) - _KST
    bars = list(krx_minutes.to_bars([_row(d, "10:00")], now, set()))
    assert bars == []
