"""규칙 항목 · σ 는 미래 행을 보지 않는다(time-and-leakage.md §6 미래 오염). 라벨만 미래를 읽는다."""

import numpy as np

from salt_forecast.domain.labels import ewma_sigma
from salt_forecast.domain.panel import Panel
from salt_forecast.domain.rule_items import contributions
from salt_forecast.domain.series import DAY


def _panel(n: int, rng: np.random.Generator) -> Panel:
    close = 100 * np.exp(np.cumsum(rng.normal(0, 0.03, size=(n, 5)), axis=0))
    vol = rng.uniform(1, 10, size=(n, 5))
    dates = np.arange(n, dtype=np.int64) * DAY
    return Panel(
        dates, tuple(f"KRW-{i}" for i in range(5)), close * 1.02, close * 0.98, close, vol, np.zeros(5, np.int64)
    )


def _head(p: Panel, n: int) -> Panel:
    """앞 n 행만 — 같은 과거, 미래 없음."""
    return Panel(p.dates[:n], p.symbols, p.high[:n], p.low[:n], p.close[:n], p.volume[:n], p.listed_at)


def test_signals_ignore_future_rows() -> None:
    longer = _panel(160, np.random.default_rng(7))
    base = _head(longer, 120)  # 앞 120행이 같고, longer 에만 미래 40행이 있다
    fg = np.full(160, 40.0)
    wb = np.random.default_rng(1).uniform(0, 5, size=(160, 5))
    ws = np.random.default_rng(2).uniform(0, 5, size=(160, 5))
    a = contributions(base, fg[:120], wb[:120], ws[:120])
    b = contributions(longer, fg, wb, ws)
    for item, by_mode in a.by_item.items():
        for mode, m in by_mode.items():
            np.testing.assert_array_equal(m, b.by_item[item][mode][:120], err_msg=f"{item}/{mode}")
    np.testing.assert_array_equal(ewma_sigma(base), ewma_sigma(longer)[:120])
