"""조합 퍼지드 교차검증(CPCV — AFML 12장) · 다중 검정(BY-FDR) · 수축 샤프(DSR) (FC-REQ-011).

CPCV: 날짜를 시간 순 N 군으로 나누고 k 군씩 시험에 둔다 → C(N,k) 분할. 군 하나는 C(N−1,k−1) 번 시험에 든다 = 경로 수.
학습 행 중 라벨 창 [t, t+h] 이 시험 구간과 겹치는 행(퍼지)과 시험 직후 엠바고 행을 뺀다.
시험 군이 붙어 있으면 한 구간으로 합쳐 퍼지한다(사이 학습 행이 없다).
"""

from __future__ import annotations

import itertools
import math
from dataclasses import dataclass
from statistics import NormalDist

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.series import DAY

Vec = NDArray[np.float64]


@dataclass(frozen=True, slots=True)
class Split:
    test_groups: tuple[int, ...]
    train: NDArray[np.bool_]  # 행 마스크
    test: NDArray[np.bool_]


def group_bounds(dates: NDArray[np.int64], n_groups: int) -> list[tuple[int, int]]:
    """고유 날짜를 시간 순으로 n 등분 — 군마다 (첫 날짜, 마지막 날짜)."""
    uniq = np.unique(dates)
    return [(int(c[0]), int(c[-1])) for c in np.array_split(uniq, n_groups)]


def _intervals(bounds: list[tuple[int, int]], groups: tuple[int, ...]) -> list[tuple[int, int]]:
    out: list[tuple[int, int]] = []
    for g in sorted(groups):
        if out and g - 1 in groups and out[-1][1] == bounds[g - 1][1]:
            out[-1] = (out[-1][0], bounds[g][1])
        else:
            out.append(bounds[g])
    return out


def cpcv_splits(dates: NDArray[np.int64], n_groups: int, k: int, horizon_days: int, embargo_days: int) -> list[Split]:
    bounds = group_bounds(dates, n_groups)
    h, e = horizon_days * DAY, embargo_days * DAY
    out: list[Split] = []
    for groups in itertools.combinations(range(n_groups), k):
        test = np.zeros(dates.size, dtype=bool)
        drop = np.zeros(dates.size, dtype=bool)
        for a, b in _intervals(bounds, groups):
            test |= (dates >= a) & (dates <= b)
            drop |= (dates >= a - h) & (dates <= b + h + e)
        out.append(Split(groups, ~drop, test))
    return out


def n_paths(n_groups: int, k: int) -> int:
    return math.comb(n_groups - 1, k - 1)


# ── 다중 검정 ──────────────────────────────────────────────────────────────


def p_from_ci(mean: float, lo: float, hi: float) -> float:
    """95% CI → 양측 p(정규 근사). se = (hi − lo) / 3.92. 사전등록 meta-model@1 [secondary] fdr_rule_ic."""
    se = (hi - lo) / (2 * 1.959963984540054)
    if not se > 0 or math.isnan(mean):
        return float("nan")
    return 2.0 * (1.0 - NormalDist().cdf(abs(mean) / se))


def benjamini_yekutieli(p: Vec, q: float = 0.05) -> NDArray[np.bool_]:
    """BY 절차 — 임의 의존에서도 FDR ≤ q. NaN 은 기각하지 않는다(검정 수 m 에도 넣지 않는다)."""
    ok = ~np.isnan(p)
    m = int(ok.sum())
    out = np.zeros(p.size, dtype=bool)
    if m == 0:
        return out
    c_m = float(np.sum(1.0 / np.arange(1, m + 1)))
    idx = np.flatnonzero(ok)
    order = idx[np.argsort(p[idx], kind="mergesort")]
    thresh = q * np.arange(1, m + 1) / (m * c_m)
    below = np.flatnonzero(p[order] <= thresh)
    if below.size:
        out[order[: below[-1] + 1]] = True
    return out


# ── 수축 샤프 ──────────────────────────────────────────────────────────────

EULER_GAMMA = 0.5772156649015329


def expected_max_sharpe(trial_var: float, n_trials: int) -> float:
    """N 번 시도의 무작위 최대 샤프 기대값(Bailey · López de Prado 2014 식 · 주기 단위)."""
    if n_trials < 2 or not trial_var > 0:
        return 0.0
    z = NormalDist().inv_cdf
    return math.sqrt(trial_var) * (
        (1 - EULER_GAMMA) * z(1 - 1 / n_trials) + EULER_GAMMA * z(1 - 1 / (n_trials * math.e))
    )


def deflated_sharpe(r: Vec, sr0: float) -> tuple[float, float]:
    """(주기 샤프, DSR = P(참 샤프 > sr0)). 왜도 · 첨도 보정."""
    v = r[~np.isnan(r)]
    t = v.size
    if t < 3 or v.std(ddof=1) == 0:
        return (float("nan"), float("nan"))
    sd = float(v.std(ddof=1))
    sr = float(v.mean()) / sd
    z = (v - v.mean()) / v.std()
    skew, kurt = float(np.mean(z**3)), float(np.mean(z**4))
    denom = 1 - skew * sr + (kurt - 1) / 4 * sr**2
    if not denom > 0:
        return (sr, float("nan"))
    return (sr, NormalDist().cdf((sr - sr0) * math.sqrt(t - 1) / math.sqrt(denom)))
