"""국내 주식 거래일 달력 — 주 첫 거래일 격자 · 5거래일 기간 · 장 마감 뒤 공개(FC-REQ-009)."""

from __future__ import annotations

from datetime import date

import numpy as np
import pytest

from salt_forecast.domain.baselines import random_walk_normal
from salt_forecast.domain.calendar import KRX_CLOSE_AVAILABLE, KrxSessions, krx_session
from salt_forecast.domain.series import DAY, CloseSeries

# 2026-09-28(월) ~ 2026-10-16(금). 실제 휴장: 10-05(월) 대체 · 10-09(금) 한글날
_DATES = [
    date(2026, 9, 28), date(2026, 9, 29), date(2026, 9, 30), date(2026, 10, 1), date(2026, 10, 2),
    date(2026, 10, 6), date(2026, 10, 7), date(2026, 10, 8),
    date(2026, 10, 12), date(2026, 10, 13), date(2026, 10, 14), date(2026, 10, 15), date(2026, 10, 16),
]  # fmt: skip
CAL = KrxSessions.from_dates(_DATES)
S = {d: krx_session(d) for d in _DATES}


def _series(dates: list[date]) -> CloseSeries:
    t = np.asarray([S[d] + KRX_CLOSE_AVAILABLE for d in dates], dtype=np.int64)
    return CloseSeries("005930", t, np.linspace(100.0, 112.0, t.size))


def test_session_is_09_kst_and_close_known_16_kst() -> None:
    assert S[date(2026, 10, 8)] == 1_791_417_600  # 2026-10-08 00:00 UTC = 09:00 KST
    assert KRX_CLOSE_AVAILABLE == 7 * 3600  # 16:00 KST


def test_grid_is_first_session_of_week_monday_holiday_moves_to_tuesday() -> None:
    grid = CAL.grid(0, 2**62)
    assert grid == [S[date(2026, 9, 28)], S[date(2026, 10, 6)], S[date(2026, 10, 12)]]
    assert CAL.on_grid(S[date(2026, 10, 6)])  # 월요일 10-05 휴장 → 화요일
    assert not CAL.on_grid(S[date(2026, 10, 7)])
    assert not CAL.on_grid(S[date(2026, 10, 6)] + 3600)


def test_label_end_counts_trading_days_across_holidays() -> None:
    """10-06(화) as_of 기준 종가 = 10-02(금). 5거래일 뒤 = 10-06,07,08,12,13 → 10-13 16:00 KST."""
    end = CAL.label_end(S[date(2026, 10, 6)], 1)
    assert end == S[date(2026, 10, 13)] + KRX_CLOSE_AVAILABLE
    assert CAL.label_end(S[date(2026, 10, 6)], 2) is None  # 달력이 아직 모른다 — 추정하지 않는다


def test_realized_waits_for_close_and_uses_prior_session_base() -> None:
    s = _series(_DATES)
    as_of = S[date(2026, 10, 6)]
    end = S[date(2026, 10, 13)] + KRX_CLOSE_AVAILABLE
    assert CAL.realized(s.as_of(end - 1), as_of, 1) is None  # 장 마감 공개 전
    r = CAL.realized(s, as_of, 1)
    base, final = s.close_at_or_before(as_of), s.close_at_or_before(end)
    assert r is not None and base is not None and final is not None
    assert base == s.close[_DATES.index(date(2026, 10, 2))]
    assert r == pytest.approx(float(np.log(final / base)))


def test_fresh_needs_previous_session_bar() -> None:
    """10-06 as_of 엔 10-02 봉이 있어야 한다 — 그 전에 멈춘 종목(거래정지)은 전망하지 않는다."""
    as_of = S[date(2026, 10, 6)]
    assert CAL.fresh(_series(_DATES[:5]), as_of)
    assert not CAL.fresh(_series(_DATES[:4]), as_of)
    # 같은 날 장중(09:00~16:00 전)엔 그날 종가를 모른다 — 직전 거래일 봉이면 충분
    assert CAL.fresh(_series(_DATES[:5]), as_of + 6 * 3600)
    # 게이트 신선도는 2 영업일 — 하루 늦은 것은 봐주고 이틀은 안 된다
    assert CAL.fresh(_series(_DATES[:4]), as_of, slack=1)
    assert not CAL.fresh(_series(_DATES[:3]), as_of, slack=1)


def test_latest_session() -> None:
    """한글날(10-09 금) · 토요일에 돌면 10-08 as_of 를 다시 쓴다."""
    saturday = krx_session(date(2026, 10, 10))
    assert CAL.latest_session(saturday) == S[date(2026, 10, 8)]
    assert CAL.latest_session(S[date(2026, 10, 12)]) == S[date(2026, 10, 12)]
    assert CAL.latest_session(S[date(2026, 9, 28)] - 1) is None


def test_rejects_unsorted_or_intraday_sessions() -> None:
    with pytest.raises(ValueError):
        KrxSessions(np.asarray([2 * DAY, DAY], dtype=np.int64))
    with pytest.raises(ValueError):
        KrxSessions(np.asarray([DAY + 3600], dtype=np.int64))


def test_random_walk_scale_uses_bars_per_week() -> None:
    """국내 주식 1주 = 5거래일 → 스케일 = σ√5. 주말 간격 봉도 버리지 않는다(max_gap=None)."""
    t = np.asarray([krx_session(date(2025, 1, 1)) + i * DAY for i in range(400)], dtype=np.int64)
    t = t[((t // DAY) + 3) % 7 < 5] + KRX_CLOSE_AVAILABLE
    rng = np.random.default_rng(3)
    s = CloseSeries("X", t, 100.0 * np.exp(np.cumsum(rng.normal(0, 0.02, t.size))))
    kr = random_walk_normal(s, 1, days_per_week=5, max_gap=None)
    coin_rule = random_walk_normal(s, 1)  # 1.5일 상한 — 월요일 수익률을 버린다
    assert kr is not None and coin_rule is not None
    sigma = float(np.std(np.diff(np.log(s.close[s.available_at >= s.available_at[-1] - 365 * DAY])), ddof=1))
    assert kr.scale == pytest.approx(sigma * np.sqrt(5))
    assert kr.scale != pytest.approx(coin_rule.scale)
