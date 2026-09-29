"""확률 없는 목표 비중 규칙 — 사전등록 target-weight@1 [rule] (FC-REQ-012).

방향 판단이 없다. 종목 σ 만으로 "이만큼 들면 묶음 변동성이 목표 근처"를 계산한다:
역변동성 배분 → 묶음 σ(상관 1 가정, 상한) → 노출 = min(1, 목표 σ ÷ 묶음 σ) → 한 종목 상한.
서버 `coach/domain/policy/targetWeight.ts` 가 같은 식이다 — `tests/domain/test_target_weight.py` 의
고정 벡터를 서버 테스트도 쓴다. 한쪽만 바꾸면 화면 비중과 과거 성적이 다른 규칙이 된다.

시뮬레이션은 리밸런스 날 목표로 맞추고, 그 사이에는 가격대로 비중이 흘러간다(손으로 매주 맞추는 사람).
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

type Vec = NDArray[np.float64]
type Mat = NDArray[np.float64]

CAP = 0.6
COST_ONE_WAY = 0.0005
BOOT_BLOCK = 30
N_BOOT = 2000
SEED = 20260929


def target_weights(sigma: Vec, target: float, cap: float = CAP) -> Vec:
    """종목 연 σ → 목표 비중. σ 가 없거나 0 이하인 종목은 0(대상에서 빠진다). 합 ≤ 1, 남는 몫은 현금."""
    ok = np.isfinite(sigma) & (sigma > 0)
    out = np.zeros(sigma.shape, dtype=np.float64)
    if not ok.any():
        return out
    inv = np.where(ok, 1.0 / np.where(ok, sigma, 1.0), 0.0)
    s = inv / inv.sum()
    sleeve = float((s * np.where(ok, sigma, 0.0)).sum())
    exposure = min(1.0, target / sleeve)
    return np.minimum(exposure * s, cap)


def sleeve_weights(sigma_core: Vec, sigma_alt: Vec, target: float, alt_share: float, cap: float = CAP) -> Vec:
    """target-weight@2 [alt_share] — core 는 목표 σ × (1 − a), 알트는 × a 를 따로 역변동성으로. 결과는 core · 알트 순.

    a = 0 이면 알트 칸은 전부 0 이고 core 칸은 `target_weights(σ_core, 목표)` 와 같다(@1 core).
    상관 1 가정에서 합 σ ≤ 목표다(두 묶음 σ 의 합).
    """
    core = target_weights(sigma_core, target * (1.0 - alt_share), cap)
    alt = target_weights(sigma_alt, target * alt_share, cap) if alt_share > 0 else np.zeros(sigma_alt.shape)
    return np.concatenate([core, alt])


@dataclass(frozen=True, slots=True)
class WeekOutcome:
    log_r: float  # 비용을 뺀 전략 주간 로그수익
    cost: float
    drifted: Vec  # 주 끝에 흘러간 비중 — 다음 리밸런스 비용의 기준


def week_outcome(prev_drifted: Vec, weights: Vec, week_simple: Vec, cost: float = COST_ONE_WAY) -> WeekOutcome:
    """라이브 한 주 — 리밸런스 t 에 `weights` 로 맞추고 t+7 까지 매수 후 보유(target-weight@2 [live] outcome).

    매주 리밸런스 포트폴리오의 주간 수익은 Σ w_i R_i 와 정확히 같다(주 안에서는 흘러가기만 한다).
    `simulate` 의 일 단위 경로와 비용 차감 날짜만 다르다 — 주간 합은 비용 한 번 차이 안에서 같다.
    """
    c = cost * float(np.abs(weights - prev_drifted).sum())
    gross = float((weights * week_simple).sum())
    growth = 1.0 + gross
    drifted = weights * (1.0 + week_simple) / growth if growth > 0 else np.zeros(weights.shape)
    return WeekOutcome(float(np.log1p(gross - c)), c, drifted)


@dataclass(frozen=True, slots=True)
class Simulation:
    log_r: Vec  # 행 t = t−1 → t 전략 로그수익
    exposure: Vec  # 행 t 수익에 걸린 Σ 비중(흘러간 값)
    weights: Mat  # 행 t 수익에 걸린 종목 비중


def simulate(simple: Mat, target: Mat, rebalance: NDArray[np.bool_], cost: float = COST_ONE_WAY) -> Simulation:
    """리밸런스 날 t 종가 뒤 `target[t]` 로 맞추고 t+1 수익부터 건다. 비용은 t+1 수익에서 뺀다.

    `simple[t]` 는 t−1 → t 종목 단순수익(봉이 없으면 0 — 값이 그대로 머문다).
    첫 리밸런스 전에는 현금(노출 0)이다.
    """
    n, k = simple.shape
    r = np.nan_to_num(simple)
    w = np.zeros(k)
    pending_cost = 0.0
    log_r = np.zeros(n)
    expo = np.zeros(n)
    held = np.zeros((n, k))
    for t in range(n):
        held[t] = w
        expo[t] = w.sum()
        gross = float((w * r[t]).sum())
        log_r[t] = np.log1p(gross - pending_cost)
        pending_cost = 0.0
        # 하루 흘러간 비중
        growth = 1.0 + gross
        w = w * (1.0 + r[t]) / growth if growth > 0 else np.zeros(k)
        if rebalance[t]:
            new = np.nan_to_num(target[t])
            pending_cost = cost * float(np.abs(new - w).sum())
            w = new
    return Simulation(log_r, expo, held)


def max_drawdown(log_r: Vec) -> float:
    eq = np.concatenate(([0.0], np.cumsum(log_r)))
    return float(-(np.exp(eq - np.maximum.accumulate(eq)) - 1.0).min())


def cagr(log_r: Vec, annual_days: int = 365) -> float:
    return float(np.exp(log_r.sum() * annual_days / max(log_r.size, 1)) - 1.0)


def calmar(log_r: Vec) -> float:
    mdd = max_drawdown(log_r)
    return cagr(log_r) / mdd if mdd > 0 else float("nan")


def block_indices(n: int, block: int = BOOT_BLOCK, n_boot: int = N_BOOT, seed: int = SEED) -> list[NDArray[np.intp]]:
    """이동 블록 부트스트랩 인덱스 — regime.delta_mdd_ci 와 같은 추출(같은 시드면 같은 경로)."""
    b = max(1, min(block, n))
    rng = np.random.default_rng(seed)
    k = int(np.ceil(n / b))
    out: list[NDArray[np.intp]] = []
    for _ in range(n_boot):
        starts = rng.integers(0, n - b + 1, size=k)
        out.append((starts[:, None] + np.arange(b)[None, :]).ravel()[:n])
    return out


def paired_ci(
    stat: Callable[[Sequence[Vec]], float],
    curves: Sequence[Vec],
    idx: Sequence[NDArray[np.intp]],
    alpha: float = 0.05,
) -> tuple[float, float, float]:
    """(점추정, α/2, 1−α/2) — 여러 곡선을 같은 인덱스로 뽑아 `stat` 을 잰다. 다중 비교면 α 를 나눠 넘긴다."""
    point = stat(curves)
    boots = np.array([stat([c[i] for c in curves]) for i in idx])
    boots = boots[np.isfinite(boots)]
    if boots.size == 0:
        return (point, float("nan"), float("nan"))
    lo, hi = np.quantile(boots, [alpha / 2, 1 - alpha / 2])
    return (point, float(lo), float(hi))


@dataclass(frozen=True, slots=True)
class MonthRow:
    month: int  # 그 달 1일 00:00 UTC epoch
    strat: float  # 단순수익
    btc: float
    exposure: float


def monthly(months: NDArray[np.int64], strat_log: Vec, btc_log: Vec, exposure: Vec) -> list[MonthRow]:
    keys, inv = np.unique(months, return_inverse=True)
    s = np.bincount(inv, weights=strat_log, minlength=keys.size)
    b = np.bincount(inv, weights=btc_log, minlength=keys.size)
    e = np.bincount(inv, weights=exposure, minlength=keys.size) / np.bincount(inv, minlength=keys.size)
    return [MonthRow(int(keys[i]), float(np.expm1(s[i])), float(np.expm1(b[i])), float(e[i])) for i in range(keys.size)]


def missed_upside(rows: Sequence[MonthRow], n: int = 3) -> list[MonthRow]:
    """BTC 가 오른 달 중 (BTC − 전략) 이 가장 큰 n 개월 — 사전등록 failures (a)."""
    up = [r for r in rows if r.btc > 0]
    return sorted(up, key=lambda r: np.log1p(r.btc) - np.log1p(r.strat), reverse=True)[:n]


def worst_months(rows: Sequence[MonthRow], n: int = 3) -> list[MonthRow]:
    """전략 월 단순수익 하위 n 개월 — 사전등록 failures (b)."""
    return sorted(rows, key=lambda r: r.strat)[:n]


def nearest_target(targets: Sequence[float], x: float) -> float:
    """사용자 목표 σ 에 가장 가까운 등록 목표. 같은 거리면 작은 쪽(보수적)."""
    return min(targets, key=lambda t: (abs(t - x), t))


@dataclass(frozen=True, slots=True)
class LiveSummary:
    n_weeks: int
    cum_return: float
    btc_cum_return: float
    mdd: float
    btc_mdd: float
    vol: float
    upside: float
    downside: float
    worst: list[int]  # 전략 주간 수익 하위 3주의 입력 위치 — 선별 없이 순서대로


def live_summary(strategy_log: Vec, btc_log: Vec) -> LiveSummary:
    """target-weight@2 [live.metrics] — status = ok 인 주들만 시간순으로 받는다. 비어 있으면 숫자는 NaN."""
    n = int(strategy_log.size)
    if n == 0:
        nan = float("nan")
        return LiveSummary(0, nan, nan, nan, nan, nan, nan, nan, [])
    up, dn = btc_log > 0, btc_log < 0
    b_up, b_dn = float(btc_log[up].sum()), float(btc_log[dn].sum())
    return LiveSummary(
        n_weeks=n,
        cum_return=float(np.expm1(strategy_log.sum())),
        btc_cum_return=float(np.expm1(btc_log.sum())),
        mdd=max_drawdown(strategy_log),
        btc_mdd=max_drawdown(btc_log),
        vol=float(strategy_log.std() * np.sqrt(52.0)) if n > 1 else float("nan"),
        upside=float(strategy_log[up].sum()) / b_up if b_up != 0 else float("nan"),
        downside=float(strategy_log[dn].sum()) / b_dn if b_dn != 0 else float("nan"),
        worst=[int(i) for i in np.argsort(strategy_log, kind="stable")[:3]],
    )
