"""1차원 가우시안 HMM — 적합(Baum-Welch) · forward 필터(FC-REQ-009 · 사전등록 regime-gate@1 [gates].hmm).

## 왜 직접 쓰나

라이브러리의 `predict_proba` 는 **스무딩** 사후확률(앞뒤 관측을 다 본 것)이다. 국면을 "그날 알 수 있던 값"으로 쓰려면
t 까지만 본 **forward 필터** 확률이 필요하다(time-and-leakage.md §1). 1차원 · 상태 2~3 개라 numpy 로 짧게 된다.

- 스케일링 forward-backward(각 t 에서 합이 1 이 되게 나누고 로그우도는 스케일 로그합)
- 분산 하한 `VAR_FLOOR` — 한 상태가 점 하나로 무너지는 것(우도 발산)을 막는다
- 상태 순서는 분산 오름차순으로 정렬해 돌려준다 — 마지막 상태가 "고변동"
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

type Vec = NDArray[np.float64]
type Mat = NDArray[np.float64]

MAX_ITER = 500
TOL = 1e-6
N_INIT = 10
VAR_FLOOR = 1e-8
_LOG_2PI = float(np.log(2.0 * np.pi))


@dataclass(frozen=True, slots=True)
class HmmParams:
    start: Vec  # (K,)
    trans: Mat  # (K, K) 행 합 1
    mean: Vec  # (K,)
    var: Vec  # (K,) 분산 오름차순
    log_likelihood: float
    iterations: int

    @property
    def k(self) -> int:
        return int(self.mean.size)


def _emission(x: Vec, mean: Mat, var: Mat) -> NDArray[np.float64]:
    """(N, T, K) 밀도 — N 은 초기값 배치. 아주 작은 값은 스케일링이 받는다 — 0 이 되지 않게 하한만 둔다."""
    z = (x[None, :, None] - mean[:, None, :]) ** 2 / var[:, None, :]
    logp = -0.5 * (_LOG_2PI + np.log(var)[:, None, :] + z)
    return np.maximum(np.exp(logp), 1e-300)


def _forward(start: Mat, trans: NDArray[np.float64], b: NDArray[np.float64]) -> tuple[NDArray[np.float64], Mat]:
    """start (N, K) · trans (N, K, K) · b (N, T, K) → alpha (N, T, K) · scale (N, T)."""
    n, t_n, k = b.shape
    alpha = np.empty((n, t_n, k))
    scale = np.empty((n, t_n))
    a = start * b[:, 0]
    scale[:, 0] = a.sum(axis=1)
    alpha[:, 0] = a / scale[:, 0, None]
    for t in range(1, t_n):
        a = np.einsum("nk,nkj->nj", alpha[:, t - 1], trans) * b[:, t]
        scale[:, t] = a.sum(axis=1)
        alpha[:, t] = a / scale[:, t, None]
    return alpha, scale


def _backward(trans: NDArray[np.float64], b: NDArray[np.float64], scale: Mat) -> NDArray[np.float64]:
    n, t_n, k = b.shape
    beta = np.empty((n, t_n, k))
    beta[:, -1] = 1.0
    for t in range(t_n - 2, -1, -1):
        beta[:, t] = np.einsum("nkj,nj->nk", trans, b[:, t + 1] * beta[:, t + 1]) / scale[:, t + 1, None]
    return beta


def _em(x: Vec, start: Mat, trans: NDArray[np.float64], mean: Mat, var: Mat) -> list[HmmParams]:
    """초기값 N 개를 한 번에 돌린다. 수렴한 초기값은 그 자리에서 멈춘다(다른 초기값이 더 돌아도 값이 바뀌지 않는다)."""
    n = start.shape[0]
    prev = np.full(n, -np.inf)
    ll = np.full(n, -np.inf)
    iters = np.zeros(n, dtype=np.int64)
    live = np.ones(n, dtype=bool)
    for it in range(1, MAX_ITER + 1):
        idx = np.flatnonzero(live)
        s, tr, m, v = start[idx], trans[idx], mean[idx], var[idx]
        b = _emission(x, m, v)
        alpha, scale = _forward(s, tr, b)
        cur = np.log(scale).sum(axis=1)
        beta = _backward(tr, b, scale)
        gamma = alpha * beta
        gamma /= gamma.sum(axis=2, keepdims=True)
        right = b[:, 1:] * beta[:, 1:] / scale[:, 1:, None]
        xi = tr * np.einsum("ntk,ntj->nkj", alpha[:, :-1], right)
        w = gamma.sum(axis=1)
        start[idx] = gamma[:, 0]
        trans[idx] = xi / xi.sum(axis=2, keepdims=True)
        mean[idx] = (gamma * x[None, :, None]).sum(axis=1) / w
        var[idx] = np.maximum((gamma * (x[None, :, None] - mean[idx][:, None, :]) ** 2).sum(axis=1) / w, VAR_FLOOR)
        ll[idx] = cur
        iters[idx] = it
        done = cur - prev[idx] < TOL
        prev[idx] = cur
        live[idx[done]] = False
        if not live.any():
            break
    out: list[HmmParams] = []
    for i in range(n):
        order = np.argsort(var[i])
        out.append(
            HmmParams(
                start=start[i][order],
                trans=trans[i][np.ix_(order, order)],
                mean=mean[i][order],
                var=var[i][order],
                log_likelihood=float(ll[i]),
                iterations=int(iters[i]),
            )
        )
    return out


def fit(x: Vec, k: int, seed: int, n_init: int = N_INIT) -> HmmParams:
    """초기값 `n_init` 개 중 최대 우도. 초기 분산은 표본 분산 × [0.3, 3] 사이 무작위 — 상태가 분산으로 갈리게."""
    if x.ndim != 1 or x.size < 10 * k or np.isnan(x).any():
        raise ValueError("관측은 결측 없는 1차원, 상태당 10개 이상")
    rng = np.random.default_rng(seed)
    v0 = float(x.var())
    m0 = float(x.mean())
    var = np.sort(v0 * np.exp(rng.uniform(np.log(0.3), np.log(3.0), size=(n_init, k))), axis=1)
    mean = m0 + rng.normal(0.0, np.sqrt(v0) * 0.1, size=(n_init, k))
    stay = rng.uniform(0.9, 0.99, size=(n_init, k))
    off = (1.0 - stay) / max(k - 1, 1)
    trans = np.repeat(off[:, :, None], k, axis=2)
    for i in range(k):
        trans[:, i, i] = stay[:, i]
    start = np.full((n_init, k), 1.0 / k)
    fits = _em(x, start, trans, mean, var)
    return max(fits, key=lambda p: p.log_likelihood)


def filter_probs(p: HmmParams, x: Vec) -> Mat:
    """forward 필터 P(상태_t | x_1..x_t). 행 t 는 t 이후 관측을 보지 않는다."""
    b = _emission(x, p.mean[None, :], p.var[None, :])
    alpha, _ = _forward(p.start[None, :], p.trans[None, :, :], b)
    return alpha[0]
