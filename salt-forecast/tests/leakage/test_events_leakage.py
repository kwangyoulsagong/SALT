"""사건 통계 — 미래 오염 (time-and-leakage.md §6). as_of 뒤의 봉 · 사건을 더해도 같은 as_of 통계는 같아야 한다."""

from datetime import UTC, datetime, timedelta

import numpy as np

from salt_forecast.domain.events import HORIZONS, ScheduledEvent, reaction, stats
from salt_forecast.domain.series import DAY, OhlcvSeries

T0 = datetime(2023, 1, 1, tzinfo=UTC)


def _bars(close: np.ndarray) -> OhlcvSeries:
    t = (int(T0.timestamp()) + np.arange(1, len(close) + 1, dtype=np.int64) * DAY).astype(np.int64)
    return OhlcvSeries("KRW-BTC", t, close.copy(), close, close, close.copy(), np.full(len(close), 1.0))


def _events(n: int) -> list[ScheduledEvent]:
    out: list[ScheduledEvent] = []
    for d in range(25, n, 30):
        at = T0 + timedelta(days=d, hours=18)
        out.append(ScheduledEvent("fomc", at, at - timedelta(days=7), "t", "x"))
    return out


def test_future_bars_and_events_do_not_change_stats() -> None:
    rng = np.random.default_rng(3)
    full = 100 * np.exp(np.cumsum(rng.normal(0, 0.03, 900)))
    as_of = T0 + timedelta(days=600)

    def compute(close: np.ndarray, events: list[ScheduledEvent]):
        bars = _bars(close)
        rs = [r for e in events if e.event_at <= as_of and (r := reaction(bars, e, as_of))]
        return [stats(bars, "fomc", rs, h, as_of) for h in HORIZONS]

    base = compute(full[:600], _events(600))
    tampered_close = full.copy()
    tampered_close[601:] *= 5.0  # as_of 뒤 봉을 크게 바꾼다
    polluted = compute(tampered_close, _events(900))
    assert base == polluted
