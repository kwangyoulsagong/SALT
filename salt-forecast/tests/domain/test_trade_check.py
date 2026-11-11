"""점검 채점 결과 봉 — 점검 문장과 같은 정의(FC-REQ-028 FR-4). 경계 표."""

from __future__ import annotations

import math
from datetime import UTC, date, datetime

import numpy as np
import pytest

from salt_forecast.domain.base_rate import CRYPTO_ROUND_TRIP, kr_round_trip
from salt_forecast.domain.trade_check import CheckRow, end_bar, score


def _kr_bars(days: list[date]) -> np.ndarray:
    # 국내 일봉 available_at = 그 거래일 16:00 KST = 07:00 UTC
    return np.array([int(datetime(d.year, d.month, d.day, 7, tzinfo=UTC).timestamp()) for d in days], dtype=np.int64)


# 2026-11-06(금) · 09(월) · 10(화) · 11(수) · 12(목)
KR_DAYS = [date(2026, 11, 6), date(2026, 11, 9), date(2026, 11, 10), date(2026, 11, 11), date(2026, 11, 12)]
FAR = int(datetime(2030, 1, 1, tzinfo=UTC).timestamp())


def _row(market: str, checked: datetime, side: str = "buy", h: int = 1, price: float = 10_000.0) -> CheckRow:
    return CheckRow("id", "005930" if market == "kr" else "KRW-BTC", market, side, "K1", h, 0.47, price, checked)


@pytest.mark.parametrize(
    ("checked", "expected_day"),
    [
        (datetime(2026, 11, 10, 2, 0, tzinfo=UTC), date(2026, 11, 11)),  # 화 11:00 KST 장중 → 수 종가
        (datetime(2026, 11, 10, 10, 0, tzinfo=UTC), date(2026, 11, 11)),  # 화 19:00 KST 마감 뒤 → 수 종가
        (datetime(2026, 11, 7, 3, 0, tzinfo=UTC), date(2026, 11, 9)),  # 토 → 월 종가
        (datetime(2026, 11, 10, 15, 30, tzinfo=UTC), date(2026, 11, 12)),  # 수 00:30 KST(UTC 로는 화) → 목 종가
    ],
)
def test_kr_end_is_next_session_after_check_day_kst(checked: datetime, expected_day: date) -> None:
    bars = _kr_bars(KR_DAYS)
    idx = end_bar(_row("kr", checked), bars, FAR)
    assert idx is not None
    assert KR_DAYS[idx] == expected_day


def test_kr_five_sessions_and_not_yet() -> None:
    bars = _kr_bars(KR_DAYS)
    assert end_bar(_row("kr", datetime(2026, 11, 6, 2, tzinfo=UTC), h=4), bars, FAR) == 4
    assert end_bar(_row("kr", datetime(2026, 11, 6, 2, tzinfo=UTC), h=5), bars, FAR) is None  # 봉이 아직 없다
    # as_of 가 결과 봉 전이면 None — 미래를 읽지 않는다
    as_of = int(datetime(2026, 11, 9, 6, 59, tzinfo=UTC).timestamp())
    assert end_bar(_row("kr", datetime(2026, 11, 6, 2, tzinfo=UTC)), bars, as_of) is None


def test_crypto_end_is_first_bar_after_24h() -> None:
    bars = np.array([int(datetime(2026, 11, d, 0, tzinfo=UTC).timestamp()) for d in (10, 11, 12, 13)], dtype=np.int64)
    idx = end_bar(_row("crypto", datetime(2026, 11, 10, 5, tzinfo=UTC)), bars, FAR)
    assert idx == 2  # 11-11 05:00 이후 첫 봉 = 11-12 00:00
    idx_exact = end_bar(_row("crypto", datetime(2026, 11, 10, 0, tzinfo=UTC)), bars, FAR)
    assert idx_exact == 1  # 정확히 24시간 뒤 봉


def test_cost_only_on_buy() -> None:
    bars = _kr_bars(KR_DAYS)
    close = np.array([10_000, 10_000, 10_100, 10_200, 10_300], dtype=np.float64)
    checked = datetime(2026, 11, 9, 2, tzinfo=UTC)
    buy = score(_row("kr", checked, "buy"), bars, close, FAR)
    sell = score(_row("kr", checked, "sell"), bars, close, FAR)
    assert buy is not None and sell is not None
    gross = math.log(10_100 / 10_000)
    assert sell.realized == pytest.approx(gross)
    assert buy.realized == pytest.approx(gross - kr_round_trip(date(2026, 11, 10), 10_000))
    assert buy.went_up is (buy.realized > 0)
    cbars = np.array([int(datetime(2026, 11, d, tzinfo=UTC).timestamp()) for d in (10, 11, 12)], dtype=np.int64)
    c = score(
        _row("crypto", datetime(2026, 11, 10, tzinfo=UTC), "buy", price=100.0),
        cbars,
        np.array([100.0, 101.0, 102.0]),
        FAR,
    )
    assert c is not None and c.realized == pytest.approx(math.log(1.01) - CRYPTO_ROUND_TRIP)
