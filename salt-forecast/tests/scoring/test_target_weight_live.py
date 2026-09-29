"""core 모델 포트폴리오 라이브 원장(FC-REQ-013) — 합성 봉. DB 없음."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import numpy as np
import pytest

from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.domain.target_weight import target_weights
from salt_forecast.scoring.target_weight import TARGETS
from salt_forecast.scoring.target_weight_live import (
    LIVE_START,
    live_panel,
    outcome_rows,
    summaries,
    weight_rows,
)

T0 = int(datetime(2026, 6, 1, tzinfo=UTC).timestamp())


def _ohlcv(n: int, seed: int = 3, tamper_from: int | None = None) -> dict[str, OhlcvSeries]:
    rng = np.random.default_rng(seed)
    noise = np.random.default_rng(seed + 1)
    out: dict[str, OhlcvSeries] = {}
    for k, s in enumerate(("KRW-BTC", "KRW-ETH")):
        r = rng.normal(0, 0.02 + 0.01 * k, n)
        if tamper_from is not None:
            r[tamper_from:] = noise.normal(0, 0.3, n - tamper_from)
        c = 100 * np.exp(np.cumsum(r))
        t = T0 + DAY * np.arange(1, n + 1, dtype=np.int64)
        out[s] = OhlcvSeries(s, t, c, c, c, c, np.ones(n))
    return out


def _at(days_after_start: int) -> datetime:
    return LIVE_START + timedelta(days=days_after_start)


def test_nothing_before_live_start() -> None:
    as_of = LIVE_START - timedelta(hours=1)
    p = live_panel(_ohlcv(200), as_of)
    assert weight_rows(p, as_of) == []


def test_weights_follow_registered_rule_and_start_on_first_monday() -> None:
    as_of = _at(8)
    p = live_panel(_ohlcv(200), as_of)
    rows = weight_rows(p, as_of)
    assert {r.rebalance_at for r in rows} == {LIVE_START, _at(7)}
    assert len(rows) == 2 * len(TARGETS)
    r = next(r for r in rows if r.target == 0.15 and r.rebalance_at == LIVE_START)
    sig = np.array([r.sigma["KRW-BTC"], r.sigma["KRW-ETH"]])
    np.testing.assert_allclose([r.weights["KRW-BTC"], r.weights["KRW-ETH"]], target_weights(sig, 0.15))


def test_future_bars_do_not_change_recorded_weights() -> None:
    as_of = _at(21)
    cut = int((int(_at(8).timestamp()) - T0) // DAY)  # 두 번째 리밸런스(_at(7)) 뒤 봉부터 흔든다
    a = weight_rows(live_panel(_ohlcv(200), as_of), _at(7))
    b = weight_rows(live_panel(_ohlcv(200, tamper_from=cut), as_of), _at(7))
    assert [(x.target, x.rebalance_at, x.weights) for x in a] == [(x.target, x.rebalance_at, x.weights) for x in b]


def test_outcome_only_after_week_closes_and_late_is_flagged() -> None:
    p = live_panel(_ohlcv(200), _at(14))
    ws = weight_rows(p, _at(14))
    rec = {(w.target, w.rebalance_at): w.rebalance_at + timedelta(hours=2) for w in ws}
    rec[(0.15, LIVE_START)] = LIVE_START + timedelta(hours=30)
    out = outcome_rows(p, ws, rec, _at(10))
    assert {o.rebalance_at for o in out} == {LIVE_START}
    status = {o.target: o.status for o in out}
    assert status[0.15] == "late"
    assert status[0.10] == "ok"


def test_week_return_is_weighted_simple_return_minus_cost() -> None:
    data = _ohlcv(200)
    p = live_panel(data, _at(7))
    ws = [w for w in weight_rows(p, _at(7)) if w.rebalance_at == LIVE_START and w.target == 0.2]
    rec = {(w.target, w.rebalance_at): w.rebalance_at for w in ws}
    (o,) = outcome_rows(p, ws, rec, _at(7))
    gross = sum(ws[0].weights[s] * o.returns[s] for s in ("KRW-BTC", "KRW-ETH"))
    cost = 0.0005 * sum(ws[0].weights.values())  # 첫 주는 현금에서 맞춘다
    assert o.strategy_log_return == pytest.approx(np.log1p(gross - cost))
    assert o.cost == pytest.approx(cost)


def test_summary_row_exists_with_zero_weeks_and_excludes_late() -> None:
    p = live_panel(_ohlcv(200), _at(14))
    ws = weight_rows(p, _at(14))
    rec = {(w.target, w.rebalance_at): w.rebalance_at for w in ws}
    rec[(0.3, LIVE_START)] = LIVE_START + timedelta(days=2)
    out = outcome_rows(p, ws, rec, _at(14))
    summ = {s.target: s for s in summaries(ws, out, {(w.target, w.rebalance_at): w.exposure for w in ws})}
    assert summ[0.3].summary.n_weeks == 1 and summ[0.3].n_excluded == 1
    assert summ[0.1].summary.n_weeks == 2
    zero = summaries(weight_rows(p, _at(1)), [], {})
    assert all(s.summary.n_weeks == 0 and s.as_of == LIVE_START for s in zero)


def test_monday_without_bar_is_not_recorded_yet() -> None:
    n = int((int(_at(7).timestamp()) - T0) // DAY) - 1  # 두 번째 월요일 봉 직전까지만 있다
    as_of = _at(8)
    rows = weight_rows(live_panel(_ohlcv(n), as_of), as_of)
    assert {r.rebalance_at for r in rows} == {LIVE_START}
