from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.series import DAY, CloseSeries, OhlcvSeries
from salt_forecast.domain.signals import (
    FUNDING_MIN_SAMPLE,
    KIMCHI_CONFIRM_DAYS,
    Points,
    daily_signals,
    funding_events,
    funding_state,
    fx_on_grid,
    kimchi_regime,
    open_interest,
)

T0 = int(datetime(2024, 1, 1, tzinfo=UTC).timestamp())


def _times(n: int) -> np.ndarray:
    # available_at = 봉 마감(다음 날 00:00 UTC)
    return (T0 + np.arange(1, n + 1, dtype=np.int64) * DAY).astype(np.int64)


def _bars(close: np.ndarray) -> OhlcvSeries:
    t = _times(len(close))
    return OhlcvSeries("KRW-BTC", t, close.copy(), close.copy(), close.copy(), close.copy(), np.ones(len(close)))


def _funding(daily: np.ndarray) -> Points:
    """하루 세 번(00 · 08 · 16 UTC) 같은 값으로 정산."""
    at: list[int] = []
    val: list[float] = []
    for i, v in enumerate(daily):
        day = T0 + i * DAY
        for h in (8, 16, 24):
            at.append(day + h * 3600)
            val.append(float(v))
    return Points.build(at, val)


def _fx(n: int, rate: float = 1000.0) -> VintagedSeries:
    obs = (T0 + np.arange(n, dtype=np.int64) * DAY).astype(np.int64)
    return VintagedSeries.build(obs, obs + DAY, np.full(n, rate))


def test_funding_daily_is_mean_of_settlements_before_close() -> None:
    n = 3
    d = daily_signals(_bars(np.full(n, 100.0)), None, _funding(np.array([0.0001, 0.0002, 0.0003])), None)
    assert np.allclose(d.funding, [0.0001, 0.0002, 0.0003])


def test_percentile_uses_only_the_days_before_and_needs_a_sample() -> None:
    n = FUNDING_MIN_SAMPLE + 5
    daily = np.linspace(0.0, 0.001, n)  # 매일 오른다 → 앞 날들보다 늘 크다
    d = daily_signals(_bars(np.full(n, 100.0)), None, _funding(daily), None)
    assert np.isnan(d.funding_pct[FUNDING_MIN_SAMPLE - 1])  # 앞 날이 모자라다
    assert d.funding_pct[FUNDING_MIN_SAMPLE] == 1.0
    assert funding_state(float(d.funding_pct[-1])) == "long_crowded"


def test_ties_at_the_default_rate_read_as_the_middle() -> None:
    n = FUNDING_MIN_SAMPLE + 1
    d = daily_signals(_bars(np.full(n, 100.0)), None, _funding(np.full(n, 0.0001)), None)
    assert d.funding_pct[-1] == 0.5  # 1년 내내 기본 금리 — 높지도 낮지도 않다
    assert funding_state(float(d.funding_pct[-1])) == "neutral"


def test_crowding_event_is_not_repeated_within_the_gap() -> None:
    n = FUNDING_MIN_SAMPLE + 40
    daily = np.full(n, 0.0001)
    daily[FUNDING_MIN_SAMPLE + 1 : FUNDING_MIN_SAMPLE + 4] = 0.001  # 3일 쏠림
    daily[FUNDING_MIN_SAMPLE + 8] = 0.001  # 5일 뒤 다시 — 같은 국면
    daily[FUNDING_MIN_SAMPLE + 30] = 0.001  # 22일 뒤 — 새 사건
    d = daily_signals(_bars(np.full(n, 100.0)), None, _funding(daily), None)
    ev = funding_events(d)
    assert [e.kind for e in ev] == ["funding_long_crowded", "funding_long_crowded"]
    assert ev[0].event_at == int(d.at[FUNDING_MIN_SAMPLE + 1])


def test_kimchi_premium_and_three_day_confirmation() -> None:
    n = 12
    krw = np.full(n, 101_000.0)
    krw[4:] = 99_000.0  # 5일째부터 역프
    krw[9] = 101_000.0  # 하루만 김프 — 확정 아님
    t = _times(n)
    usdt = CloseSeries("BTCUSDT", t, np.full(n, 100.0))
    fx = fx_on_grid(_fx(n + 1), t.tolist())
    d = daily_signals(_bars(krw), usdt, None, fx)
    assert np.isclose(d.kimchi[0], 0.01)
    regime = kimchi_regime(d)
    assert [e.kind for e in regime.events] == ["kimchi_cross_down"]
    assert regime.events[0].event_at == int(t[4 + KIMCHI_CONFIRM_DAYS - 1])  # 확정된 날, 첫날이 아니다
    assert regime.state == -1 and regime.since == regime.events[0].event_at


def test_stale_fx_blocks_the_premium() -> None:
    n = 10
    t = _times(n)
    obs = np.array([T0], dtype=np.int64)
    fx = fx_on_grid(VintagedSeries.build(obs, obs + DAY, np.array([1000.0])), t.tolist())
    d = daily_signals(_bars(np.full(n, 100_000.0)), CloseSeries("BTCUSDT", t, np.full(n, 100.0)), None, fx)
    assert not np.isnan(d.kimchi[0])
    assert np.isnan(d.kimchi[-1])  # 환율 관측이 5일보다 오래됐다


def test_open_interest_change_needs_a_point_seven_days_back() -> None:
    hours = np.arange(0, 10 * 24, dtype=np.int64) * 3600 + T0
    pts = Points.build(hours.tolist(), [100.0] * (len(hours) - 1) + [110.0])
    o = open_interest(pts, int(hours[-1]))
    assert o is not None and o.change_7d is not None and np.isclose(o.change_7d, 0.1)
    short = Points.build(hours[:48].tolist(), [100.0] * 48)
    s = open_interest(short, int(hours[47]))
    assert s is not None and s.change_7d is None


def test_symbol_listed_after_as_of_has_no_premium() -> None:
    n = 5
    empty = CloseSeries("BTCUSDT", np.empty(0, dtype=np.int64), np.empty(0))
    d = daily_signals(_bars(np.full(n, 100.0)), empty, None, fx_on_grid(_fx(n + 1), _times(n).tolist()))
    assert np.isnan(d.kimchi).all()
