"""국내 일정 규칙 · 국내 일봉 반응 시각 · 끊김 — FC-REQ-021 FR-2 · 3 · 5 · 8."""

from datetime import UTC, date, datetime, timedelta

import numpy as np

from salt_forecast.domain.calendar import KRX_CLOSE_AVAILABLE
from salt_forecast.domain.events import (
    MIN_SAMPLE,
    RULE_ANNOUNCE_LEAD,
    ScheduledEvent,
    _baseline,  # pyright: ignore[reportPrivateUsage]
    first_of_months,
    quad_expiry_days,
    reaction,
    region,
    scheduled,
    stats,
)
from salt_forecast.domain.kr_breaks import up_limit_breaks
from salt_forecast.domain.series import DAY, OhlcvSeries

# 2024-01-01(월) 부터 평일만 — 국내 일봉은 그날 07:00 UTC(16:00 KST)에 닫힌다
START = date(2024, 1, 1)


def _weekdays(n: int) -> list[date]:
    out: list[date] = []
    d = START
    while len(out) < n:
        if d.weekday() < 5:
            out.append(d)
        d += timedelta(days=1)
    return out


def _kr_bars(close: np.ndarray, symbol: str = "005930") -> tuple[OhlcvSeries, list[date]]:
    days = _weekdays(len(close))
    t = np.array(
        [int(datetime(d.year, d.month, d.day, tzinfo=UTC).timestamp()) + KRX_CLOSE_AVAILABLE for d in days],
        dtype=np.int64,
    )
    return OhlcvSeries(symbol, t, close.copy(), close, close, close.copy(), np.full(len(close), 100.0)), days


def test_quad_expiry_is_second_thursday_and_steps_back_over_holidays() -> None:
    days = quad_expiry_days(date(2024, 1, 1), date(2024, 12, 31), set())
    assert days == [date(2024, 3, 14), date(2024, 6, 13), date(2024, 9, 12), date(2024, 12, 12)]
    # 둘째 목요일이 휴장이면 직전 거래일(수요일)
    shifted = quad_expiry_days(date(2024, 9, 1), date(2024, 9, 30), {date(2024, 9, 12)})
    assert shifted == [date(2024, 9, 11)]


def test_trade_release_is_every_first_of_month() -> None:
    assert first_of_months(date(2025, 11, 15), date(2026, 2, 1)) == [
        date(2025, 12, 1),
        date(2026, 1, 1),
        date(2026, 2, 1),
    ]


def test_kr_release_times_are_kst_and_rule_kinds_are_known_30_days_ahead() -> None:
    bok = scheduled("kr_bok_rate", date(2026, 11, 26), "bok", "x")
    assert bok.event_at == datetime(2026, 11, 26, 1, 0, tzinfo=UTC)  # 10:00 KST
    cpi = scheduled("kr_cpi", date(2026, 11, 3), "mods", "x")
    assert cpi.event_at == datetime(2026, 11, 2, 23, 0, tzinfo=UTC)  # 08:00 KST
    trade = scheduled("kr_trade", date(2026, 12, 1), "rule", "x")
    assert trade.event_at - trade.announced_at == RULE_ANNOUNCE_LEAD
    assert region("kr_trade") == "kr" and region("fomc") == "us"
    assert bok.symbol == ""


def test_intraday_and_premarket_kr_releases_use_previous_close() -> None:
    close = np.arange(100.0, 160.0)
    bars, days = _kr_bars(close)
    as_of = datetime(2024, 12, 31, tzinfo=UTC)
    d = days[30]
    for kind in ("kr_bok_rate", "kr_cpi", "kr_quad_expiry"):
        r = reaction(bars, scheduled(kind, d, "t", "x"), as_of)
        assert r is not None and r.ref_index == 29, kind  # 발표가 든 거래일(30)의 전 거래일 종가
        assert r.returns[1] == close[30] / close[29] - 1
        assert r.ref_bar_open == datetime(days[29].year, days[29].month, days[29].day, tzinfo=UTC)


def test_us_release_first_reacts_on_next_kr_session() -> None:
    """FOMC 14:00 ET = 국내 새벽 — 그날 국내 종가가 기준, 다음 국내 거래일이 첫 반응 봉(FR-8)."""
    close = np.arange(100.0, 160.0)
    bars, days = _kr_bars(close)
    d = days[30]
    r = reaction(bars, scheduled("fomc", d, "t", "x"), datetime(2024, 12, 31, tzinfo=UTC))
    assert r is not None and r.ref_index == 30 and r.returns[1] == close[31] / close[30] - 1


def test_breaks_drop_returns_and_baseline_windows_that_cross_them() -> None:
    rng = np.random.default_rng(7)
    close = 100 * np.exp(np.cumsum(rng.normal(0, 0.01, 400)))
    close[200:] *= 10.0  # 미수정 병합 — 200 봉에서 ×10
    bars, days = _kr_bars(close)
    cum = np.cumsum(up_limit_breaks(close)).astype(np.int64)
    as_of = datetime(2026, 1, 1, tzinfo=UTC)
    crossing = reaction(bars, scheduled("kr_cpi", days[198], "t", "x"), as_of, cum)
    assert crossing is not None
    assert crossing.returns[1] is not None and crossing.returns[5] is None  # 199→200 을 걸친 창
    after = reaction(bars, scheduled("kr_cpi", days[205], "t", "x"), as_of, cum)
    assert after is not None and after.pre_return_5d is None  # 기준 앞 5봉이 끊김을 걸친다

    # 197 일 사건(기준 196)의 5일 창은 200 의 끊김을 걸친다 — 표본에서 빠져야 한다
    evs = [scheduled("kr_cpi", days[i], "t", "x") for i in [*range(30, 390, 20), 197]]
    rs = [r for e in evs if (r := reaction(bars, e, as_of, cum)) is not None]
    s = stats(bars, "kr_cpi", rs, 5, as_of, cum)
    assert s.sample >= MIN_SAMPLE and s.baseline is not None
    assert s.baseline[2] < 0.5  # ×10 창이 평소 분포 꼬리에 없다
    naive = stats(bars, "kr_cpi", [r for e in evs if (r := reaction(bars, e, as_of)) is not None], 5, as_of)
    assert naive.baseline is not None and naive.sample == s.sample + 1
    # 평소 분포 창: 끊김을 넘기면 ×10 창(5개)이 들어온다 — q95 엔 안 보여도 분포를 오염시킨다
    at = int(as_of.timestamp())
    assert _baseline(bars, 0, 5, at).max() > 5.0
    assert _baseline(bars, 0, 5, at, cum).max() < 0.5


def test_event_symbol_is_carried_to_reaction() -> None:
    bars, days = _kr_bars(np.arange(100.0, 160.0))
    at = datetime(days[30].year, days[30].month, days[30].day, 9, tzinfo=UTC)
    e = ScheduledEvent("kr_cpi", at, at - timedelta(days=1), "t", "x", "005930")
    r = reaction(bars, e, datetime(2024, 12, 31, tzinfo=UTC))
    assert r is not None and r.event_symbol == "005930" and r.symbol == "005930"
    assert DAY == 86_400
