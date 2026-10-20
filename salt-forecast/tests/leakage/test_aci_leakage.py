"""ACI 누수 테스트(사전등록 `kr-scale@2`, time-and-leakage.md §6) — α 는 라벨이 as_of 이전에 끝난 주만 본다.

as_of 뒤의 봉을 지운 시계열로 엔진을 다시 만들어도 as_of 의 α · 전망이 같아야 한다.
"""

from __future__ import annotations

from salt_forecast.domain.calibration import NOMINAL_ALPHA
from salt_forecast.models.engine import BASELINE, ENSEMBLE, WalkForward
from tests.synthetic import universe

ACI = {ENSEMBLE: 0.05}


def _snap(wf: WalkForward, as_of: int) -> list[tuple[str, int, str, tuple[float, ...]]]:
    rows = wf.emit(as_of, with_realized=False)
    return sorted((e.symbol, e.horizon_weeks, e.model_version, e.forecast.q) for e in rows)


def test_aci_alpha_ignores_future() -> None:
    series = universe(8, 900)
    full = WalkForward(series, aci=ACI)
    as_of = full.grid[-20] + 3600
    cut = WalkForward({s: c.as_of(as_of) for s, c in series.items()}, aci=ACI)
    for h in full.horizons:
        a = full.aci_alpha(as_of, h, ENSEMBLE)
        assert a != NOMINAL_ALPHA  # 실제로 움직였다 — 빈 테스트가 아니다
        assert a == cut.aci_alpha(as_of, h, ENSEMBLE)
    snap = _snap(full, as_of)
    assert snap and snap == _snap(cut, as_of)


def test_aci_only_touches_its_model() -> None:
    series = universe(6, 900)
    plain, aci = WalkForward(series), WalkForward(series, aci=ACI)
    as_of = plain.grid[-10]
    base = [r for r in _snap(plain, as_of) if r[2] == BASELINE]
    assert base and base == [r for r in _snap(aci, as_of) if r[2] == BASELINE]
