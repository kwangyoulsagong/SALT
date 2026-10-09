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


# 국내 주식 — 평일만, 공휴일 몇 개를 뺀다. 종가는 거래일 16:00 KST(07:00 UTC)에 공개(FC-REQ-009)
KRX_CLOSE = 7 * 3600


def krx_sessions(days: int, *, holidays_every: int = 37) -> np.ndarray:
    """T0 다음 날부터 달력 days 일 안의 평일 00:00 UTC. holidays_every 번째 평일마다 휴장(월요일 휴장도 생긴다)."""
    t = T0 + DAY * (np.arange(days, dtype=np.int64) + 1)
    weekday = ((t // DAY) + 3) % 7  # 0=월
    t = t[weekday < 5]
    keep = (np.arange(t.size) % holidays_every) != holidays_every - 1
    return t[keep]


def krx_universe(n: int, days: int, *, seed: int = 7) -> tuple[np.ndarray, dict[str, CloseSeries]]:
    sessions = krx_sessions(days)
    out: dict[str, CloseSeries] = {}
    for i in range(n):
        rng = np.random.default_rng(seed + i)
        close = 100.0 * np.exp(np.cumsum(rng.normal(0.0, 0.02, size=sessions.size)))
        out[f"{i:06d}"] = CloseSeries(f"{i:06d}", sessions + KRX_CLOSE, close)
    return sessions, out
