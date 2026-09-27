"""시장 신호 — 미래 오염 (time-and-leakage.md §6).

as_of 뒤의 봉 · 정산 · 환율을 바꿔도 as_of 까지의 값 · 사건은 같다.
"""

from datetime import UTC, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.series import DAY, CloseSeries, OhlcvSeries
from salt_forecast.domain.signals import (
    DailySignals,
    KimchiRegime,
    Points,
    SignalEvent,
    daily_signals,
    funding_events,
    fx_on_grid,
    kimchi_regime,
)

T0 = int(datetime(2023, 1, 1, tzinfo=UTC).timestamp())
N = 700
CUT = 500


def _compute(
    krw: NDArray[np.float64],
    usd: NDArray[np.float64],
    funding: NDArray[np.float64],
    fx: NDArray[np.float64],
    as_of: int,
) -> tuple[DailySignals, list[SignalEvent], KimchiRegime]:
    t = (T0 + np.arange(1, N + 1, dtype=np.int64) * DAY).astype(np.int64)
    bars = OhlcvSeries("KRW-BTC", t, krw, krw, krw, krw, np.ones(N)).as_of(as_of)
    usdt = CloseSeries("BTCUSDT", t, usd).as_of(as_of)
    f_at = np.repeat(T0 + np.arange(N, dtype=np.int64) * DAY, 3) + np.tile([8, 16, 24], N) * 3600
    f = Points.build(
        [int(x) for x in f_at if x <= as_of],
        [float(v) for x, v in zip(f_at, np.repeat(funding, 3), strict=True) if x <= as_of],
    )
    obs = (T0 + np.arange(N, dtype=np.int64) * DAY).astype(np.int64)
    grid = fx_on_grid(VintagedSeries.build(obs, obs + DAY, fx), [int(x) for x in bars.available_at])
    d = daily_signals(bars, usdt, f, grid)
    return d, funding_events(d), kimchi_regime(d)


def test_future_rows_do_not_change_past_signals() -> None:
    rng = np.random.default_rng(7)
    usd = 100 * np.exp(np.cumsum(rng.normal(0, 0.03, N)))
    fx = 1300 + np.cumsum(rng.normal(0, 3, N))
    krw = usd * fx * (1 + rng.normal(0.01, 0.015, N))
    funding = rng.normal(0.0001, 0.0001, N)
    as_of = T0 + CUT * DAY

    d1, f1, k1 = _compute(krw, usd, funding, fx, as_of)
    tampered = [a.copy() for a in (krw, usd, funding, fx)]
    for a in tampered:
        a[CUT:] *= 3.0  # as_of 뒤를 크게 바꾼다
    d2, f2, k2 = _compute(tampered[0], tampered[1], tampered[2], tampered[3], as_of)

    assert np.array_equal(d1.funding_pct, d2.funding_pct, equal_nan=True)
    assert np.array_equal(d1.kimchi, d2.kimchi, equal_nan=True)
    assert f1 == f2 and k1 == k2
