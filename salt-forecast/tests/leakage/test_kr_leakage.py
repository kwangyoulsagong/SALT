"""국내 주식 누수 테스트 — 코인 4종(test_leakage.py)을 거래일 달력으로 다시(FC-REQ-009, time-and-leakage.md §6)."""

from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal

from salt_forecast.domain.calendar import KrxSessions
from salt_forecast.domain.series import CloseSeries
from salt_forecast.ingest.krx_daily import to_bars
from salt_forecast.models.engine import POOL_WEEKS, WalkForward
from salt_forecast.models.kr_stock import kr_providers
from salt_forecast.store.kr_stock import KrDailyRow
from tests.synthetic import krx_universe

DAYS = 900


def _wf(series: dict[str, CloseSeries], cal: KrxSessions) -> WalkForward:
    return WalkForward(series, kr_providers(cal), schedule=cal)


def _snapshot(wf: WalkForward, as_of: int) -> list[tuple[str, int, str, tuple[float, ...], str]]:
    return sorted(
        (e.symbol, e.horizon_weeks, e.model_version, e.forecast.q, e.direction)
        for e in wf.emit(as_of, with_realized=False)
    )


def test_future_contamination_does_not_change_forecast() -> None:
    sessions, base = krx_universe(30, DAYS)
    cal = KrxSessions(sessions)
    as_of = cal.grid(0, 2**62)[-20]
    tampered = {
        s: CloseSeries(s, c.available_at, c.close * (1 + 2.0 * (c.available_at > as_of))) for s, c in base.items()
    }
    a = _snapshot(_wf(base, cal), as_of)
    assert a and a == _snapshot(_wf(tampered, cal), as_of)


def test_same_day_close_is_not_used_before_16_kst() -> None:
    """as_of = 거래일 09:00 KST. 그날 종가(16:00 공개)를 바꿔도 전망이 같다."""
    sessions, base = krx_universe(20, DAYS)
    cal = KrxSessions(sessions)
    as_of = cal.grid(0, 2**62)[-15]
    tampered: dict[str, CloseSeries] = {}
    for s, c in base.items():
        close = c.close.copy()
        close[c.available_at == as_of + 7 * 3600] *= 5.0
        tampered[s] = CloseSeries(s, c.available_at, close)
    assert _snapshot(_wf(base, cal), as_of) == _snapshot(_wf(tampered, cal), as_of)


def test_calendar_beyond_as_of_does_not_change_forecast() -> None:
    """달력은 as_of 뒤 거래일까지 알아도 된다(서버 개장일 표). 전망은 as_of 까지 자른 달력과 같아야 한다."""
    sessions, u = krx_universe(20, DAYS)
    full = KrxSessions(sessions)
    as_of = full.grid(0, 2**62)[-12]
    cut = KrxSessions(sessions[sessions <= as_of])
    a = _snapshot(_wf(u, full), as_of)
    assert a and a == _snapshot(_wf(u, cut), as_of)


def test_reproducible() -> None:
    sessions, u = krx_universe(15, DAYS)
    cal = KrxSessions(sessions)
    as_of = cal.grid(0, 2**62)[-10]
    assert _snapshot(_wf(u, cal), as_of) == _snapshot(_wf(u, cal), as_of)


def test_embargo_pool_labels_end_before_as_of() -> None:
    sessions, u = krx_universe(10, DAYS)
    cal = KrxSessions(sessions)
    wf = _wf(u, cal)
    as_of = wf.grid[-10]
    for h in wf.horizons:
        idx = wf._pool_indices(as_of, h)  # pyright: ignore[reportPrivateUsage]
        assert 0 < len(idx) <= POOL_WEEKS
        for i in idx:
            end = cal.label_end(wf.grid[i], h)
            assert end is not None and end <= as_of


def test_ingest_drops_bar_before_close_is_public() -> None:
    """서버가 장중에 받아 둔 오늘 봉(미확정)은 16:00 KST 전엔 옮기지 않는다."""
    p = Decimal(100)
    row = KrDailyRow("005930", date(2026, 10, 8), p, p, p, p, Decimal(1))
    before = datetime(2026, 10, 8, 6, 59, tzinfo=UTC)  # 15:59 KST
    after = datetime(2026, 10, 8, 7, 0, tzinfo=UTC)
    assert list(to_bars([row], before)) == []
    (bar,) = to_bars([row], after)
    assert bar.open_time == datetime(2026, 10, 7, 15, 0, tzinfo=UTC)  # 10-08 00:00 KST
    assert bar.close_time == datetime(2026, 10, 8, 6, 30, tzinfo=UTC)  # 15:30 KST
    assert bar.available_at == after
