"""국내 시장 대용(동일가중) — 시점 고정 구성 · 끊김 제외 · 미래 오염 없음 (FC-REQ-021 FR-6)."""

import numpy as np

from salt_forecast.domain.kr_market_proxy import SYMBOL, equal_weight_index
from salt_forecast.domain.kr_universe import LiquidityRule
from salt_forecast.domain.series import DAY, OhlcvSeries

RULE = LiquidityRule(window_sessions=3, min_turnover_krw=1_000.0, min_bars=5)


def _bars(sym: str, close: list[float], volume: float = 100.0, start: int = 0) -> OhlcvSeries:
    c = np.asarray(close)
    t = (np.arange(start, start + c.size, dtype=np.int64) + 1) * DAY + 7 * 3600
    return OhlcvSeries(sym, t, c.copy(), c, c, c.copy(), np.full(c.size, volume))


def test_constituents_need_history_and_liquidity_before_the_day() -> None:
    up = _bars("A", [10.0] * 6 + [11.0, 12.1])  # 6 봉 뒤 +10% 두 번
    flat = _bars("B", [10.0] * 8)
    thin = _bars("C", [10.0] * 6 + [20.0, 20.0], volume=1.0)  # 거래대금 미달 — 들어가지 않는다
    idx = equal_weight_index({"A": up, "B": flat, "C": thin}, RULE)
    assert idx.symbol == SYMBOL and np.isnan(idx.volume).all()
    r = idx.close[1:] / idx.close[:-1] - 1.0
    # A · B 동일가중: (0.1 + 0) / 2
    assert np.allclose(r[-2:], [0.05, 0.05])


def test_break_day_is_excluded() -> None:
    a = _bars("A", [10.0] * 6 + [100.0, 100.0])  # ×10 = 병합 끊김
    b = _bars("B", [10.0] * 6 + [10.5, 10.5])
    idx = equal_weight_index({"A": a, "B": b}, RULE)
    r = idx.close[1:] / idx.close[:-1] - 1.0
    assert np.isclose(r[-2], 0.05)  # A 의 끊김 날은 빠지고 B 만


def test_future_bars_do_not_change_past_index() -> None:
    rng = np.random.default_rng(2)
    base = {s: list(100 * np.exp(np.cumsum(rng.normal(0, 0.02, 30)))) for s in "ABCD"}
    short = equal_weight_index({s: _bars(s, v[:20]) for s, v in base.items()}, RULE)
    full = equal_weight_index({s: _bars(s, v) for s, v in base.items()}, RULE)
    n = short.available_at.size
    assert np.array_equal(full.available_at[:n], short.available_at)
    assert np.allclose(full.close[:n], short.close)
