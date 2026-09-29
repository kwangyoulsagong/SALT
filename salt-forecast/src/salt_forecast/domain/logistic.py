"""L2 로지스틱 회귀 — 뉴턴법(FC-REQ-011 · 사전등록 meta-model@1 [models]).

외부 학습 라이브러리 없이 numpy 만 쓴다. 피처 11개 · 수만 행이라 뉴턴 한 스텝이 (d+1)² 행렬 하나다.
벌점은 절편에 걸지 않는다. Beta 보정(`prob_calibration.beta_fit`)도 같은 적합기를 벌점 ≈ 0 으로 쓴다.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vec = NDArray[np.float64]
Mat = NDArray[np.float64]

TOL = 1e-8
MAX_ITER = 100


def sigmoid(z: Vec) -> Vec:
    return 0.5 * (1.0 + np.tanh(0.5 * z))  # exp 넘침 없이


@dataclass(frozen=True, slots=True)
class LogitFit:
    intercept: float
    coef: Vec
    iterations: int

    def predict(self, x: Mat) -> Vec:
        return sigmoid(self.intercept + x @ self.coef)


def fit_logistic(x: Mat, y: Vec, lam: float, weight: Vec | None = None) -> LogitFit:
    """minimize Σ w·logloss + (λ/2)‖β‖² (절편 제외). x 는 결측이 없어야 한다."""
    n, d = x.shape
    if n == 0:
        raise ValueError("학습 행이 없다")
    if np.isnan(x).any() or np.isnan(y).any():
        raise ValueError("로지스틱 입력에 결측이 있다 — 호출자가 채운다")
    w = np.ones(n) if weight is None else weight
    a = np.hstack([np.ones((n, 1)), x])
    pen = np.full(d + 1, lam)
    pen[0] = 0.0
    beta = np.zeros(d + 1)
    ybar = float(np.clip(np.average(y, weights=w), 1e-6, 1 - 1e-6))
    beta[0] = np.log(ybar / (1 - ybar))
    iterations = 0
    for step_no in range(1, MAX_ITER + 1):
        iterations = step_no
        p = sigmoid(a @ beta)
        grad = a.T @ (w * (p - y)) + pen * beta
        s = w * p * (1 - p)
        hess = (a * s[:, None]).T @ a + np.diag(pen) + 1e-10 * np.eye(d + 1)
        step = np.linalg.solve(hess, grad)
        beta -= step
        if float(np.max(np.abs(step))) < TOL:
            break
    return LogitFit(float(beta[0]), beta[1:].copy(), iterations)


@dataclass(frozen=True, slots=True)
class Standardizer:
    """학습 창에서만 적합한다(time-and-leakage.md §4). 결측 → 중앙값, `flag_cols` 는 결측 여부 열을 덧붙인다."""

    median: Vec
    mean: Vec
    std: Vec
    flag_cols: tuple[int, ...]

    @staticmethod
    def fit(x: Mat, flag_cols: tuple[int, ...] = ()) -> Standardizer:
        med = np.nanmedian(x, axis=0)
        med = np.where(np.isnan(med), 0.0, med)  # 학습 창에 값이 하나도 없는 열
        filled = np.where(np.isnan(x), med, x)
        mean = filled.mean(axis=0)
        std = filled.std(axis=0)
        return Standardizer(med, mean, np.where(std > 0, std, 1.0), flag_cols)

    def transform(self, x: Mat) -> Mat:
        filled = np.where(np.isnan(x), self.median, x)
        z = (filled - self.mean) / self.std
        if not self.flag_cols:
            return z
        flags = np.isnan(x[:, list(self.flag_cols)]).astype(np.float64)
        return np.hstack([z, flags])
