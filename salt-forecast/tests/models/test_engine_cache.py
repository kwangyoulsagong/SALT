"""격자 시점 emit 이 `_build` 의 raw 를 다시 쓴다 — provider 를 다시 부른 것과 같아야 한다(performance.md §2)."""

from __future__ import annotations

from salt_forecast.domain.calendar import KrxSessions
from salt_forecast.models.engine import WalkForward
from salt_forecast.models.kr_stock import kr_providers
from tests.synthetic import krx_universe, universe


def _rows(wf: WalkForward, as_of: int) -> list[tuple[str, int, str, tuple[float, ...], float, str, float]]:
    return [
        (e.symbol, e.horizon_weeks, e.model_version, e.forecast.q, e.forecast.p_up, e.direction, e.scale)
        for e in wf.emit(as_of, with_realized=True)
    ]


def _recomputed(wf: WalkForward, as_of: int) -> list[tuple[str, int, str, tuple[float, ...], float, str, float]]:
    pos, wf._grid_pos = wf._grid_pos, {}  # pyright: ignore[reportPrivateUsage]
    try:
        return _rows(wf, as_of)
    finally:
        wf._grid_pos = pos  # pyright: ignore[reportPrivateUsage]


def test_kr_grid_emit_reuses_build() -> None:
    sessions, series = krx_universe(10, 1000)
    cal = KrxSessions(sessions)
    wf = WalkForward(series, kr_providers(cal, with_retired=True), schedule=cal)
    for as_of in wf.backtest_as_ofs()[-30::7]:
        a = _rows(wf, as_of)
        assert a and a == _recomputed(wf, as_of)


def test_coin_grid_emit_reuses_build() -> None:
    wf = WalkForward(universe(6, 900))
    as_of = wf.backtest_as_ofs()[-10]
    a = _rows(wf, as_of)
    assert a and a == _recomputed(wf, as_of)
