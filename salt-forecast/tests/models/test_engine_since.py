"""`WalkForward(since=pool_start(as_of))` — 매일 작업이 격자를 잘라도 전망이 전체 격자와 같다(performance.md §1)."""

from __future__ import annotations

from salt_forecast.domain.calendar import KrxSessions
from salt_forecast.models.engine import WalkForward, pool_start
from salt_forecast.models.kr_stock import kr_providers
from tests.synthetic import krx_universe, universe


def _snap(wf: WalkForward, as_of: int) -> list[tuple[str, int, str, tuple[float, ...], str]]:
    return sorted(
        (e.symbol, e.horizon_weeks, e.model_version, e.forecast.q, e.direction)
        for e in wf.emit(as_of, with_realized=False)
    )


def test_kr_since_matches_full_grid() -> None:
    sessions, series = krx_universe(12, 1000)
    cal = KrxSessions(sessions)
    full = WalkForward(series, kr_providers(cal), schedule=cal)
    for as_of in (full.grid[-1], full.grid[-7]):
        cut = WalkForward(series, kr_providers(cal), schedule=cal, since=pool_start(as_of))
        assert len(cut.grid) < len(full.grid)
        a = _snap(full, as_of)
        assert a and a == _snap(cut, as_of)


def test_coin_since_matches_full_grid() -> None:
    series = universe(8, 900)
    full = WalkForward(series)
    as_of = full.grid[-3]
    a = _snap(full, as_of)
    assert a and a == _snap(WalkForward(series, since=pool_start(as_of)), as_of)
