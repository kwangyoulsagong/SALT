"""시장 국면 — 게이트 · 전략 곡선 · 낙폭 · 이벤트일 σ 비율 · 손절 도달 · BTC 베타(FC-REQ-009 · 사전등록 regime-gate@1).

시각 규칙: 행 t = `dates[t]` 에 마감된 일봉(패널과 같다). 노출 `e[t]` 는 행 t 까지로 정하고 **t+1 수익률**에 건다.
`forward_*` · `first_touch` 만 t 이후 행을 읽는다(라벨 · 결과 채점).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.hmm import HmmParams, filter_probs, fit
from salt_forecast.domain.series import DAY

type Vec = NDArray[np.float64]
type Mat = NDArray[np.float64]

TREND_WINDOW = 200
HMM_MIN_TRAIN = 730
COST_ONE_WAY = 0.0005
BOOT_BLOCK = 30
N_BOOT = 2000
SEED = 20260929
ANNUAL_DAYS = 365


def log_returns(close: Vec) -> Vec:
    out = np.full_like(close, np.nan)
    with np.errstate(divide="ignore", invalid="ignore"):
        out[1:] = np.log(close[1:] / close[:-1])
    return out


def sma(x: Vec, w: int) -> Vec:
    """행 t 까지(포함) w 개 평균. 창 안에 결측이 있으면 NaN."""
    out = np.full_like(x, np.nan)
    if x.size < w:
        return out
    c = np.concatenate(([0.0], np.cumsum(np.nan_to_num(x))))
    holes = np.concatenate(([0], np.cumsum(np.isnan(x))))
    s = c[w:] - c[:-w]
    h = holes[w:] - holes[:-w]
    out[w - 1 :] = np.where(h == 0, s / w, np.nan)
    return out


def trend_open(close: Vec, w: int = TREND_WINDOW) -> NDArray[np.bool_]:
    """종가 > w일 이동평균. 이동평균이 없으면 열림(사전등록: 200일이 안 차면 게이트 없음)."""
    m = sma(close, w)
    return np.where(np.isnan(m), True, close > m)


def drawdown_from_peak(close: Vec, window: int = ANNUAL_DAYS) -> Vec:
    """행 t 까지 window 일 최고 종가 대비 낙폭(음수 · 0). 결측 종가는 NaN."""
    out = np.full_like(close, np.nan)
    for t in range(close.size):
        if np.isnan(close[t]):
            continue
        lo = max(0, t - window + 1)
        peak = np.nanmax(close[lo : t + 1])
        out[t] = close[t] / peak - 1.0
    return out


def _month_start(epoch: int) -> int:
    d = datetime.fromtimestamp(epoch, UTC)
    return int(datetime(d.year, d.month, 1, tzinfo=UTC).timestamp())


@dataclass(frozen=True, slots=True)
class HmmPath:
    p_high: Vec  # 행마다 고변동 상태 forward 필터 확률. 적합 전은 NaN
    fits: tuple[tuple[int, HmmParams], ...]  # (적합 기준 시각 = 월초, 파라미터)


def hmm_monthly(dates: NDArray[np.int64], r: Vec, k: int, seed: int = SEED, min_train: int = HMM_MIN_TRAIN) -> HmmPath:
    """매월 1일(UTC) 기준 확장 창 적합 → 그 달 행들의 forward 필터 p_high.

    달 (a, b] 에 속한 행 t(a < dates[t] ≤ b) 는 `dates ≤ a` 인 수익률로 적합한 파라미터를 쓴다 — 미래 관측 0.
    필터는 첫 관측부터 t 까지 다시 돌린다(초기 상태 분포의 흔적이 남지 않게). 결측 수익률 행은 필터에서 건너뛰고 NaN.
    """
    out = np.full(r.size, np.nan)
    ok = ~np.isnan(r)
    fits: list[tuple[int, HmmParams]] = []
    months = sorted({_month_start(int(d - 1)) for d in dates})
    for a in months:
        b = _month_start(a + 32 * DAY)
        rows = np.flatnonzero((dates > a) & (dates <= b))
        if rows.size == 0:
            continue
        train = r[ok & (dates <= a)]
        if train.size < min_train:
            continue
        p = fit(train, k, seed)
        fits.append((a, p))
        upto = rows[-1]
        use = np.flatnonzero(ok[: upto + 1])
        probs = filter_probs(p, r[use])[:, -1]
        pos = {int(i): j for j, i in enumerate(use)}
        for t in rows:
            j = pos.get(int(t))
            if j is not None:
                out[t] = probs[j]
    return HmmPath(out, tuple(fits))


# ── 전략 곡선 ──────────────────────────────────────────────────────────────


def strategy_returns(simple: Vec, exposure: Vec, cost: float = COST_ONE_WAY) -> Vec:
    """일 단순수익 `simple[t]`(t−1 → t) 에 노출 `exposure[t−1]` 을 건다. 노출이 바뀐 날 |Δ| × cost 차감.

    로그로 돌려준다.

    노출이 NaN 인 행은 1 로 본다(게이트 없음) — 호출자가 기간을 게이트가 다 있는 구간으로 자른다.
    """
    e = np.where(np.isnan(exposure), 1.0, exposure)
    held = np.empty_like(e)
    held[0] = e[0]
    held[1:] = e[:-1]
    prev = np.empty_like(held)
    prev[0] = held[0]
    prev[1:] = held[:-1]
    r = held * np.nan_to_num(simple) - cost * np.abs(held - prev)
    return np.log1p(r)


def max_drawdown(log_r: Vec) -> float:
    """로그 누적 곡선의 최대 낙폭 — 단순 비율의 양수 크기(0.35 = −35%)."""
    eq = np.concatenate(([0.0], np.cumsum(log_r)))
    return float(-(np.exp(eq - np.maximum.accumulate(eq)) - 1.0).min())


def cagr(log_r: Vec) -> float:
    return float(np.exp(log_r.sum() * ANNUAL_DAYS / max(log_r.size, 1)) - 1.0)


def month_keys(dates: NDArray[np.int64]) -> NDArray[np.int64]:
    """행 t 의 수익률이 속한 달(봉 시작 시각 기준)."""
    return np.array([_month_start(int(d - DAY)) for d in dates], dtype=np.int64)


def capture(hold_log: Vec, strat_log: Vec, months: NDArray[np.int64]) -> tuple[float, float]:
    """(상승 포착, 하락 포착). 보유 월 로그수익이 양(음)인 달들의 전략 합 / 보유 합."""
    keys, inv = np.unique(months, return_inverse=True)
    h = np.bincount(inv, weights=hold_log, minlength=keys.size)
    s = np.bincount(inv, weights=strat_log, minlength=keys.size)
    up, dn = h > 0, h < 0
    upc = float(s[up].sum() / h[up].sum()) if up.any() else float("nan")
    dnc = float(s[dn].sum() / h[dn].sum()) if dn.any() else float("nan")
    return (upc, dnc)


@dataclass(frozen=True, slots=True)
class CurveStats:
    days: int
    cagr: float
    vol: float
    mdd: float
    calmar: float
    upside: float
    downside: float
    exposure_mean: float
    switches: int


def curve_stats(hold_log: Vec, strat_log: Vec, exposure: Vec, months: NDArray[np.int64]) -> CurveStats:
    mdd = max_drawdown(strat_log)
    g = cagr(strat_log)
    up, dn = capture(hold_log, strat_log, months)
    e = np.where(np.isnan(exposure), 1.0, exposure)
    return CurveStats(
        days=int(strat_log.size),
        cagr=g,
        vol=float(strat_log.std() * np.sqrt(ANNUAL_DAYS)),
        mdd=mdd,
        calmar=g / mdd if mdd > 0 else float("nan"),
        upside=up,
        downside=dn,
        exposure_mean=float(e.mean()),
        switches=int(np.count_nonzero(np.diff(e))),
    )


def delta_mdd_ci(
    hold_log: Vec, strat_log: Vec, block: int = BOOT_BLOCK, n_boot: int = N_BOOT, seed: int = SEED
) -> tuple[float, float, float]:
    """(점추정, 2.5%, 97.5%) — delta = MDD_보유 − MDD_전략. 같은 인덱스로 쌍 이동 블록 부트스트랩."""
    n = hold_log.size
    point = max_drawdown(hold_log) - max_drawdown(strat_log)
    b = max(1, min(block, n))
    rng = np.random.default_rng(seed)
    k = int(np.ceil(n / b))
    boots = np.empty(n_boot)
    for i in range(n_boot):
        starts = rng.integers(0, n - b + 1, size=k)
        idx = (starts[:, None] + np.arange(b)[None, :]).ravel()[:n]
        boots[i] = max_drawdown(hold_log[idx]) - max_drawdown(strat_log[idx])
    lo, hi = np.quantile(boots, [0.025, 0.975])
    return (float(point), float(lo), float(hi))


# ── 이벤트일 ────────────────────────────────────────────────────────────────


def event_rows(dates: NDArray[np.int64], event_at: NDArray[np.int64]) -> NDArray[np.bool_]:
    """발표 시각을 포함한 일봉 행. 행 t 의 봉은 (dates[t] − 1일, dates[t]]."""
    mask = np.zeros(dates.size, dtype=bool)
    idx = np.searchsorted(dates, event_at, side="left")
    ok = (idx < dates.size) & (idx >= 0)
    idx = idx[ok]
    ev = event_at[ok]
    inside = (dates[idx] - DAY < ev) & (ev <= dates[idx])
    mask[idx[inside]] = True
    return mask


def sigma_ratio_ci(r_event: Vec, r_other: Vec, n_boot: int = N_BOOT, seed: int = SEED) -> tuple[float, float, float]:
    """σ(이벤트일) / σ(그 밖). 두 집합 각각 iid 복원 추출."""
    point = float(r_event.std(ddof=1) / r_other.std(ddof=1))
    rng = np.random.default_rng(seed)
    ie = rng.integers(0, r_event.size, size=(n_boot, r_event.size))
    io = rng.integers(0, r_other.size, size=(n_boot, r_other.size))
    boots = r_event[ie].std(axis=1, ddof=1) / r_other[io].std(axis=1, ddof=1)
    lo, hi = np.quantile(boots, [0.025, 0.975])
    return (point, float(lo), float(hi))


def reduction_factor(point: float, ci_low: float) -> float:
    """사전등록 [event_day].adopt — CI 하한 > 1 이면 1/σ_ratio 를 0.05 단위 내림, 하한 0.5. 아니면 1."""
    if not ci_low > 1.0:
        return 1.0
    return max(0.5, float(np.floor((1.0 / point) / 0.05) * 0.05))


# ── 손절 · 익절 도달(기록용) ──────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class TouchStats:
    n: int
    stop_first: float
    take_first: float
    neither: float
    trend_reached: float
    stop_loss_mean: float  # 손절 먼저 닿은 표본의 그날 종가 손실(로그 → 단순), 음수
    stop_loss_p05: float


def first_touch(
    high: Mat, low: Mat, close: Mat, h: int, dn: Mat, up: Mat, far: Mat, eligible: NDArray[np.bool_]
) -> TouchStats:
    """진입 = 행 t 종가. t+1..t+h 일봉 고가 · 저가로 먼저 닿은 쪽(같은 날 둘 다면 손절).

    로그 문턱 dn(<0) · up · far(>0).

    손절 손실은 **닿은 날 종가** 기준 — 문턱보다 더 빠진 갭까지 포함한 "실제로 지켜진 금액"이다.
    수직 종가가 없는(최근 h일) 진입은 뺀다.
    """
    n = close.shape[0]
    open_ = eligible & ~np.isnan(close) & ~np.isnan(dn) & ~np.isnan(up)
    open_[n - h :] = False
    base = close
    stop = np.zeros_like(open_)
    take = np.zeros_like(open_)
    reached_far = np.zeros_like(open_)
    stop_loss = np.full_like(close, np.nan)
    live = open_.copy()
    with np.errstate(divide="ignore", invalid="ignore"):
        for k in range(1, h + 1):
            hi = np.full_like(close, np.nan)
            lo = np.full_like(close, np.nan)
            cl = np.full_like(close, np.nan)
            hi[: n - k] = np.log(high[k:] / base[: n - k])
            lo[: n - k] = np.log(low[k:] / base[: n - k])
            cl[: n - k] = np.log(close[k:] / base[: n - k])
            reached_far |= open_ & (hi >= far)
            hit_dn = live & (lo <= dn)
            hit_up = live & (hi >= up) & ~hit_dn
            stop |= hit_dn
            take |= hit_up
            stop_loss = np.where(hit_dn, cl, stop_loss)
            live &= ~(hit_dn | hit_up)
    total = int(open_.sum())
    if total == 0:
        nan = float("nan")
        return TouchStats(0, nan, nan, nan, nan, nan, nan)
    losses = np.expm1(stop_loss[stop])
    return TouchStats(
        n=total,
        stop_first=float(stop.sum() / total),
        take_first=float(take.sum() / total),
        neither=float(live[open_].sum() / total),
        trend_reached=float(reached_far[open_].sum() / total),
        stop_loss_mean=float(losses.mean()) if losses.size else float("nan"),
        stop_loss_p05=float(np.quantile(losses, 0.05)) if losses.size else float("nan"),
    )


# ── BTC 베타 ────────────────────────────────────────────────────────────────

BETA_WINDOW = 90
BETA_MIN_OBS = 60


def btc_beta(r: Vec, r_btc: Vec, window: int = BETA_WINDOW, min_obs: int = BETA_MIN_OBS) -> float | None:
    """마지막 window 일 로그수익의 OLS 기울기(r ~ r_btc). 둘 다 있는 날이 min_obs 미만이면 None."""
    a, b = r[-window:], r_btc[-window:]
    ok = ~np.isnan(a) & ~np.isnan(b)
    if ok.sum() < min_obs:
        return None
    x, y = b[ok], a[ok]
    vx = float(x.var())
    if vx == 0:
        return None
    return float(np.mean((x - x.mean()) * (y - y.mean())) / vx)
