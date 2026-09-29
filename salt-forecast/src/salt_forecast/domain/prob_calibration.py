"""확률 보정 · 확률 채점 — Beta 보정 · AUC · ECE · Brier 분해 · BSS · 날짜 블록 부트스트랩(FC-REQ-011).

- Beta 보정(Kull · Silva Filho · Flach 2017): logit(q) = a·ln p − b·ln(1−p) + c, a · b ≥ 0. Platt 보다 유연하고
  Isotonic 처럼 소표본에 과적합하지 않는다(리서치 §6-2). **Isotonic 은 이 코드베이스에 두지 않는다.**
- 부트스트랩은 **날짜 단위** 이동 블록이다 — 같은 날 종목들은 BTC 로 같이 움직여 행이 독립이 아니다.
  `ic.block_bootstrap_mean` 과 같은 추출(블록 시작 균등 · 이어 붙여 원래 길이로 자름)을 날짜별 중복 횟수로 돌려
  AUC · BSS 처럼 날짜 평균으로 안 쪼개지는 통계에 쓴다.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.logistic import fit_logistic, sigmoid

Vec = NDArray[np.float64]
EPS = 1e-6
N_BINS = 10


# ── Beta 보정 ──────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class BetaCalibrator:
    a: float
    b: float
    c: float
    n: int

    def apply(self, p: Vec) -> Vec:
        q = np.clip(p, EPS, 1 - EPS)
        return sigmoid(self.a * np.log(q) - self.b * np.log1p(-q) + self.c)


def beta_fit(p: Vec, y: Vec) -> BetaCalibrator:
    """a 또는 b 가 음수면 그 항을 빼고 다시 적합한다 — 보정 곡선이 단조 증가를 유지한다."""
    q = np.clip(p, EPS, 1 - EPS)
    cols = {"a": np.log(q), "b": -np.log1p(-q)}
    keep: list[str] = ["a", "b"]
    while True:
        if not keep:
            fit = fit_logistic(np.zeros((q.size, 0)), y, lam=0.0)
            return BetaCalibrator(0.0, 0.0, fit.intercept, int(q.size))
        x = np.column_stack([cols[k] for k in keep])
        fit = fit_logistic(x, y, lam=1e-9)
        coef: dict[str, float] = {k: float(v) for k, v in zip(keep, fit.coef, strict=True)}
        neg = [k for k in keep if coef[k] < 0]
        if not neg:
            return BetaCalibrator(coef.get("a", 0.0), coef.get("b", 0.0), fit.intercept, int(q.size))
        worst = min(neg, key=lambda name: coef[name])
        keep = [k for k in keep if k != worst]


# ── 점 추정 ────────────────────────────────────────────────────────────────


def auc(p: Vec, y: Vec, weight: Vec | None = None) -> float:
    """가중 AUC(동점 ½). 한 클래스가 없으면 NaN."""
    w = np.ones(p.size) if weight is None else weight
    order = np.argsort(p, kind="mergesort")
    return _auc_sorted(p[order], y[order], w[order])


def _auc_sorted(ps: Vec, ys: Vec, ws: Vec) -> float:
    pos = ws * (ys == 1)
    neg = ws * (ys == 0)
    wp, wn = float(pos.sum()), float(neg.sum())
    if wp == 0 or wn == 0:
        return float("nan")
    # 동점 묶음마다: 그 묶음 양성 × (앞 묶음 음성 합 + ½ 묶음 음성)
    _, start = np.unique(ps, return_index=True)
    gp = np.add.reduceat(pos, start)
    gn = np.add.reduceat(neg, start)
    below = np.concatenate(([0.0], np.cumsum(gn)[:-1]))
    return float(np.sum(gp * (below + 0.5 * gn)) / (wp * wn))


def log_loss_rows(p: Vec, y: Vec) -> Vec:
    q = np.clip(p, EPS, 1 - EPS)
    return -(y * np.log(q) + (1 - y) * np.log1p(-q))


def _bins(p: Vec, n_bins: int) -> list[NDArray[np.intp]]:
    order = np.argsort(p, kind="mergesort")
    return [b for b in np.array_split(order, n_bins) if b.size]


def ece(p: Vec, y: Vec, n_bins: int = N_BINS) -> float:
    """등빈도 구간 Σ (n_k/n) |mean p_k − mean y_k|."""
    n = p.size
    return float(sum(b.size / n * abs(p[b].mean() - y[b].mean()) for b in _bins(p, n_bins)))


@dataclass(frozen=True, slots=True)
class BrierParts:
    brier: float
    reliability: float  # 작을수록 확률이 말한 대로 일어난다
    resolution: float  # 클수록 기저율과 다른 말을 한다
    uncertainty: float  # 기저율 ȳ(1−ȳ) — 모델과 무관
    within_bin: float  # brier − (REL − RES + UNC). 구간 안 확률 분산 몫


def brier_decomposition(p: Vec, y: Vec, n_bins: int = N_BINS) -> BrierParts:
    n = p.size
    ybar = float(y.mean())
    rel = res = 0.0
    for b in _bins(p, n_bins):
        pk, yk = float(p[b].mean()), float(y[b].mean())
        rel += b.size / n * (pk - yk) ** 2
        res += b.size / n * (yk - ybar) ** 2
    unc = ybar * (1 - ybar)
    bs = float(np.mean((p - y) ** 2))
    return BrierParts(bs, rel, res, unc, bs - (rel - res + unc))


def reliability_table(p: Vec, y: Vec, n_bins: int = N_BINS) -> list[tuple[int, float, float]]:
    """(행 수, 평균 확률, 실제 비율) — 리포트의 신뢰도 표."""
    return [(int(b.size), float(p[b].mean()), float(y[b].mean())) for b in _bins(p, n_bins)]


def bss(p: Vec, p_ref: Vec, y: Vec) -> float:
    ref = float(np.sum((p_ref - y) ** 2))
    return float("nan") if ref == 0 else 1.0 - float(np.sum((p - y) ** 2)) / ref


# ── 날짜 블록 부트스트랩 ─────────────────────────────────────────────────────


def block_counts(n_dates: int, block: int, n_boot: int, seed: int) -> NDArray[np.float64]:
    """(n_boot, n_dates) — 각 부트스트랩 표본에서 날짜가 뽑힌 횟수. `ic.block_bootstrap_mean` 과 같은 추출."""
    b = max(1, min(block, n_dates))
    rng = np.random.default_rng(seed)
    k = int(np.ceil(n_dates / b))
    starts = rng.integers(0, n_dates - b + 1, size=(n_boot, k))
    idx = (starts[:, :, None] + np.arange(b)[None, None, :]).reshape(n_boot, -1)[:, :n_dates]
    counts = np.zeros((n_boot, n_dates))
    rows = np.repeat(np.arange(n_boot), n_dates)
    np.add.at(counts, (rows, idx.ravel()), 1.0)
    return counts


def date_index(dates: NDArray[np.int64]) -> tuple[NDArray[np.int64], NDArray[np.intp]]:
    """(정렬된 고유 날짜, 행 → 날짜 번호)."""
    uniq, inv = np.unique(dates, return_inverse=True)
    return uniq, inv.astype(np.intp)


def auc_ci(p: Vec, y: Vec, dates: NDArray[np.int64], block: int, n_boot: int, seed: int) -> tuple[float, float, float]:
    """(AUC, 2.5%, 97.5%). 정렬은 한 번 — 표본마다 날짜 중복 횟수를 행 가중으로 바꿔 다시 센다."""
    _, inv = date_index(dates)
    order = np.argsort(p, kind="mergesort")
    ps, ys, inv_s = p[order], y[order], inv[order]
    point = _auc_sorted(ps, ys, np.ones(p.size))
    counts = block_counts(int(inv.max()) + 1, block, n_boot, seed)
    boots = np.array([_auc_sorted(ps, ys, c[inv_s]) for c in counts])
    lo, hi = np.nanquantile(boots, [0.025, 0.975])
    return (point, float(lo), float(hi))


def bss_ci(
    p: Vec, p_ref: Vec, y: Vec, dates: NDArray[np.int64], block: int, n_boot: int, seed: int
) -> tuple[float, float, float, NDArray[np.float64]]:
    """(BSS, 2.5%, 97.5%, 부트스트랩 표본). 날짜별 제곱오차 합만 들고 다닌다."""
    _, inv = date_index(dates)
    nd = int(inv.max()) + 1
    sm = np.bincount(inv, weights=(p - y) ** 2, minlength=nd)
    sr = np.bincount(inv, weights=(p_ref - y) ** 2, minlength=nd)
    counts = block_counts(nd, block, n_boot, seed)
    with np.errstate(divide="ignore", invalid="ignore"):
        boots = 1.0 - (counts @ sm) / (counts @ sr)
    lo, hi = np.nanquantile(boots, [0.025, 0.975])
    return (bss(p, p_ref, y), float(lo), float(hi), boots)
