"""실현 변동성 — EWMA(λ 0.94) · GARCH(1,1) 다음 날 분산 예측과 그 채점 (FC-REQ-006). 순수 계산, I/O 없음.

## 규칙

- 입력은 `as_of` 에 닫힌 일봉 종가뿐이다(`CloseSeries.as_of`) — time-and-leakage.md §1.
- 평균 수익률은 0 으로 둔다. 일 단위 크립토 평균은 분산보다 두 자릿수 작고, 추정하면 잡음만 더한다.
- 연율은 **365 일**(코인은 주말에도 거래된다).
- 숫자는 채점된 뒤에만 나간다(ADR-003 §3): 마지막 `EVAL_DAYS` 일을 표본 밖으로 두고 다음 날 분산 예측을
  QLIKE 로 잰다. 기준은 60 일 이동 분산 — 이것보다 못하면 막는다.
- **내보내는 값은 EWMA 하나로 고정**한다. 채점 창 성적을 보고 EWMA · GARCH 중 고르면 그 창은 더 이상 검증이
  아니다(time-and-leakage.md §4). GARCH 는 도전자로 같은 창에서 채점만 하고 저장한다 — 승격은 리포트를 근거로
  사람이 REQ 에서 정한다(modeling-evaluation.md §2 "단순 모델을 채점으로 이겼을 때만").
- GARCH 모수는 채점 창 **앞** 수익률로만 적합한다. 분산 목표(ω = v̄(1−α−β)) + 격자 최대우도 — scipy 없이
  결정적으로 같은 답이 나온다.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.series import DAY, CloseSeries

ANNUAL_DAYS = 365
EWMA_LAMBDA = 0.94
SEED_DAYS = 30
BASELINE_DAYS = 60
EVAL_DAYS = 180
GARCH_MIN_TRAIN = 500
MIN_RETURNS = BASELINE_DAYS + EVAL_DAYS
STALE_DAYS = 3
PRIMARY = "ewma"

_ALPHA = np.linspace(0.01, 0.30, 30)
_BETA = np.linspace(0.50, 0.99, 50)
_PERSISTENCE_MAX = 0.999

type Vec = NDArray[np.float64]


@dataclass(frozen=True, slots=True)
class GarchParams:
    omega: float
    alpha: float
    beta: float

    @property
    def unconditional(self) -> float:
        return self.omega / (1.0 - self.alpha - self.beta)


@dataclass(frozen=True, slots=True)
class VolEstimate:
    """한 종목 · 한 as_of. 변동성은 연율(0.52 = 52%). 막히면 `annualized` 가 None 이고 사유가 있다."""

    symbol: str
    as_of: datetime
    last_bar_at: datetime | None
    sample: int
    ewma: float | None
    garch: float | None
    garch_alpha: float | None
    garch_beta: float | None
    qlike_ewma: float | None
    qlike_garch: float | None
    qlike_baseline: float | None
    method: str | None
    annualized: float | None
    blocked_reason: str | None


def log_returns(close: Vec) -> Vec:
    return np.diff(np.log(close)) if close.size > 1 else np.empty(0, dtype=np.float64)


def ewma_forecasts(r: Vec, lam: float = EWMA_LAMBDA, seed: int = SEED_DAYS) -> Vec:
    """f[t] = r[:t] 로 만든 r[t] 의 분산 예측(t >= seed). 길이 n+1 — 마지막 칸이 내일. seed 앞은 NaN."""
    n = r.size
    f = np.full(n + 1, np.nan)
    f[seed] = float(np.mean(r[:seed] ** 2))
    for t in range(seed, n):
        f[t + 1] = lam * f[t] + (1.0 - lam) * r[t] ** 2
    return f


def rolling_forecasts(r: Vec, window: int = BASELINE_DAYS) -> Vec:
    """기준 — 직전 window 일 제곱 수익률 평균. ewma_forecasts 와 같은 모양."""
    n = r.size
    f = np.full(n + 1, np.nan)
    c = np.concatenate(([0.0], np.cumsum(r**2)))
    t = np.arange(window, n + 1)
    f[window:] = (c[t] - c[t - window]) / window
    return f


def _garch_nll(r: Vec, v: float, alpha: Vec, beta: Vec) -> Vec:
    """격자(alpha[i], beta[i]) 전부의 가우스 음의 로그우도를 한 번에. h[0] = v."""
    omega = v * (1.0 - alpha - beta)
    h = np.full(alpha.shape, v)
    nll = np.zeros(alpha.shape)
    for x in r**2:
        nll += np.log(h) + x / h
        h = omega + alpha * x + beta * h
    return 0.5 * nll


def _grid(alphas: Vec, betas: Vec) -> tuple[Vec, Vec]:
    """모든 (α, β) 쌍 중 정상성(α, β > 0 · α+β < 1)을 지키는 것만."""
    a = np.repeat(alphas, betas.size)
    b = np.tile(betas, alphas.size)
    keep = (a > 0) & (b > 0) & (a + b < _PERSISTENCE_MAX)
    return a[keep], b[keep]


def fit_garch(r: Vec) -> GarchParams:
    """분산 목표 + 2 단계 격자(거친 → 최적점 주변 11×11). 같은 입력이면 같은 답."""
    v = float(np.mean(r**2))
    a, b = _grid(_ALPHA, _BETA)
    best = int(np.argmin(_garch_nll(r, v, a, b)))
    a0, b0 = float(a[best]), float(b[best])
    da, db = float(_ALPHA[1] - _ALPHA[0]), float(_BETA[1] - _BETA[0])
    fa, fb = _grid(np.linspace(a0 - da, a0 + da, 11), np.linspace(b0 - db, b0 + db, 11))
    i = int(np.argmin(_garch_nll(r, v, fa, fb)))
    alpha, beta = float(fa[i]), float(fb[i])
    return GarchParams(v * (1.0 - alpha - beta), alpha, beta)


def garch_forecasts(r: Vec, p: GarchParams) -> Vec:
    """f[t] = r[:t] 로 만든 r[t] 의 분산 예측. f[0] = 무조건 분산. 길이 n+1."""
    f = np.empty(r.size + 1)
    f[0] = p.unconditional
    for t in range(r.size):
        f[t + 1] = p.omega + p.alpha * r[t] ** 2 + p.beta * f[t]
    return f


def qlike(r: Vec, f: Vec) -> float:
    """QLIKE = 평균(log f + r²/f). 분산 예측 비교에 강건한 손실(Patton 2011) — 작을수록 좋다."""
    return float(np.mean(np.log(f) + r**2 / f))


def _annual(daily_var: float) -> float:
    return float(np.sqrt(daily_var * ANNUAL_DAYS))


def estimate(series: CloseSeries, as_of: datetime) -> VolEstimate:
    """as_of 에 알 수 있던 종가만으로 내일 변동성과 그 채점."""
    t = int(as_of.timestamp())
    s = series.as_of(t)
    last = s.last_at()
    last_at = datetime.fromtimestamp(last, UTC) if last is not None else None
    r = log_returns(s.close)
    n = r.size

    def blocked(reason: str) -> VolEstimate:
        return VolEstimate(
            symbol=series.symbol,
            as_of=as_of,
            last_bar_at=last_at,
            sample=n,
            ewma=None,
            garch=None,
            garch_alpha=None,
            garch_beta=None,
            qlike_ewma=None,
            qlike_garch=None,
            qlike_baseline=None,
            method=None,
            annualized=None,
            blocked_reason=reason,
        )

    if n < MIN_RETURNS:
        return blocked("insufficient_history")
    if last is None or t - last > STALE_DAYS * DAY:
        return blocked("stale_prices")
    ewma = ewma_forecasts(r)

    ev = slice(n - EVAL_DAYS, n)
    q_ewma = qlike(r[ev], ewma[:n][ev])
    q_base = qlike(r[ev], rolling_forecasts(r)[:n][ev])

    garch: float | None = None
    q_garch: float | None = None
    params: GarchParams | None = None
    if n - EVAL_DAYS >= GARCH_MIN_TRAIN:
        oos = garch_forecasts(r, fit_garch(r[: n - EVAL_DAYS]))
        q_garch = qlike(r[ev], oos[:n][ev])
        params = fit_garch(r)
        garch = _annual(float(garch_forecasts(r, params)[n]))

    chosen = _annual(float(ewma[n]))
    ok = q_ewma <= q_base
    return VolEstimate(
        symbol=series.symbol,
        as_of=as_of,
        last_bar_at=last_at,
        sample=n,
        ewma=_annual(float(ewma[n])),
        garch=garch,
        garch_alpha=params.alpha if params else None,
        garch_beta=params.beta if params else None,
        qlike_ewma=q_ewma,
        qlike_garch=q_garch,
        qlike_baseline=q_base,
        method=PRIMARY,
        annualized=chosen if ok else None,
        blocked_reason=None if ok else "no_skill_vs_baseline",
    )
