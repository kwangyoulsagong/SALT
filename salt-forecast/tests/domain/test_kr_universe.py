"""시점 고정 유니버스 `kr-universe@1`(FC-REQ-020 FR-7)."""

from __future__ import annotations

import numpy as np

from salt_forecast.domain.calendar import KRX_CLOSE_AVAILABLE, KrxSessions
from salt_forecast.domain.kr_universe import LiquidityRule, eligible_at
from salt_forecast.domain.series import OhlcvSeries
from salt_forecast.models.engine import WalkForward
from salt_forecast.models.kr_stock import kr_providers
from tests.synthetic import krx_universe

RULE = LiquidityRule(window_sessions=20, min_turnover_krw=1e9, min_bars=250)


def _bars(sessions: np.ndarray, price: float, volume: np.ndarray) -> OhlcvSeries:
    t = sessions + KRX_CLOSE_AVAILABLE
    c = np.full(t.size, price)
    return OhlcvSeries("X", t, c, c, c, c, volume.astype(np.float64))


def test_turnover_window_and_history() -> None:
    sessions, _ = krx_universe(1, 500)
    cal = KrxSessions(sessions)
    n = sessions.size
    as_of = int(sessions[-1]) + 1  # 마지막 거래일 09:00 KST 다음 — 전날까지 안다
    liquid = _bars(sessions, 10_000.0, np.full(n, 200_000))  # 20억/일
    thin = _bars(sessions, 10_000.0, np.full(n, 50_000))  # 5억/일
    halted_vol = np.full(n, 200_000)
    halted = _bars(np.delete(sessions, n - 5), 10_000.0, np.delete(halted_vol, n - 5))  # 최근 20일 중 하루 없음
    young = _bars(sessions[-200:], 10_000.0, np.full(200, 200_000))  # 250봉 미만
    out = eligible_at({"liquid": liquid, "thin": thin, "halted": halted, "young": young}, cal, as_of, RULE)
    assert out == frozenset({"liquid"})


def test_future_bars_do_not_change_eligibility() -> None:
    """as_of 뒤 거래량이 폭증해도 그때의 대상은 같다 — 시점 고정."""
    sessions, _ = krx_universe(1, 500)
    cal = KrxSessions(sessions)
    n = sessions.size
    as_of = int(sessions[n - 60])
    vol = np.full(n, 50_000)
    before = eligible_at({"s": _bars(sessions, 10_000.0, vol)}, cal, as_of, RULE)
    vol_future = vol.copy()
    vol_future[n - 60 :] = 10_000_000
    after = eligible_at({"s": _bars(sessions, 10_000.0, vol_future)}, cal, as_of, RULE)
    assert before == after == frozenset()


def test_engine_emits_only_eligible() -> None:
    sessions, series = krx_universe(6, 900)
    cal = KrxSessions(sessions)
    keep = {"000001", "000003"}
    wf = WalkForward(series, kr_providers(cal), schedule=cal, eligible=lambda t: frozenset(keep))
    as_of = cal.grid(0, 2**62)[-10]
    assert {e.symbol for e in wf.emit(as_of, with_realized=False)} == keep
