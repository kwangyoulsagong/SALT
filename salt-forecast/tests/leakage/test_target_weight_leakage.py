"""목표 비중 — 미래 오염 (time-and-leakage.md §6). 리밸런스 날 t 의 목표는 t 뒤 봉을 바꿔도 같다."""

from __future__ import annotations

from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.labels import ewma_sigma
from salt_forecast.domain.panel import build_panel
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.scoring.target_weight import alt_universe, monday_rows, target_matrix

T0 = int(datetime(2021, 1, 1, tzinfo=UTC).timestamp())
N = 400
SYMS = ("KRW-BTC", "KRW-ETH", *(f"KRW-A{i:02d}" for i in range(14)))


def _ohlcv(seed: int, tamper_from: int | None = None) -> dict[str, OhlcvSeries]:
    rng = np.random.default_rng(seed)
    noise = np.random.default_rng(seed + 1)  # 미래를 흔드는 난수는 따로 — 과거 봉이 같은 난수를 받게
    out: dict[str, OhlcvSeries] = {}
    for k, s in enumerate(SYMS):
        r = rng.normal(0, 0.03 + 0.01 * k, N)
        v = rng.uniform(1, 100, N)
        if tamper_from is not None:
            r[tamper_from:] = noise.normal(0, 0.5, N - tamper_from)
            v[tamper_from:] = noise.uniform(1e6, 1e7, N - tamper_from)
        c = 100 * np.exp(np.cumsum(r))
        t = T0 + DAY * np.arange(1, N + 1, dtype=np.int64)
        out[s] = OhlcvSeries(s, t, c, c * 1.01, c * 0.99, c, v)
    return out


def test_future_bars_do_not_change_targets() -> None:
    cut = 300
    base, tampered = _ohlcv(5), _ohlcv(5, tamper_from=cut)
    pa = build_panel(base, T0, T0 + N * DAY)
    pb = build_panel(tampered, T0, T0 + N * DAY)
    rows = monday_rows(pa.dates)
    rows[cut - 1 :] = False  # 행 cut 은 봉 cut(0-기준 cut−1 뒤)부터 바뀐다
    for universe in ("core", "core_alts"):
        a = target_matrix(pa, ewma_sigma(pa) * np.sqrt(365), rows, 0.2, universe, 0.6)
        b = target_matrix(pb, ewma_sigma(pb) * np.sqrt(365), rows, 0.2, universe, 0.6)
        np.testing.assert_array_equal(a, b)
    t = int(np.flatnonzero(rows)[-1])
    assert alt_universe(pa, t) == alt_universe(pb, t)
