"""온체인 과열 상한 — 사전등록 onchain-regime@1 [candidate] · [exploratory] (FC-REQ-015).

방향 판단이 아니다. "t 에 알던 MVRV 가 자기 역사의 높은 분위 이상이면 목표 비중을 줄인다"만 계산한다.
모든 함수는 날짜 격자 t 마다 available ≤ t 인 점만 읽는다(time-and-leakage.md §1) — 누수 테스트가 이걸 강제한다.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

type Vec = NDArray[np.float64]

CAP_FACTOR = 0.5
MIN_HISTORY = 1000
EPISODE_GAP_WEEKS = 8
FLOW_WINDOW = 7
FLOW_REF = 365
FLOW_MIN_REF = 300


def expanding_quantile(
    observed: NDArray[np.int64],
    available: NDArray[np.int64],
    value: Vec,
    dates: NDArray[np.int64],
    q: float,
    since: int,
    min_n: int = MIN_HISTORY,
) -> Vec:
    """격자 t 마다 observed ≥ since · available ≤ t 인 값들의 q 분위(선형 보간). 표본이 min_n 미만이면 NaN."""
    keep = (observed >= since) & np.isfinite(value)
    order = np.argsort(available[keep], kind="stable")
    a, v = available[keep][order], value[keep][order]
    counts = np.searchsorted(a, dates, side="right")
    out = np.full(dates.size, np.nan)
    for i, k in enumerate(counts):
        if k >= min_n:
            out[i] = float(np.quantile(v[:k], q))
    return out


def cap_multiplier(signal: Vec, threshold: Vec, factor: float = CAP_FACTOR) -> Vec:
    """signal ≥ threshold 면 factor, 아니면 1. 어느 쪽이든 값이 없으면 1(상한 없음 — 등록 [protocol] period)."""
    hit = np.isfinite(signal) & np.isfinite(threshold) & (signal >= threshold)
    return np.where(hit, factor, 1.0)


def trailing_sum(x: Vec, window: int = FLOW_WINDOW) -> Vec:
    """격자 t 의 (t − window, t] 합. 하나라도 NaN 이면 NaN."""
    out = np.full(x.size, np.nan)
    if x.size < window:
        return out
    c = np.concatenate(([0.0], np.cumsum(np.nan_to_num(x))))
    bad = np.concatenate(([0], np.cumsum(~np.isfinite(x))))
    s = c[window:] - c[:-window]
    nb = bad[window:] - bad[:-window]
    out[window - 1 :] = np.where(nb == 0, s, np.nan)
    return out


def trailing_z(x: Vec, ref: int = FLOW_REF, min_ref: int = FLOW_MIN_REF) -> Vec:
    """t 의 값을 직전 ref 칸(t 제외)의 평균 · 표준편차로 표준화. 유효 칸이 min_ref 미만이거나 표준편차 0 이면 NaN."""
    out = np.full(x.size, np.nan)
    for t in range(x.size):
        if not np.isfinite(x[t]):
            continue
        w = x[max(0, t - ref) : t]
        w = w[np.isfinite(w)]
        if w.size < min_ref:
            continue
        sd = float(w.std())
        if sd > 0:
            out[t] = (x[t] - float(w.mean())) / sd
    return out


def episodes(flags: NDArray[np.bool_], gap: int = EPISODE_GAP_WEEKS) -> int:
    """리밸런스 주 순서의 켜짐 구간 수. 두 켜짐 사이 꺼진 주가 gap 미만이면 한 구간이다."""
    on = np.flatnonzero(flags)
    if on.size == 0:
        return 0
    return 1 + int((np.diff(on) - 1 >= gap).sum())
