"""국내 척도 도전자 누수 테스트(사전등록 `kr-scale@1`, time-and-leakage.md §6).

패널은 미래 일봉까지 들고 있다 — 위치 자르기가 시점 고정을 지키는지 미래를 바꿔 본다.
"""

from __future__ import annotations

from collections.abc import Mapping

import numpy as np

from salt_forecast.domain.calendar import KrxSessions
from salt_forecast.domain.kr_universe import LiquidityRule, eligible_at
from salt_forecast.domain.series import CloseSeries, OhlcvSeries
from salt_forecast.models.engine import WalkForward
from salt_forecast.models.kr_scale import KR_SCALE_MODELS, KrScalePanel, scale_providers
from salt_forecast.models.kr_stock import KR_BASELINE, kr_providers
from tests.synthetic import KRX_CLOSE, krx_sessions

DAYS = 1100
RULE = LiquidityRule(min_bars=120)


def _bars(n: int, sessions: np.ndarray, seed: int = 11) -> dict[str, OhlcvSeries]:
    """종목마다 변동성이 천천히 바뀌는 합성 OHLCV — HAR 가 배울 것이 있게."""
    out: dict[str, OhlcvSeries] = {}
    t = sessions.size
    for i in range(n):
        rng = np.random.default_rng(seed + i)
        log_sig = np.cumsum(rng.normal(0, 0.05, t)) * 0.3 + np.log(0.01 + 0.002 * i)
        r = rng.normal(0, 1, t) * np.exp(log_sig)
        close = 1000.0 * np.exp(np.cumsum(r))
        prev = np.concatenate([[1000.0], close[:-1]])
        open_ = prev * np.exp(rng.normal(0, 0.3, t) * np.exp(log_sig))
        high = np.maximum(open_, close) * np.exp(np.abs(rng.normal(0, 0.5, t)) * np.exp(log_sig))
        low = np.minimum(open_, close) * np.exp(-np.abs(rng.normal(0, 0.5, t)) * np.exp(log_sig))
        out[f"{i:06d}"] = OhlcvSeries(f"{i:06d}", sessions + KRX_CLOSE, open_, high, low, close, np.full(t, 2e6))
    return out


def _closes(bars: Mapping[str, OhlcvSeries]) -> dict[str, CloseSeries]:
    return {s: CloseSeries(s, b.available_at, b.close) for s, b in bars.items()}


def _wf(bars: dict[str, OhlcvSeries], cal: KrxSessions) -> WalkForward:
    def eligible(t: int) -> frozenset[str]:
        return eligible_at(bars, cal, t, RULE)

    panel = KrScalePanel(bars, cal, eligible, (1, 2, 3, 4))
    providers = {KR_BASELINE: kr_providers(cal)[KR_BASELINE], **scale_providers(panel)}
    return WalkForward(_closes(bars), providers, schedule=cal, eligible=eligible)


def _snapshot(wf: WalkForward, as_of: int) -> list[tuple[str, int, str, tuple[float, ...], float]]:
    return sorted(
        (e.symbol, e.horizon_weeks, e.model_version, e.forecast.q, e.scale)
        for e in wf.emit(as_of, with_realized=False)
        if e.model_version in KR_SCALE_MODELS
    )


def _tamper(bars: dict[str, OhlcvSeries], after: int, factor: float) -> dict[str, OhlcvSeries]:
    out: dict[str, OhlcvSeries] = {}
    for s, b in bars.items():
        k = np.where(b.available_at > after, factor, 1.0)
        # 미래 봉의 범위 · 수익률 · 거래량을 크게 흔든다
        out[s] = OhlcvSeries(s, b.available_at, b.open * k, b.high * k * k, b.low / k, b.close * k**1.5, b.volume * k)
    return out


def test_future_bars_do_not_change_scale_forecasts() -> None:
    sessions = krx_sessions(DAYS)
    cal = KrxSessions(sessions)
    bars = _bars(24, sessions)
    as_of = cal.grid(0, 2**62)[-30]
    a = _snapshot(_wf(bars, cal), as_of)
    assert {m for _, _, m, _, _ in a} == set(KR_SCALE_MODELS)
    assert a == _snapshot(_wf(_tamper(bars, as_of, 3.0), cal), as_of)


def test_same_day_bar_is_not_used_before_16_kst() -> None:
    sessions = krx_sessions(DAYS)
    cal = KrxSessions(sessions)
    bars = _bars(20, sessions)
    as_of = cal.grid(0, 2**62)[-25]
    same_day = _tamper(bars, as_of + KRX_CLOSE - 1, 4.0)  # as_of 당일 봉(16:00 공개)부터 흔든다
    a = _snapshot(_wf(bars, cal), as_of)
    assert a and a == _snapshot(_wf(same_day, cal), as_of)


def test_fit_rows_labels_end_before_as_of() -> None:
    sessions = krx_sessions(DAYS)
    cal = KrxSessions(sessions)
    bars = _bars(12, sessions)
    panel = KrScalePanel(bars, cal, lambda t: frozenset(bars), (1, 4))
    as_of = cal.grid(0, 2**62)[-20]
    for h in (1, 4):
        fit = panel.fit(as_of, h, scale_providers(panel)["kr-har@0.1.0"].spec)
        assert fit is not None
        hi = int(np.searchsorted(panel._label_end[h], as_of, side="right"))  # pyright: ignore[reportPrivateUsage]
        lo = hi - fit.weeks
        for gi in range(lo, hi):
            end = cal.label_end(panel.grid[gi], h)
            assert end is not None and end <= as_of


def test_reproducible() -> None:
    sessions = krx_sessions(DAYS)
    cal = KrxSessions(sessions)
    bars = _bars(10, sessions)
    as_of = cal.grid(0, 2**62)[-15]
    assert _snapshot(_wf(bars, cal), as_of) == _snapshot(_wf(bars, cal), as_of)
