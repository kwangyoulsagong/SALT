# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false, reportUnknownArgumentType=false
"""메타 모델 학습기 넷 — 사전등록 meta-model@1 [models](FC-REQ-011).

모두 `fit(x, y) → 예측기` 모양이다. `scoring.meta_model` 은 이 모양(Protocol)만 알고 여기를 import 하지 않는다 —
`jobs.meta_model` 이 이어 준다(architecture.md 층 독립).
"""

from __future__ import annotations

from dataclasses import dataclass

import lightgbm as lgb
import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.logistic import LogitFit, Standardizer, fit_logistic
from salt_forecast.domain.meta_features import FEATURES, MONOTONE

Vec = NDArray[np.float64]
Mat = NDArray[np.float64]

VERSION = "meta-model@1"
SEED = 20260929
L2_LAMBDA = 1.0
RULE_COLS = (FEATURES.index("rule_long"), FEATURES.index("rule_scalp"))
FLAG_COLS = (FEATURES.index("funding_7d"),)
LGBM_PARAMS: dict[str, object] = {
    "objective": "binary",
    "num_leaves": 8,
    "min_data_in_leaf": 200,
    "learning_rate": 0.05,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 1,
    "extra_trees": True,
    "lambda_l2": 1.0,
    "monotone_constraints": list(MONOTONE),
    "monotone_constraints_method": "advanced",
    "seed": SEED,
    "deterministic": True,
    "force_row_wise": True,
    "num_threads": 1,
    "verbose": -1,
}
LGBM_ROUNDS = 200


@dataclass(frozen=True, slots=True)
class ConstantModel:
    p: float

    def predict(self, x: Mat) -> Vec:
        return np.full(x.shape[0], self.p)


@dataclass(frozen=True, slots=True)
class LogitModel:
    cols: tuple[int, ...]
    scaler: Standardizer
    fit: LogitFit

    def predict(self, x: Mat) -> Vec:
        return self.fit.predict(self.scaler.transform(x[:, list(self.cols)]))

    def importance(self) -> dict[str, float]:
        """표준화 계수 — 부호가 방향이다."""
        names = [FEATURES[c] for c in self.cols] + [f"{FEATURES[c]}_missing" for c in self.scaler.flag_cols]
        return dict(zip(names, self.fit.coef.tolist(), strict=True))


@dataclass(frozen=True, slots=True)
class LgbmModel:
    booster: lgb.Booster

    def predict(self, x: Mat) -> Vec:
        return np.asarray(self.booster.predict(x), dtype=np.float64)

    def importance(self) -> dict[str, float]:
        """gain 합."""
        g = self.booster.feature_importance(importance_type="gain")
        return dict(zip(FEATURES, np.asarray(g, dtype=np.float64).tolist(), strict=True))


class Climatology:
    name = "climatology"

    def fit(self, x: Mat, y: Vec) -> ConstantModel:
        return ConstantModel(float(y.mean()))


class _Logit:
    def __init__(self, name: str, cols: tuple[int, ...], flag_cols: tuple[int, ...]) -> None:
        self.name = name
        self._cols = cols
        # 결측 여부 열 번호는 고른 열 안에서의 위치
        self._flags = tuple(cols.index(c) for c in flag_cols if c in cols)

    def fit(self, x: Mat, y: Vec) -> LogitModel:
        sub = x[:, list(self._cols)]
        scaler = Standardizer.fit(sub, self._flags)
        return LogitModel(self._cols, scaler, fit_logistic(scaler.transform(sub), y, L2_LAMBDA))


def rule_only() -> _Logit:
    return _Logit("rule_only", RULE_COLS, ())


def logistic() -> _Logit:
    return _Logit("logistic", tuple(range(len(FEATURES))), FLAG_COLS)


class Lgbm:
    name = "lgbm"

    def fit(self, x: Mat, y: Vec) -> LgbmModel:
        ds = lgb.Dataset(x, label=y, feature_name=list(FEATURES), free_raw_data=True)
        return LgbmModel(lgb.train(LGBM_PARAMS, ds, num_boost_round=LGBM_ROUNDS))


def learners() -> dict[str, Climatology | _Logit | Lgbm]:
    """사전등록 [models] 순서. 시도 횟수 N = 4."""
    return {"climatology": Climatology(), "rule_only": rule_only(), "logistic": logistic(), "lgbm": Lgbm()}
