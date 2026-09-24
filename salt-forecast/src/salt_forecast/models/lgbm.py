# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false, reportUnknownArgumentType=false
# lightgbm 은 타입 정보가 없다 — 이 파일에만 푼다.
"""LightGBM 분위수 모델 — 종목 풀링 패널 하나, 변동성 정규화 타깃.

타깃 z = r / scale (scale = 기준 A 의 일 변동성 × √일수). 종목 간 변동성 차이를 걷어내야 풀링이 된다.
4주마다 재학습하고, 학습 행은 **라벨이 재학습 시점 전에 끝난 것만**(엠바고 · time-and-leakage.md §4).
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Literal

import lightgbm as lgb
import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.baselines import RawForecast, empirical_quantiles, ensemble, random_walk_normal
from salt_forecast.domain.features import quantiles_to_p_up
from salt_forecast.domain.quantiles import LEVELS, LEVELS_ARR, Z_SCORES, QuantileForecast
from salt_forecast.domain.series import WEEK, CloseSeries, realized_log_return
from salt_forecast.features.as_of import closes_as_of
from salt_forecast.features.build import FEATURES, MarketContext, feature_matrix

VERSION = "lgbm-quantile@0.1.0"
RETRAIN_EVERY_WEEKS = 4
TRAIN_WEEKS = 156  # 3년
MIN_TRAIN_WEEKS = 52
MIN_TRAIN_ROWS = 2_000
NUM_BOOST_ROUND = 150
PARAMS: dict[str, object] = {
    "objective": "quantile",
    "learning_rate": 0.05,
    "num_leaves": 15,
    "min_data_in_leaf": 200,
    "bagging_fraction": 0.8,
    "bagging_freq": 1,
    "feature_fraction": 0.8,
    "lambda_l2": 1.0,
    "seed": 0,
    "deterministic": True,
    "force_row_wise": True,
    "num_threads": 4,  # 0(전 코어)은 스레드 경합으로 시스템 시간이 사용자 시간보다 컸다(2026-09-23 실측)
    "verbose": -1,
}


# 표준정규에서 E|z| = √(2/π). |z| 의 조건부 평균을 이것으로 나누면 변동성 배율이 된다
_MEAN_ABS_Z = 0.7978845608028654
VOL_SCALE_CLIP = (0.3, 3.0)


def _fit_abs(x: NDArray[np.float64], z: NDArray[np.float64], params: Mapping[str, object] | None) -> lgb.Booster:
    merged: dict[str, object] = {**PARAMS, **(params or {}), "objective": "regression"}
    merged.pop("alpha", None)
    rounds = int(str(merged.pop("num_boost_round", NUM_BOOST_ROUND)))
    return lgb.train(merged, lgb.Dataset(x, label=np.abs(z), free_raw_data=True), rounds)


def _fit(
    x: NDArray[np.float64], z: NDArray[np.float64], alpha: float, params: Mapping[str, object] | None = None
) -> lgb.Booster:
    merged: dict[str, object] = {**PARAMS, **(params or {}), "alpha": alpha}
    rounds = int(str(merged.pop("num_boost_round", NUM_BOOST_ROUND)))
    return lgb.train(merged, lgb.Dataset(x, label=z, free_raw_data=True), rounds)


@dataclass(slots=True)
class _Snapshot:
    symbols: list[str]
    x: NDArray[np.float64]
    scale: dict[int, NDArray[np.float64]] = field(default_factory=lambda: {})  # h → 종목별 스케일(NaN = 없음)


@dataclass(slots=True)
class LgbmQuantile:
    """fit_predict() 가 대상 as_of 들의 raw 예측을 미리 계산한다. raw() 는 그 표를 읽기만 한다."""

    series: Mapping[str, CloseSeries]
    ctx: MarketContext
    horizons: Sequence[int]
    grid: Sequence[int]
    extra_as_ofs: Sequence[int] = ()
    on_progress: Callable[[int, int], None] | None = None  # (끝난 재학습 수, 전체) — 남은 시간을 볼 수 있게
    features: tuple[str, ...] = FEATURES  # 쓰는 피처(부분집합). 변형 실험에서 바꾼다
    params: Mapping[str, object] | None = None  # PARAMS 위에 덮어쓸 값
    # quantile: 분위수 7개를 직접 학습.
    # vol_scale: 변동성 배율 하나만 학습 — 범위 = 기준 정규 분위수 × 배율, 방향 없음(v0.4)
    mode: Literal["quantile", "vol_scale"] = "quantile"
    # vol_scale 의 바탕 범위: normal = 기준 A 정규(v0.4),
    # ensemble = 챔피언 앙상블 범위를 중앙값 둘레로 늘리고 줄임(v0.5)
    vol_base: Literal["normal", "ensemble"] = "normal"
    # 배율 수축 지수 — m ** shrink. 1 이면 그대로, 0.5 면 제곱근(과한 조정을 줄인다)
    vol_shrink: float = 1.0
    version: str = VERSION
    importance: dict[int, dict[str, float]] = field(default_factory=lambda: {})
    _preds: dict[tuple[int, int, str], RawForecast] = field(default_factory=lambda: {})
    _snap: dict[int, _Snapshot] = field(default_factory=lambda: {})

    def _snapshot(self, t: int) -> _Snapshot:
        if t not in self._snap:
            sliced = closes_as_of(self.series, t)
            symbols, x = feature_matrix(sliced, self.ctx, t)
            cols = [FEATURES.index(f) for f in self.features]
            snap = _Snapshot(symbols, x[:, cols])
            for h in self.horizons:
                sc = [random_walk_normal(sliced[s], h) for s in symbols]
                snap.scale[h] = np.asarray([r.scale if r else np.nan for r in sc], dtype=np.float64)
            self._snap[t] = snap
        return self._snap[t]

    def _train_rows(self, retrain_at: int, h: int) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
        xs: list[NDArray[np.float64]] = []
        ys: list[NDArray[np.float64]] = []
        lo = retrain_at - TRAIN_WEEKS * WEEK
        for g in self.grid:
            if g < lo or g + h * WEEK > retrain_at:
                continue
            snap = self._snapshot(g)
            realized = [realized_log_return(self.series[s], g, h) for s in snap.symbols]
            y = np.asarray(
                [np.nan if r is None else r for r in realized], dtype=np.float64
            )  # 0 수익률을 결측으로 만들지 않는다
            z = y / snap.scale[h]
            ok = np.isfinite(z)
            xs.append(snap.x[ok])
            ys.append(z[ok])
        if not xs:
            return np.empty((0, len(self.features))), np.empty(0)
        return np.vstack(xs), np.concatenate(ys)

    def fit_predict(self) -> None:
        grid = list(self.grid)
        if len(grid) <= MIN_TRAIN_WEEKS:
            return
        retrains = grid[MIN_TRAIN_WEEKS::RETRAIN_EVERY_WEEKS]
        targets = sorted(set(grid[MIN_TRAIN_WEEKS:]) | set(self.extra_as_ofs))
        total: int = len(self.horizons) * len(retrains)
        done: int = 0
        for h in self.horizons:
            for ri, r in enumerate(retrains):
                done += 1
                if self.on_progress is not None:
                    self.on_progress(done, total)
                nxt = retrains[ri + 1] if ri + 1 < len(retrains) else None
                due = [t for t in targets if t >= r and (nxt is None or t < nxt)]
                if not due:
                    continue
                x, z = self._train_rows(r, h)
                if z.size < MIN_TRAIN_ROWS:
                    continue
                if self.mode == "vol_scale":
                    self._fit_predict_vol(x, z, h, due, final=nxt is None)
                    continue
                models = [_fit(x, z, q, self.params) for q in LEVELS]
                if nxt is None:
                    med = models[LEVELS.index(0.5)]
                    gains = med.feature_importance(importance_type="gain")
                    gain_sum = float(gains.sum()) or 1.0
                    self.importance[h] = {f: float(g) / gain_sum for f, g in zip(self.features, gains, strict=True)}
                for t in due:
                    snap = self._snapshot(t)
                    zq = np.column_stack([np.asarray(m.predict(snap.x), dtype=np.float64) for m in models])
                    for i, sym in enumerate(snap.symbols):
                        sc = float(snap.scale[h][i])
                        if not np.isfinite(sc):
                            continue
                        q = np.sort(np.asarray(zq[i], dtype=np.float64) * sc)
                        p_up = quantiles_to_p_up(q, LEVELS_ARR)
                        self._preds[(t, h, sym)] = RawForecast(QuantileForecast.from_array(q, p_up), sc)

    def _fit_predict_vol(
        self, x: NDArray[np.float64], z: NDArray[np.float64], h: int, due: list[int], *, final: bool
    ) -> None:
        """변동성 배율 m = E[|z| | 피처] / E|z|(정규). 범위 = 기준 A 정규 분위수 × m. 중앙값 0 · 상승 확률 0.5."""
        booster = _fit_abs(x, z, self.params)
        if final:
            gains = booster.feature_importance(importance_type="gain")
            gain_sum = float(gains.sum()) or 1.0
            self.importance[h] = {f: float(g) / gain_sum for f, g in zip(self.features, gains, strict=True)}
        for t in due:
            snap = self._snapshot(t)
            m = np.clip(np.asarray(booster.predict(snap.x), dtype=np.float64) / _MEAN_ABS_Z, *VOL_SCALE_CLIP)
            m = m**self.vol_shrink
            for i, sym in enumerate(snap.symbols):
                sc = float(snap.scale[h][i])
                if not np.isfinite(sc):
                    continue
                if self.vol_base == "normal":
                    self._preds[(t, h, sym)] = RawForecast(
                        QuantileForecast.from_array(Z_SCORES * sc * float(m[i]), 0.5), sc
                    )
                    continue
                sliced = self.series[sym].as_of(t)
                a, b = random_walk_normal(sliced, h), empirical_quantiles(sliced, h)
                base = ensemble([a, b]) if a and b else None
                if base is None:
                    continue
                q = base.forecast.array
                mid = q[LEVELS.index(0.5)]
                self._preds[(t, h, sym)] = RawForecast(
                    QuantileForecast.from_array(mid + (q - mid) * float(m[i]), base.forecast.p_up), base.scale
                )

    def raw(self, symbol: str, sliced: CloseSeries, h: int, as_of: int) -> RawForecast | None:
        del sliced
        return self._preds.get((as_of, h, symbol))
