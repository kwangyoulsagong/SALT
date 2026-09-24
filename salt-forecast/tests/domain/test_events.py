from datetime import UTC, datetime, timedelta

import numpy as np

from salt_forecast.domain.events import MIN_SAMPLE, ScheduledEvent, reaction, stats
from salt_forecast.domain.series import DAY, OhlcvSeries

T0 = datetime(2024, 1, 1, tzinfo=UTC)


def _bars(close: np.ndarray) -> OhlcvSeries:
    # available_at = 봉 마감(다음 날 00:00 UTC)
    t = (int(T0.timestamp()) + np.arange(1, len(close) + 1, dtype=np.int64) * DAY).astype(np.int64)
    return OhlcvSeries("KRW-BTC", t, close.copy(), close * 1.01, close * 0.99, close.copy(), np.full(len(close), 10.0))


def _event(day: int, kind: str = "cpi") -> ScheduledEvent:
    at = T0 + timedelta(days=day, hours=12, minutes=30)
    return ScheduledEvent(kind, at, at - timedelta(days=7), "test", "x")


def test_reference_is_last_bar_closed_before_the_release() -> None:
    close = np.arange(100.0, 160.0)
    bars = _bars(close)
    r = reaction(bars, _event(30), T0 + timedelta(days=59))
    assert r is not None
    # 30일 12:30 발표 → 30일 00:00 에 닫힌 봉(인덱스 29, 종가 129)이 기준. 발표가 든 봉은 인덱스 30
    assert r.ref_index == 29
    assert r.returns[1] == close[30] / close[29] - 1
    assert r.pre_return_5d == close[29] / close[24] - 1


def test_return_is_none_until_its_bar_closes() -> None:
    bars = _bars(np.arange(100.0, 160.0))
    r = reaction(bars, _event(30), T0 + timedelta(days=33))
    assert r is not None
    assert r.returns[1] is not None and r.returns[5] is None and r.returns[20] is None


def test_gate_blocks_small_samples() -> None:
    rng = np.random.default_rng(1)
    bars = _bars(100 * np.exp(np.cumsum(rng.normal(0, 0.02, 200))))
    as_of = T0 + timedelta(days=199)
    reactions = [r for d in range(30, 30 + 7 * (MIN_SAMPLE - 1), 7) if (r := reaction(bars, _event(d), as_of))]
    s = stats(bars, "cpi", reactions, 1, as_of)
    assert not s.renderable and s.blocked_reason == "insufficient_sample" and s.quantiles is None


def test_misses_use_only_events_before_each_event() -> None:
    """마지막 사건만 크게 튀게 만든다 — 그 사건은 앞 사건들의 범위로 채점돼 빗나감이어야 한다."""
    n = 400
    rng = np.random.default_rng(5)
    bars_close = 100 * np.exp(np.cumsum(rng.normal(0, 0.01, n)))
    days = list(range(30, 30 + 12 * 25, 25))
    last = days[-1]
    bars_close[last:] *= 1.3  # 마지막 발표일 봉에서 30% 점프
    bars = _bars(bars_close)
    as_of = T0 + timedelta(days=n - 1)
    reactions = [r for d in days if (r := reaction(bars, _event(d), as_of))]
    s = stats(bars, "cpi", reactions, 1, as_of)
    assert s.sample == len(days)
    newest = s.recent_misses[-1]
    assert newest["eventAt"] == _event(last).event_at.isoformat()
    assert float(newest["realized"]) > float(newest["high"])  # type: ignore[arg-type]
    assert s.renderable and s.move_ratio is not None
