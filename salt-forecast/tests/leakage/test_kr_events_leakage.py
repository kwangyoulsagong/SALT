"""국내 사건 통계 — 미래 오염 (time-and-leakage.md §6). as_of 뒤의 봉 · 사건 · 끊김을 더해도 같은 as_of 통계는 같다."""

from datetime import UTC, date, datetime, timedelta

import numpy as np

from salt_forecast.domain.calendar import KRX_CLOSE_AVAILABLE
from salt_forecast.domain.events import HORIZONS, ScheduledEvent, reaction, scheduled, stats
from salt_forecast.domain.kr_breaks import up_limit_breaks
from salt_forecast.domain.series import OhlcvSeries


def _days(n: int) -> list[date]:
    out: list[date] = []
    d = date(2022, 1, 3)
    while len(out) < n:
        if d.weekday() < 5:
            out.append(d)
        d += timedelta(days=1)
    return out


DAYS = _days(900)
T = np.array(
    [int(datetime(d.year, d.month, d.day, tzinfo=UTC).timestamp()) + KRX_CLOSE_AVAILABLE for d in DAYS], dtype=np.int64
)


def _bars(close: np.ndarray) -> OhlcvSeries:
    n = close.size
    return OhlcvSeries("005930", T[:n], close.copy(), close, close, close.copy(), np.full(n, 1.0))


def _events(n: int) -> list[ScheduledEvent]:
    return [scheduled("kr_bok_rate", DAYS[i], "t", "x") for i in range(25, n, 30)]


def test_future_bars_breaks_and_events_do_not_change_stats() -> None:
    rng = np.random.default_rng(11)
    full = 100 * np.exp(np.cumsum(rng.normal(0, 0.02, 900)))
    as_of = datetime(DAYS[600].year, DAYS[600].month, DAYS[600].day, tzinfo=UTC)

    def compute(close: np.ndarray, events: list[ScheduledEvent]):
        bars = _bars(close)
        cum = np.cumsum(up_limit_breaks(close)).astype(np.int64)
        rs = [r for e in events if e.event_at <= as_of and (r := reaction(bars, e, as_of, cum))]
        return [stats(bars, "kr_bok_rate", rs, h, as_of, cum) for h in HORIZONS]

    base = compute(full[:600], _events(600))
    tampered = full.copy()
    tampered[620:] *= 10.0  # as_of 뒤 병합 끊김 + 큰 변화
    polluted = compute(tampered, _events(900))
    assert base == polluted
