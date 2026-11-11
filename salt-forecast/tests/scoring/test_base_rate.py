"""base-rate@1 — 라이브 문턱 = 다음 봉의 과거 조건 정의(서버가 숫자 비교만 해도 같은 답이 나와야 한다)."""

from __future__ import annotations

import numpy as np
import pytest

from salt_forecast.domain.base_rate import Trigger
from salt_forecast.domain.panel import Panel
from salt_forecast.domain.series import DAY
from salt_forecast.scoring.base_rate import crypto_masks, crypto_triggers, crypto_universe, kr_masks, kr_triggers

N_SYM = 30


def _panel(rows: int, seed: int) -> Panel:
    rng = np.random.default_rng(seed)
    close = 10_000 * np.exp(np.cumsum(rng.normal(0, 0.02, (rows, N_SYM)), axis=0))
    volume = rng.uniform(1e5, 1e6, (rows, N_SYM)) * (1 + np.arange(N_SYM))[None, :]  # 종목마다 거래대금 순위가 다르다
    dates = np.arange(rows, dtype=np.int64) * DAY + 10 * DAY
    syms = tuple(f"S{j:02d}" for j in range(N_SYM))
    return Panel(dates, syms, close * 1.01, close * 0.99, close, volume, np.zeros(N_SYM, np.int64), close.copy())


def _append(p: Panel, j: int, price: float, *, open_: float | None = None, value: float | None = None) -> Panel:
    """다음 봉 하나 — 종목 j 는 price, 나머지는 어제 종가 그대로(같은 날 대상 · 순위가 그대로 정해지게)."""
    last = p.close[-1].copy()
    nxt = last.copy()
    nxt[j] = price
    vol = p.volume[-1].copy()
    if value is not None:
        vol[j] = value / price
    op = last.copy()
    if open_ is not None:
        op[j] = open_
    assert p.open is not None
    return Panel(
        np.append(p.dates, p.dates[-1] + DAY), p.symbols, np.vstack([p.high, nxt]), np.vstack([p.low, nxt]),
        np.vstack([p.close, nxt]), np.vstack([p.volume, vol]), p.listed_at, np.vstack([p.open, op]),
    )  # fmt: skip


def _pick(triggers: list[Trigger], cid: str) -> Trigger:
    return next(t for t in triggers if t.condition_id == cid and t.applies_to == "next")


def _bound(t: Trigger) -> tuple[float, int]:
    if t.price_at_least is not None:
        return t.price_at_least, +1
    assert t.price_at_most is not None
    return t.price_at_most, -1


@pytest.mark.parametrize("cid", ["C1", "C2", "C3S", "C3L", "C8"])
def test_crypto_threshold_is_next_bar_condition(cid: str) -> None:
    p = _panel(60, 5)
    trig = crypto_triggers(p)
    t = _pick(trig, cid)
    j = p.symbols.index(t.symbol)
    bound, side = _bound(t)
    inside, outside = bound * (1 + 1e-6 * side), bound * (1 - 1e-6 * side)
    for price, expect in ((inside, True), (outside, False)):
        q = _append(p, j, price)
        assert bool(crypto_masks(q, crypto_universe(q))[cid][-1, j]) is expect, (cid, price, bound)


def _kr_universe(p: Panel) -> np.ndarray:
    return ~np.isnan(p.close)


@pytest.mark.parametrize("cid", ["K1", "K4", "K8"])
def test_kr_price_threshold_is_next_bar_condition(cid: str) -> None:
    p = _panel(60, 9)
    t = _pick(kr_triggers(p, _kr_universe(p)), cid)
    j = p.symbols.index(t.symbol)
    bound, side = _bound(t)
    for price, expect in ((bound * (1 + 1e-6 * side), True), (bound * (1 - 1e-6 * side), False)):
        q = _append(p, j, price)
        assert bool(kr_masks(q, _kr_universe(q))[cid][-1, j]) is expect, (cid, price, bound)


def test_kr_k2_needs_price_and_value() -> None:
    p = _panel(60, 13)
    t = _pick(kr_triggers(p, _kr_universe(p)), "K2")
    j = p.symbols.index(t.symbol)
    assert t.price_at_least is not None and t.value_at_least is not None
    hi_price, hi_value = t.price_at_least * 1.0001, t.value_at_least * 1.0001
    assert kr_masks(q := _append(p, j, hi_price, value=hi_value), _kr_universe(q))["K2"][-1, j]
    assert not kr_masks(q := _append(p, j, hi_price, value=t.value_at_least * 0.999), _kr_universe(q))["K2"][-1, j]


def test_kr_k3_is_open_gap() -> None:
    base = _panel(60, 17)
    before = Panel(
        base.dates + 20_000 * DAY, base.symbols, base.high, base.low, base.close, base.volume, base.listed_at, base.open
    )  # 2024-10 — 대체거래소 전
    p = Panel(
        base.dates + 20_200 * DAY, base.symbols, base.high, base.low, base.close, base.volume, base.listed_at, base.open
    )  # 2025-04 — 뒤
    t = _pick(kr_triggers(p, _kr_universe(p)), "K3")
    j = p.symbols.index(t.symbol)
    assert t.open_at_least is not None
    last = float(p.close[-1, j])
    assert kr_masks(q := _append(p, j, last, open_=t.open_at_least * 1.0001), _kr_universe(q))["K3"][-1, j]
    assert not kr_masks(q := _append(p, j, last, open_=t.open_at_least * 0.999), _kr_universe(q))["K3"][-1, j]
    gap = _append(before, j, last, open_=t.open_at_least * 1.5)
    assert not kr_masks(gap, _kr_universe(gap))["K3"].any()  # 2025-03-04 전 시가 갭은 다른 뜻 — 섞지 않는다


def test_kr_k6_only_after_two_down_days() -> None:
    p = _panel(60, 21)
    c = p.close.copy()
    c[-2, 0], c[-1, 0] = c[-3, 0] * 0.97, c[-3, 0] * 0.94  # 종목 0 은 이틀 내림
    c[-2, 1], c[-1, 1] = c[-3, 1] * 1.01, c[-3, 1] * 0.99  # 종목 1 은 아님
    p = Panel(p.dates, p.symbols, c, c, c, p.volume, p.listed_at, c.copy())
    trig = kr_triggers(p, _kr_universe(p))
    k6 = {t.symbol for t in trig if t.condition_id == "K6"}
    assert "S00" in k6 and "S01" not in k6
    t = next(t for t in trig if t.condition_id == "K6" and t.symbol == "S00")
    assert t.price_at_most is not None
    assert kr_masks(q := _append(p, 0, t.price_at_most * 0.9999), _kr_universe(q))["K6"][-1, 0]
    assert not kr_masks(q := _append(p, 0, t.price_at_most * 1.001), _kr_universe(q))["K6"][-1, 0]


def test_triggers_carry_last_bar_time() -> None:
    p = _panel(60, 3)
    assert {t.ref_at for t in crypto_triggers(p)} == {int(p.dates[-1])}
