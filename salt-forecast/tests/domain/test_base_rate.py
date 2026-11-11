"""base-rate@1 순수 통계(FC-REQ-028 FR-2)."""

from __future__ import annotations

from datetime import date

import numpy as np
import pytest

from salt_forecast.domain.base_rate import (
    MIN_DAYS,
    Events,
    cooldown,
    describe,
    effective_n,
    finalize,
    holm,
    kr_round_trip,
    kr_sell_tax,
    krx_tick,
    rsi_threshold_price,
    wilson,
)
from salt_forecast.domain.rule_items import rsi_simple


def test_wilson_known_value() -> None:
    lo, hi = wilson(0.5, 100)
    assert lo == pytest.approx(0.4038, abs=1e-3)
    assert hi == pytest.approx(0.5962, abs=1e-3)


def test_holm_is_monotone_and_capped() -> None:
    assert holm([0.01, 0.04, 0.03]) == pytest.approx([0.03, 0.06, 0.06])
    assert holm([0.9, 0.8]) == pytest.approx([1.0, 1.0])


def test_effective_n_shrinks_when_same_day_outcomes_move_together() -> None:
    days = np.repeat(np.arange(50, dtype=np.int64), 10)
    together = np.repeat((np.arange(50) % 2).astype(np.float64), 10)  # 같은 날은 전부 같은 결과
    rng = np.random.default_rng(7)
    independent = (rng.random(500) > 0.5).astype(np.float64)
    assert effective_n(together, days) == pytest.approx(50, rel=0.05)  # 사실상 날 수
    assert effective_n(independent, days) > 400


def test_below_min_hides_numbers() -> None:
    day = np.arange(MIN_DAYS - 1, dtype=np.int64)
    ev = Events(day, np.full(day.size, 0.01), np.full(day.size, 0.02))
    s = describe(ev, recent_from_day=0)
    assert s.status == "below_min"
    assert s.up_rate is None and s.q10 is None and s.hold_q50 is None
    assert s.sample == MIN_DAYS - 1


def test_ok_row_has_net_and_gross_separately() -> None:
    rng = np.random.default_rng(1)
    day = np.arange(300, dtype=np.int64)
    gross = rng.normal(0.002, 0.02, 300)
    ev = Events(day, gross - 0.003, gross)
    s = describe(ev, recent_from_day=10**9)
    assert s.status == "ok"
    assert s.up_rate == pytest.approx(float((gross - 0.003 > 0).mean()))
    assert s.hold_up_rate == pytest.approx(float((gross > 0).mean()))
    assert s.up_low is not None and s.up_high is not None and s.up_rate is not None
    assert s.up_low < s.up_rate < s.up_high
    assert s.recent_differs is None  # 최근 표본 없음


def test_differs_only_for_tested_and_holm_passing() -> None:
    rng = np.random.default_rng(3)
    day = np.arange(2000, dtype=np.int64)
    usual = describe(Events(day, rng.normal(0, 1, 2000), rng.normal(0, 1, 2000)), 10**9)
    much_higher = describe(Events(day, np.abs(rng.normal(0, 1, 2000)) + 0.1, rng.normal(0, 1, 2000)), 10**9)
    described = describe(Events(day, np.abs(rng.normal(0, 1, 2000)) + 0.1, rng.normal(0, 1, 2000)), 10**9)
    out = finalize([usual, much_higher, described], [False, True, False], usual.up_rate)
    assert out[0].differs is None and out[0].p_holm is None
    assert out[1].differs == "higher"
    assert out[2].differs is None  # 서술 조건은 검정 밖
    assert out[1].up_rate_shrunk is not None and usual.up_rate is not None
    assert usual.up_rate < out[1].up_rate_shrunk < 1.0  # 평소 쪽으로 당겨진다


def test_cooldown_keeps_first_event_per_window() -> None:
    rows = np.zeros((10, 2), dtype=np.bool_)
    rows[[0, 1, 2, 5, 6], 0] = True
    rows[[3, 9], 1] = True
    out = cooldown(rows, 5)
    assert np.flatnonzero(out[:, 0]).tolist() == [0, 5]
    assert np.flatnonzero(out[:, 1]).tolist() == [3, 9]  # 9 − 3 = 6 ≥ 5


@pytest.mark.parametrize(("price", "tick"), [(1_999, 1), (2_000, 5), (19_990, 10), (55_000, 100), (600_000, 1_000)])
def test_krx_tick_bands(price: float, tick: float) -> None:
    assert krx_tick(price) == tick


def test_kr_cost_uses_sell_day_tax_like_server_table() -> None:
    assert kr_sell_tax(date(2024, 12, 31)) == 0.0018
    assert kr_sell_tax(date(2025, 1, 2)) == 0.0015
    assert kr_sell_tax(date(2026, 3, 1)) == 0.002
    assert kr_round_trip(date(2026, 3, 1), 10_000) == pytest.approx(0.000186 * 2 + 0.002 + 10 / 10_000)


def test_rsi_threshold_matches_rsi_simple_on_the_next_bar() -> None:
    rng = np.random.default_rng(11)
    close = 100 * np.exp(np.cumsum(rng.normal(0, 0.02, 40)))
    d = np.diff(close)[-13:]
    at = rsi_threshold_price(float(close[-1]), float(d[d > 0].sum()), float(-d[d < 0].sum()))

    def rsi_with(next_price: float) -> float:
        series = np.append(close, next_price)[:, None]
        return float(rsi_simple(series)[-1, 0])

    assert rsi_with(at * 1.0001) >= 70
    if at > close[-1] * 1.0001:
        assert rsi_with(at * 0.9999) < 70
