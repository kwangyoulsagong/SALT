"""날짜 안 순위 — 사전등록 meta-model@2 [features] transform · [model](FC-REQ-011).

행은 (날짜, 종목) 이고 `dates` 로 묶인다. 순위는 그 날 값이 있는 종목끼리만 매긴다 —
다른 날 값을 보지 않으니 시점 누수가 없다.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.ic import rank_average
from salt_forecast.domain.logistic import fit_logistic, sigmoid

Vec = NDArray[np.float64]
Mat = NDArray[np.float64]


def date_groups(dates: NDArray[np.int64]) -> list[NDArray[np.intp]]:
    order = np.argsort(dates, kind="mergesort")
    _, start = np.unique(dates[order], return_index=True)
    return np.split(order, start[1:])


def centered_ranks(x: Mat, dates: NDArray[np.int64]) -> Mat:
    """(rank − 0.5) / n − 0.5 ∈ (−0.5, 0.5), 동점 평균. 결측은 0(가운데)."""
    out = np.zeros_like(x)
    for idx in date_groups(dates):
        block = x[idx]
        for j in range(x.shape[1]):
            v = block[:, j]
            ok = ~np.isnan(v)
            n = int(ok.sum())
            if n == 0:
                continue
            col = np.zeros(idx.size)
            col[ok] = (rank_average(v[ok]) - 0.5) / n - 0.5
            out[idx, j] = col
    return out


def logit(p: Vec) -> Vec:
    return np.log(p / (1 - p))


def date_rate_offset(y: Vec, dates: NDArray[np.int64]) -> Vec:
    """행마다 logit(그 날 양성 비율). 0 · 1 은 [0.5/n, 1 − 0.5/n] 로 자른다."""
    out = np.zeros(y.size)
    for idx in date_groups(dates):
        n = idx.size
        r = float(np.clip(y[idx].mean(), 0.5 / n, 1 - 0.5 / n))
        out[idx] = np.log(r / (1 - r))
    return out


def fit_rank_model(z: Mat, y: Vec, dates: NDArray[np.int64], lam: float) -> Vec:
    """절편 없는 L2 로지스틱, offset = 그 날 실제 비율 — '그 날 비율을 알 때 어느 종목이 더 잘 닿나'. 반환 = 가중치."""
    return fit_logistic(z, y, lam, offset=date_rate_offset(y, dates), intercept=False).coef


def combine(base_rate: Vec, score: Vec) -> Vec:
    """p = σ(logit(b_t) + s)."""
    b = np.clip(base_rate, 1e-6, 1 - 1e-6)
    return sigmoid(logit(b) + score)
