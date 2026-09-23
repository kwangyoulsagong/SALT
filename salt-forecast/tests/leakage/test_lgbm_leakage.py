"""LightGBM · 피처 누수 — 미래를 바꿔도 과거 시점의 피처 · 예측이 같아야 한다."""

from __future__ import annotations

from typing import Literal

import numpy as np
import pytest

from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.series import DAY, CloseSeries, OhlcvSeries
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


def _ohlcv(u: dict[str, CloseSeries]) -> dict[str, OhlcvSeries]:
    out: dict[str, OhlcvSeries] = {}
    for k, c in u.items():
        vol = (1000.0 + np.arange(c.close.size, dtype=np.float64)) * (1 + (c.close % 7) / 10)
        out[k] = OhlcvSeries(k, c.available_at, c.close * 0.999, c.close * 1.01, c.close * 0.99, c.close, vol)
    return out


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
    tampered = _tamper(u, t)
    ctx_a = _ctx(False)
    ctx_b = _ctx(True)
    ctx_a = MarketContext(ctx_a.series, ctx_a.spot_usdt, _ohlcv(u))
    ctx_b = MarketContext(ctx_b.series, ctx_b.spot_usdt, _ohlcv(tampered))
    a = feature_matrix(closes_as_of(u, t), ctx_a, t)[1]
    b = feature_matrix(closes_as_of(tampered, t), ctx_b, t)[1]
    assert np.isfinite(a).sum() > a.size // 2  # OHLCV 피처도 실제로 채워졌는지
    assert np.array_equal(np.nan_to_num(a, nan=-999), np.nan_to_num(b, nan=-999))


@pytest.mark.parametrize(("mode", "base"), [("quantile", "normal"), ("vol_scale", "normal"), ("vol_scale", "ensemble")])
def test_lgbm_prediction_ignores_future(
    mode: Literal["quantile", "vol_scale"], base: Literal["normal", "ensemble"]
) -> None:
    u = universe(30, 900)
    t = grid_for(u)[-20]

    def predict(series: dict[str, CloseSeries], ctx: MarketContext) -> list[tuple[float, ...]]:
        m = LgbmQuantile(
            series, ctx, (1,), [g for g in grid_for(series) if g <= t], mode=mode, vol_base=base, vol_shrink=0.5
        )
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


def test_vol_scale_is_symmetric_without_direction() -> None:
    u = universe(30, 900)
    grid = grid_for(u)
    t = grid[-20]
    m = LgbmQuantile(u, _ctx(False, (t - T0) // DAY), (1,), [g for g in grid if g <= t], mode="vol_scale")
    m.fit_predict()
    r = next(m.raw(s, u[s].as_of(t), 1, t) for s in sorted(u) if m.raw(s, u[s].as_of(t), 1, t))
    assert r is not None and r.forecast.p_up == 0.5
    q = r.forecast.q
    assert abs(q[0] + q[-1]) < 1e-12 and q[3] == 0.0  # 중앙값 0, 좌우 대칭
