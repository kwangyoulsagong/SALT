"""LightGBM · 피처 누수 — 미래를 바꿔도 과거 시점의 피처 · 예측이 같아야 한다."""

from __future__ import annotations

import numpy as np

from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.series import DAY, CloseSeries
from salt_forecast.features.as_of import closes_as_of
from salt_forecast.features.build import MarketContext, feature_matrix
from salt_forecast.models.engine import grid_for
from salt_forecast.models.lgbm import LgbmQuantile
from tests.synthetic import T0, universe


def _ctx(extra_future: bool, after_day: int = 600) -> MarketContext:
    """after_day 이후에만 값이 바뀌고, 과거 전체 수정 빈티지도 after_day + 100 에 공개된다."""
    days = np.arange(900, dtype=np.int64)
    obs = T0 + days * DAY
    val = 4.0 + 0.001 * days
    if extra_future:
        val = np.where(days > after_day, val + 50.0, val)
    # 같은 관측일의 "나중 수정" 빈티지 — 700일째에 과거 전체를 +10 으로 고친 값
    rev_obs = obs[:500]
    rev_val = val[:500] + (10.0 if extra_future else 0.0)
    rev_avail = np.full(500, T0 + (after_day + 100) * DAY, dtype=np.int64)
    s = VintagedSeries.build(
        np.concatenate([obs, rev_obs]),
        np.concatenate([obs + DAY, rev_avail]),
        np.concatenate([val, rev_val]).astype(np.float64),
    )
    return MarketContext(series={"DGS10": s, "DGS2": s, "VIXCLS": s}, spot_usdt={})


def _tamper(u: dict[str, CloseSeries], after: int) -> dict[str, CloseSeries]:
    out: dict[str, CloseSeries] = {}
    for k, c in u.items():
        close = c.close.copy()
        close[c.available_at > after] *= 3.0
        out[k] = CloseSeries(k, c.available_at, close)
    return out


def test_vintage_revision_is_invisible_before_it_happens() -> None:
    ctx = _ctx(extra_future=True)
    s = ctx.series["DGS10"]
    t = T0 + 400 * DAY
    assert s.value_as_of(t) == 4.0 + 0.001 * 399  # 수정(700일째) 전에는 원래 값
    assert s.value_as_of(T0 + 800 * DAY, cutoff=T0 + 400 * DAY) == 4.0 + 0.001 * 400 + 10.0  # 수정 후엔 수정값


def test_feature_matrix_ignores_future() -> None:
    u = universe(15, 900)
    t = int(next(iter(u.values())).available_at[550])
    a = feature_matrix(closes_as_of(u, t), _ctx(False), t)[1]
    b = feature_matrix(closes_as_of(_tamper(u, t), t), _ctx(True), t)[1]
    assert np.array_equal(np.nan_to_num(a, nan=-999), np.nan_to_num(b, nan=-999))


def test_lgbm_prediction_ignores_future() -> None:
    u = universe(30, 900)
    t = grid_for(u)[-20]

    def predict(series: dict[str, CloseSeries], ctx: MarketContext) -> list[tuple[float, ...]]:
        m = LgbmQuantile(series, ctx, (1,), [g for g in grid_for(series) if g <= t])
        m.fit_predict()
        out: list[tuple[float, ...]] = []
        for sym in sorted(series):
            r = m.raw(sym, series[sym].as_of(t), 1, t)
            out.append(r.forecast.q if r else ())
        return out

    t_day = (t - T0) // DAY
    a = predict(u, _ctx(False, t_day))
    b = predict(_tamper(u, t), _ctx(True, t_day))
    assert any(a) and a == b
