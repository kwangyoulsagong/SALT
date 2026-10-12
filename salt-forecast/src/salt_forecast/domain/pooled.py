"""풀링 실력 검정 — 자산군 × 기간당 **한 번**(FC-REQ-020 FR-1 · FR-3).

종목 × 기간마다 iid 부트스트랩으로 실력 하한을 재면 두 번 틀린다. 겹치는 h주 라벨이라 유효 표본이 약 52/h 이고,
같은 주 시장 충격이 모든 종목을 함께 쳐서 종목들이 독립이 아니다. 그래서 주마다 종목 단면을 하나로 줄인
d̄_t = 1 − mean_i(모델 pinball) / mean_i(기준 pinball) 한 줄을 시계열로 검정한다.

- 주 검정: HLN 보정 Diebold–Mariano(Newey–West 시차 h−1, t(n−1)) 단측 p → 기간들에 Holm
- 교차 확인: 날짜 이동 블록 부트스트랩 95% 하한(블록 ≥ max(h, Politis–White)) · h 오프셋 비중첩 부분표본
- 판정: 주 검정(Holm) · 부트스트랩 하한 > 0 · 비중첩(Holm) **셋 다** 통과. 비중첩이 어긋나면 비중첩을 따르되,
  비중첩만 통과한 경우도 끈다(보수 쪽 — 카드를 켜는 쪽의 오류가 더 비싸다)

이 모듈은 숫자 배열만 받는다. 시각 · 종목을 모른다.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.ic import block_bootstrap_mean

Vec = NDArray[np.float64]

ALPHA = 0.05
MIN_WEEKS = 26


# ── 분포 꼬리 (scipy 를 직접 의존하지 않으려고 — 필요한 건 t · χ²(1) 둘뿐) ─────────────────────────────


def _betacf(a: float, b: float, x: float) -> float:
    """불완전 베타의 연분수(Lentz). Numerical Recipes 6.4."""
    tiny = 1e-300
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c, d = 1.0, 1.0 - qab * x / qap
    d = 1.0 / (d if abs(d) > tiny else tiny)
    h = d
    for m in range(1, 300):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        d = 1.0 / (d if abs(d) > tiny else tiny)
        c = 1.0 + aa / c
        c = c if abs(c) > tiny else tiny
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        d = 1.0 / (d if abs(d) > tiny else tiny)
        c = 1.0 + aa / c
        c = c if abs(c) > tiny else tiny
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < 1e-12:
            break
    return h


def _betainc(a: float, b: float, x: float) -> float:
    """정규화 불완전 베타 I_x(a, b)."""
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    ln_front = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log1p(-x)
    if x < (a + 1.0) / (a + b + 2.0):
        return math.exp(ln_front) * _betacf(a, b, x) / a
    return 1.0 - math.exp(ln_front) * _betacf(b, a, 1.0 - x) / b


def t_sf(t: float, df: int) -> float:
    """P(T > t), T ~ t(df)."""
    if not math.isfinite(t):
        return 0.0 if t > 0 else 1.0
    tail = 0.5 * _betainc(df / 2.0, 0.5, df / (df + t * t))
    return tail if t > 0 else 1.0 - tail


def chi2_1_sf(x: float) -> float:
    """P(χ²(1) > x)."""
    return math.erfc(math.sqrt(max(x, 0.0) / 2.0))


# ── 블록 길이 ─────────────────────────────────────────────────────────────────────────────────────────


def politis_white(x: Vec) -> float:
    """Politis–White(2004) 자동 블록 길이 · Patton–Politis–White(2009) 정정, 원형 블록 부트스트랩 값."""
    v = x[~np.isnan(x)]
    n = v.size
    if n < 8:
        return 1.0
    v = v - v.mean()
    var = float(v @ v) / n
    if var == 0:
        return 1.0
    max_lag = min(n - 1, math.ceil(math.sqrt(n)) + max(5, math.ceil(math.sqrt(math.log10(n)))))
    rho = np.asarray([float(v[: n - k] @ v[k:]) / n / var for k in range(max_lag + 1)])
    k_n = max(5, math.ceil(math.sqrt(math.log10(n))))
    crit = 2.0 * math.sqrt(math.log10(n) / n)
    m_hat = max_lag
    for m in range(1, max_lag - k_n + 1):
        if np.all(np.abs(rho[m : m + k_n]) < crit):
            m_hat = m - 1
            break
    big_m = min(2 * max(m_hat, 1), max_lag)
    gamma = rho * var
    g, g0 = 0.0, gamma[0]
    for k in range(1, big_m + 1):
        t = k / big_m
        lam = 1.0 if t <= 0.5 else 2.0 * (1.0 - t)
        g += 2.0 * lam * k * float(gamma[k])
        g0 += 2.0 * lam * float(gamma[k])
    d_cb = (4.0 / 3.0) * g0 * g0
    if d_cb <= 0:
        return 1.0
    return max(1.0, (2.0 * g * g / d_cb) ** (1.0 / 3.0) * n ** (1.0 / 3.0))


def block_for(d: Vec, h: int) -> int:
    """블록 ≥ max(h, Politis–White). 하한 h 는 겹침 길이 — 그보다 짧으면 블록 안에서 겹침이 끊긴다."""
    return max(h, math.ceil(politis_white(d)))


# ── 검정 ─────────────────────────────────────────────────────────────────────────────────────────────


def hln_dm(d: Vec, h: int) -> tuple[float, float]:
    """평균 d > 0 의 HLN 보정 DM. 반환 (통계량, 단측 p). Newey–West 시차 h−1(Bartlett)."""
    v = d[~np.isnan(d)]
    n = v.size
    if n < 3:
        return (float("nan"), 1.0)
    mean = float(v.mean())
    e = v - mean
    lr = float(e @ e) / n
    for k in range(1, min(h, n)):
        lr += 2.0 * (1.0 - k / h) * float(e[: n - k] @ e[k:]) / n
    if lr <= 0:
        return (float("nan"), 1.0)
    dm = mean / math.sqrt(lr / n)
    corr = (n + 1 - 2 * h + h * (h - 1) / n) / n
    stat = dm * math.sqrt(max(corr, 0.0))
    return (stat, t_sf(stat, n - 1))


def nonoverlap(d: Vec, h: int) -> tuple[float, float]:
    """h 오프셋 비중첩 부분표본마다 단측 t 검정. 반환 (오프셋 평균 중 최소, 오프셋 p 중앙값)."""
    means: list[float] = []
    ps: list[float] = []
    for o in range(h):
        sub = d[o::h]
        sub = sub[~np.isnan(sub)]
        if sub.size < 3:
            continue
        sd = float(sub.std(ddof=1))
        means.append(float(sub.mean()))
        ps.append(t_sf(float(sub.mean()) / (sd / math.sqrt(sub.size)), sub.size - 1) if sd > 0 else 1.0)
    if not ps:
        return (float("nan"), 1.0)
    return (min(means), float(np.median(ps)))


def holm(pvalues: Sequence[float], alpha: float = ALPHA) -> list[bool]:
    """Holm 단계 하강 — 기각(=통과) 여부. 한 번 못 넘으면 뒤는 전부 못 넘는다."""
    order = sorted(range(len(pvalues)), key=lambda i: pvalues[i])
    out = [False] * len(pvalues)
    m = len(pvalues)
    for rank, i in enumerate(order):
        if pvalues[i] > alpha / (m - rank):
            break
        out[i] = True
    return out


@dataclass(frozen=True, slots=True)
class PooledResult:
    horizon_weeks: int
    weeks: int
    mean_skill: float  # d̄ 의 평균 — 주별 단면 기준 대비 pinball 개선
    dm_stat: float
    dm_p: float
    dm_holm: bool
    block: int
    boot_low: float
    boot_high: float
    nonoverlap_min_mean: float
    nonoverlap_p: float
    nonoverlap_holm: bool
    passed: bool

    @property
    def agrees(self) -> bool:
        """주 검정과 비중첩이 같은 판정인가 — 어긋나면 리포트에 적는다."""
        return self.dm_holm == self.nonoverlap_holm


def pooled_verdicts(d_by_h: Mapping[int, Vec], alpha: float = ALPHA) -> dict[int, PooledResult]:
    """기간들을 한 가족으로 Holm. 주 수 < MIN_WEEKS 면 그 기간은 p = 1(통과 못 함)."""
    hs = sorted(d_by_h)
    stats: dict[int, tuple[int, float, float, float, int, float, float, float, float]] = {}
    for h in hs:
        d = d_by_h[h]
        v = d[~np.isnan(d)]
        n = int(v.size)
        if n < MIN_WEEKS:
            mean = float(v.mean()) if n else float("nan")
            stats[h] = (n, mean, float("nan"), 1.0, h, float("nan"), float("nan"), float("nan"), 1.0)
            continue
        stat, p = hln_dm(v, h)
        b = block_for(v, h)
        lo, hi = block_bootstrap_mean(v, b)
        nmin, np_ = nonoverlap(v, h)
        stats[h] = (n, float(v.mean()), stat, p, b, lo, hi, nmin, np_)
    dm_pass = holm([stats[h][3] for h in hs], alpha)
    no_pass = holm([stats[h][8] for h in hs], alpha)
    out: dict[int, PooledResult] = {}
    for i, h in enumerate(hs):
        n, mean, stat, p, b, lo, hi, nmin, np_ = stats[h]
        ok_boot = math.isfinite(lo) and lo > 0
        ok_no = no_pass[i] and math.isfinite(nmin) and nmin > 0
        out[h] = PooledResult(
            h, n, mean, stat, p, dm_pass[i], b, lo, hi, nmin, np_, ok_no, dm_pass[i] and ok_boot and ok_no
        )
    return out


def weekly_skill(model: Vec, baseline: Vec) -> float:
    """한 주 단면의 d̄_t. 기준 pinball 평균이 0 이면 NaN(그 주는 빼고 센다)."""
    b = float(baseline.mean()) if baseline.size else 0.0
    return 1.0 - float(model.mean()) / b if b > 0 else float("nan")


def block_flips(n: int, block: int, rng: np.random.Generator) -> NDArray[np.bool_]:
    """플라시보 — 길이 block 의 연속 주 묶음마다 동전 하나. True = 모델 · 기준을 맞바꾼다."""
    k = math.ceil(n / max(block, 1))
    return np.repeat(rng.random(k) < 0.5, max(block, 1))[:n]
