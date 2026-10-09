"""국내 주식 실현 변동성 — 252 거래일 연율 · 거래일 달력 신선도 (FC-REQ-009 FR-9)."""

from __future__ import annotations

from datetime import UTC, datetime

import numpy as np
import pytest

from salt_forecast.domain.calendar import KRX_CLOSE_AVAILABLE, KrxSessions
from salt_forecast.domain.series import DAY, CloseSeries
from salt_forecast.domain.volatility import ANNUAL_DAYS, KR_ANNUAL_DAYS, estimate
from tests.synthetic import krx_universe

SESSIONS, UNIVERSE = krx_universe(1, 900)
CAL = KrxSessions(SESSIONS)
SERIES: CloseSeries = next(iter(UNIVERSE.values()))


def _fresh(c: CloseSeries, t: int) -> bool:
    return CAL.fresh(c, t, slack=1)


def _at(t: int | np.int64) -> datetime:
    return datetime.fromtimestamp(int(t), UTC)


def test_annualizes_with_252_trading_days() -> None:
    as_of = _at(SESSIONS[-1] + KRX_CLOSE_AVAILABLE)
    kr = estimate(SERIES, as_of, KR_ANNUAL_DAYS, _fresh)
    coin = estimate(SERIES, as_of)
    assert kr.ewma is not None and coin.ewma is not None
    assert kr.ewma == pytest.approx(coin.ewma * (KR_ANNUAL_DAYS / ANNUAL_DAYS) ** 0.5)


def test_long_holiday_is_not_stale_but_missing_sessions_are() -> None:
    """연휴(달력 6일 봉 없음)는 거래일로 재면 끊김이 아니다. 장이 열렸는데 두 거래일 봉이 없으면 끊김."""
    holiday = _at(SESSIONS[-1] + KRX_CLOSE_AVAILABLE + 6 * DAY)
    assert estimate(SERIES, holiday).blocked_reason == "stale_prices"  # 코인 규칙(달력 3일)이면 막힌다
    assert estimate(SERIES, holiday, KR_ANNUAL_DAYS, _fresh).blocked_reason != "stale_prices"
    cut = SERIES.as_of(int(SESSIONS[-3]) + KRX_CLOSE_AVAILABLE)  # 마지막 두 거래일 봉이 없다
    on_close = _at(SESSIONS[-1] + KRX_CLOSE_AVAILABLE)
    assert estimate(cut, on_close, KR_ANNUAL_DAYS, _fresh).blocked_reason == "stale_prices"
