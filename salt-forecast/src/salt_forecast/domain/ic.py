"""정보계수(IC) — 순위상관 · 이동 블록 부트스트랩 CI · 사전등록 판정(FC-REQ-008 FR-6 · 사전등록 rule-ic@1).

- 종목 간 IC: 날짜마다 신호와 라벨의 스피어만 → 날짜 평균. 표본 < 20 종목이거나 한쪽이 상수면 그 날 제외
- 시계열 IC: 시장 공통 값(공포탐욕)은 날짜 간 스피어만
- CI: 날짜 단위 이동 블록 부트스트랩. 지평이 겹쳐(30일 라벨을 매일) 날짜가 독립이 아니다 — 블록 = max(7, 2h)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.panel import Mat

Vec = NDArray[np.float64]
Verdict = Literal["keep", "reverse", "zero_weight", "insufficient"]

MIN_CROSS_SECTION = 20
MIN_DATES = 250
N_BOOT = 2000
SEED = 20260927


def rank_average(x: Vec) -> Vec:
    """동점은 평균 순위(스피어만 표준). 규칙 기여는 −8/0/+8 처럼 동점이 대부분이다."""
    _, inv, counts = np.unique(x, return_inverse=True, return_counts=True)
    ends = np.cumsum(counts).astype(np.float64)
    avg = ends - (counts - 1) / 2.0
    return avg[inv]


def spearman(x: Vec, y: Vec) -> float:
    ok = ~np.isnan(x) & ~np.isnan(y)
    if ok.sum() < 3:
        return float("nan")
    rx, ry = rank_average(x[ok]), rank_average(y[ok])
    sx, sy = rx.std(), ry.std()
    if sx == 0 or sy == 0:
        return float("nan")
    return float(np.mean((rx - rx.mean()) * (ry - ry.mean())) / (sx * sy))


def cross_sectional_ic(signal: Mat, label: Mat, mask: NDArray[np.bool_] | None = None) -> Vec:
    """날짜별 IC. 제외된 날은 NaN."""
    out = np.full(signal.shape[0], np.nan)
    for t in range(signal.shape[0]):
        s, y = signal[t], label[t]
        ok = ~np.isnan(s) & ~np.isnan(y)
        if mask is not None:
            ok &= mask[t]
        if ok.sum() < MIN_CROSS_SECTION:
            continue
        out[t] = spearman(s[ok], y[ok])
    return out


def block_bootstrap_mean(series: Vec, block: int, n_boot: int = N_BOOT, seed: int = SEED) -> tuple[float, float]:
    """평균의 95% CI. 결측을 뺀 순서열에서 길이 `block` 블록을 복원 추출해 원래 길이까지 잇는다."""
    v = series[~np.isnan(series)]
    n = v.size
    if n < 2:
        return (float("nan"), float("nan"))
    b = max(1, min(block, n))
    rng = np.random.default_rng(seed)
    k = int(np.ceil(n / b))
    starts = rng.integers(0, n - b + 1, size=(n_boot, k))
    idx = (starts[:, :, None] + np.arange(b)[None, None, :]).reshape(n_boot, -1)[:, :n]
    means = v[idx].mean(axis=1)
    lo, hi = np.quantile(means, [0.025, 0.975])
    return (float(lo), float(hi))


def block_bootstrap_spearman(
    x: Vec, y: Vec, block: int, n_boot: int = N_BOOT, seed: int = SEED
) -> tuple[float, float, float, int]:
    """시계열 스피어만 + 쌍 블록 부트스트랩 CI. 반환 (ic, lo, hi, n)."""
    ok = ~np.isnan(x) & ~np.isnan(y)
    xv, yv = x[ok], y[ok]
    n = xv.size
    ic = spearman(xv, yv)
    if n < 3:
        return (ic, float("nan"), float("nan"), n)
    b = max(1, min(block, n))
    rng = np.random.default_rng(seed)
    k = int(np.ceil(n / b))
    boots = np.empty(n_boot)
    for i in range(n_boot):
        starts = rng.integers(0, n - b + 1, size=k)
        idx = (starts[:, None] + np.arange(b)[None, :]).ravel()[:n]
        boots[i] = spearman(xv[idx], yv[idx])
    lo, hi = np.nanquantile(boots, [0.025, 0.975])
    return (ic, float(lo), float(hi), n)


def block_length(horizon_days: int) -> int:
    return max(7, 2 * horizon_days)


def verdict(n_dates: int, ci_low: float, ci_high: float, expected_sign: int = 1, min_dates: int = MIN_DATES) -> Verdict:
    """사전등록 [decision]. 신호가 이미 규칙 방향 부호를 띠면 expected_sign = 1."""
    if n_dates < min_dates or np.isnan(ci_low) or np.isnan(ci_high):
        return "insufficient"
    lo, hi = (ci_low, ci_high) if expected_sign > 0 else (-ci_high, -ci_low)
    if lo > 0:
        return "keep"
    if hi < 0:
        return "reverse"
    return "zero_weight"


@dataclass(frozen=True, slots=True)
class IcResult:
    item: str
    mode: str
    horizon_days: int
    label_kind: str
    ic_kind: Literal["cross_section", "time_series"]
    n_dates: int
    mean_obs: float  # 날짜당 평균 종목 수(시계열이면 1)
    ic_mean: float
    ci_low: float
    ci_high: float
    t_naive: float  # 평균 ÷ (표준편차/√n) — 겹침을 무시한 값. 참고용, 판정에 쓰지 않는다
    verdict: Verdict
    primary: bool


def summarize_cross_section(
    item: str,
    mode: str,
    h: int,
    label_kind: str,
    daily: Vec,
    obs: Vec,
    *,
    primary: bool,
    expected_sign: int = 1,
) -> IcResult:
    v = daily[~np.isnan(daily)]
    n = int(v.size)
    mean = float(v.mean()) if n else float("nan")
    lo, hi = block_bootstrap_mean(daily, block_length(h))
    t = float(mean / (v.std(ddof=1) / np.sqrt(n))) if n > 1 and v.std(ddof=1) > 0 else float("nan")
    ok_obs = obs[~np.isnan(daily)]
    return IcResult(
        item,
        mode,
        h,
        label_kind,
        "cross_section",
        n,
        float(ok_obs.mean()) if n else float("nan"),
        mean,
        lo,
        hi,
        t,
        verdict(n, lo, hi, expected_sign),
        primary,
    )
