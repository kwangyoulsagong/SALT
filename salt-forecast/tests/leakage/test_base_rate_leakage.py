"""base-rate@1 미래 오염 — as_of 뒤 봉을 더해도 같은 as_of 의 기저율 · 문턱이 같다(time-and-leakage.md §6)."""

from __future__ import annotations

from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.scoring.base_rate import MarketRun, run_crypto, run_kr

KR_CLOSE = 7 * 3600


def _series(n_sym: int, rows: int, seed: int, offset: int, price: float, vol: float) -> dict[str, OhlcvSeries]:
    rng = np.random.default_rng(seed)
    out: dict[str, OhlcvSeries] = {}
    t = np.arange(rows, dtype=np.int64) * DAY + 18_000 * DAY + offset
    for j in range(n_sym):
        c = price * np.exp(np.cumsum(rng.normal(0, 0.04, rows)))
        o = c * np.exp(rng.normal(0, 0.02, rows))
        v = rng.uniform(0.5, 1.5, rows) * vol * (1 + j)
        out[f"S{j:02d}"] = OhlcvSeries(f"S{j:02d}", t, o, c * 1.02, c * 0.98, c, v)
    return out


def _fingerprint(run: MarketRun) -> list[object]:
    stats = [(r.condition_id, r.horizon, r.stat, r.verdict) for r in run.stats]
    trig = sorted((t.symbol, t.condition_id, t.applies_to, t.ref_close, t.ref_at, t.price_at_least, t.price_at_most,
                   t.open_at_least, t.value_at_least) for t in run.triggers)  # fmt: skip
    return [run.window, stats, trig]


def test_crypto_future_bars_do_not_change_past_as_of() -> None:
    full = _series(25, 400, 1, 0, 1_000.0, 1e6)
    as_of = datetime.fromtimestamp(int(full["S00"].available_at[300]), tz=UTC)
    cut = {s: o.as_of(int(as_of.timestamp())) for s, o in full.items()}
    a = run_crypto(cut, as_of)
    b = run_crypto(full, as_of)
    assert _fingerprint(a) == _fingerprint(b)
    assert a.triggers  # 빈 결과끼리 같은 것은 시험이 아니다


def test_kr_future_bars_do_not_change_past_as_of() -> None:
    full = _series(25, 400, 2, KR_CLOSE, 20_000.0, 2e5)  # 2만원 × 20만주 × (1+j) ≥ 10억 → 대상
    as_of = datetime.fromtimestamp(int(full["S00"].available_at[330]), tz=UTC)
    start = datetime.fromtimestamp(int(full["S00"].available_at[0]), tz=UTC)
    cut = {s: o.as_of(int(as_of.timestamp())) for s, o in full.items()}
    a = run_kr(cut, start, as_of)
    b = run_kr(full, start, as_of)
    assert _fingerprint(a) == _fingerprint(b)
    assert a.triggers
