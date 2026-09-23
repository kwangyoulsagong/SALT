"""합성 시계열 — 고정 시드. 테스트가 날짜 · 난수에 따라 바뀌면 버그다(python-style.md §6)."""

from __future__ import annotations

import numpy as np

from salt_forecast.domain.series import DAY, CloseSeries

T0 = 1_577_836_800  # 2020-01-01 00:00 UTC


def random_walk(symbol: str, days: int, *, seed: int, drift: float = 0.0, vol: float = 0.03) -> CloseSeries:
    rng = np.random.default_rng(seed)
    r = rng.normal(drift, vol, size=days)
    close = 100.0 * np.exp(np.cumsum(r))
    t = T0 + DAY * (np.arange(days, dtype=np.int64) + 1)
    return CloseSeries(symbol, t, close)


def universe(n: int, days: int, *, seed: int = 7) -> dict[str, CloseSeries]:
    return {f"S{i:03d}": random_walk(f"S{i:03d}", days, seed=seed + i) for i in range(n)}
