"""DVOL 기반 σ 와 앞으로 h일 실현 분산 채점 — 사전등록 dvol-sigma@1 (FC-REQ-014). 순수 계산, I/O 없음.

행 t = 날짜 격자(UTC 자정 마감 봉). r[t] = ln(C[t] / C[t−1]).
- σ 후보는 행 ≤ t 만 읽는다. DVOL[t] 는 t 에 닫힌 봉의 close(available_at ≤ t 로 격자에 맞춘 값)다.
- **라벨만 미래를 읽는다** — `forward_rv` 하나. 보정 계수 `dvol_scale` 도 `forward_rv` 를 쓰지만
  s ≤ t − 30 인 과거 창만 모아서, 그 라벨이 t 에 전부 닫혀 있다(누수 없음 — 테스트가 강제한다).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.target_weight import block_indices

ANNUAL_DAYS = 365
HORIZON = 7
SCALE_WINDOW = 365
SCALE_LAG = 30
SCALE_MIN_OBS = 250
BOOT_BLOCK = 30
N_BOOT = 2000
SEED = 20260930
# 1차 검정 4개(후보 2 × 종목 2), 판정은 CI 상한 < 0 — 단측 Bonferroni 1.25% 씩 = 분위 [1.25%, 98.75%]
ALPHA_PRIMARY = 0.025

type Vec = NDArray[np.float64]


def log_returns(close: Vec) -> Vec:
    """r[0] = NaN. 봉이 빠진 날은 NaN(앞 값으로 채우지 않는다)."""
    out = np.full(close.shape, np.nan)
    with np.errstate(divide="ignore", invalid="ignore"):
        out[1:] = np.log(close[1:] / close[:-1])
    return out


def forward_rv(r: Vec, h: int) -> Vec:
    """**라벨** — RV_h(t) = Σ_{j=1..h} r[t+j]². 창 안에 결측이 있거나 끝을 넘으면 NaN."""
    n = r.size
    out = np.full(n, np.nan)
    if n <= h:
        return out
    sq = r**2
    c = np.concatenate(([0.0], np.cumsum(np.nan_to_num(sq))))
    holes = np.concatenate(([0], np.cumsum(np.isnan(sq))))
    t = np.arange(n - h)
    s = c[t + h + 1] - c[t + 1]
    bad = holes[t + h + 1] - holes[t + 1]
    out[t] = np.where(bad == 0, s, np.nan)
    return out


def dvol_scale(r: Vec, dvol_pct: Vec) -> Vec:
    """k[t] = 중앙값{ RV30σ(s) ÷ (DVOL[s]/100) : t − 365 ≤ s ≤ t − 30 }. 유효 s 가 250 미만이면 NaN.

    RV30σ(s) = √(RV_30(s) × 365/30) 는 r[s+1..s+30] 을 읽는다 — s + 30 ≤ t 라 t 에 이미 닫혀 있다.
    """
    rv30 = forward_rv(r, SCALE_LAG)
    with np.errstate(divide="ignore", invalid="ignore"):
        ratio = np.sqrt(rv30 * ANNUAL_DAYS / SCALE_LAG) / (dvol_pct / 100.0)
    ratio[~np.isfinite(ratio) | (dvol_pct <= 0)] = np.nan
    n = r.size
    out = np.full(n, np.nan)
    for t in range(n):
        lo, hi = t - SCALE_WINDOW, t - SCALE_LAG
        if hi < 0:
            continue
        w = ratio[max(0, lo) : hi + 1]
        w = w[np.isfinite(w)]
        if w.size >= SCALE_MIN_OBS:
            out[t] = float(np.median(w))
    return out


@dataclass(frozen=True, slots=True)
class Candidates:
    """연 σ(0.52 = 52%) — 행 t 에 알 수 있던 값."""

    ewma: Vec
    dvol_scaled: Vec
    blend: Vec
    raw_dvol: Vec


def candidates(ewma_annual: Vec, dvol_pct: Vec, k: Vec) -> Candidates:
    scaled = dvol_pct / 100.0 * k
    blend = np.sqrt(0.5 * ewma_annual**2 + 0.5 * scaled**2)
    return Candidates(ewma_annual, scaled, blend, dvol_pct / 100.0)


def qlike(sigma_annual: Vec, rv: Vec, h: int) -> Vec:
    """QLIKE(t) = log f + RV/f, f = σ² × h/365. 어느 쪽이 없거나 f ≤ 0 이면 NaN. volatility.qlike 와 같은 식."""
    f = sigma_annual**2 * h / ANNUAL_DAYS
    out = np.full(f.shape, np.nan)
    ok = np.isfinite(f) & (f > 0) & np.isfinite(rv)
    out[ok] = np.log(f[ok]) + rv[ok] / f[ok]
    return out


@dataclass(frozen=True, slots=True)
class MeanCi:
    mean: float
    lo: float
    hi: float
    n: int


def mean_ci(d: Vec, alpha: float, block: int = BOOT_BLOCK, n_boot: int = N_BOOT, seed: int = SEED) -> MeanCi:
    """결측을 뺀 순서열 평균의 이동 블록 부트스트랩 CI — 분위 [α/2, 1 − α/2]."""
    v = d[np.isfinite(d)]
    n = int(v.size)
    if n < 2:
        return MeanCi(float(v.mean()) if n else float("nan"), float("nan"), float("nan"), n)
    means = np.array([float(v[i].mean()) for i in block_indices(n, block, n_boot, seed)])
    lo, hi = np.quantile(means, [alpha / 2, 1 - alpha / 2])
    return MeanCi(float(v.mean()), float(lo), float(hi), n)


def delta(q_candidate: Vec, q_base: Vec) -> Vec:
    """같은 날 둘 다 있을 때만 차 — 한쪽만 있는 날을 섞지 않는다."""
    out = q_candidate - q_base
    out[~(np.isfinite(q_candidate) & np.isfinite(q_base))] = np.nan
    return out
