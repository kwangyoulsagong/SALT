"""메타 모델 v2 — 기저율 + 종목 간 순위, 사전등록 meta-model@2 를 그대로 실행한다(FC-REQ-011).

행 · 라벨 · 분할 · walk-forward · 보정 · 지표는 @1(`meta_model`)과 같은 함수를 쓴다. 바뀐 것은 모델 하나:
p = σ(logit(b_t) + s), b_t = 학습 창 양성 비율(비교 기준과 같은 값), s = 날짜 안 순위 피처의 절편 없는 로지스틱.
순위 모델은 numpy 로지스틱(domain)이라 models 층이 필요 없다.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from datetime import datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.cpcv import cpcv_splits
from salt_forecast.domain.cross_section import centered_ranks, combine, date_groups, fit_rank_model
from salt_forecast.domain.ic import block_bootstrap_mean
from salt_forecast.domain.logistic import Standardizer, fit_logistic
from salt_forecast.domain.meta_features import FEATURES
from salt_forecast.domain.panel import build_panel
from salt_forecast.domain.prob_calibration import BetaCalibrator, auc, beta_fit
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.scoring.meta_model import (
    BOOT_BLOCK,
    CAL_WEEKS,
    EMBARGO_DAYS,
    HORIZON,
    K_TEST,
    MAX_ECE,
    MIN_CAL_ROWS,
    MIN_TRAIN_WEEKS,
    N_BOOT,
    N_GROUPS,
    RETRAIN_EVERY,
    SEED,
    TRAIN_DAYS,
    CalibrationEval,
    Rows,
    WalkForward,
    btc_p_high,
    build_rows,
    evaluate_calibration,
    shuffle_within_date,
    top_minus_all,
)

Vec = NDArray[np.float64]
Mat = NDArray[np.float64]

SYMBOL_FEATURES = (
    "rule_long",
    "rule_scalp",
    "mom_28d",
    "rs_btc_5d",
    "rs_btc_20d",
    "vol_pct_365",
    "turnover_z_30",
    "drawdown_365",
    "funding_7d",
)
RULE_FEATURES = ("rule_long", "rule_scalp")
MARKET_FEATURES = ("btc_trend", "hmm_p_high")  # 탐색 — 시장 기저율 모델
L2_LAMBDA = 1.0
AUC_FLOOR = 0.52


def rank_matrix(rows: Rows, names: tuple[str, ...], flag_funding: bool) -> Mat:
    cols = [FEATURES.index(n) for n in names]
    z = centered_ranks(rows.x[:, cols], rows.dates)
    if flag_funding and "funding_7d" in names:
        miss = np.isnan(rows.x[:, FEATURES.index("funding_7d")]).astype(np.float64)
        z = np.hstack([z, miss[:, None]])
    return z


def per_date_auc(score: Vec, y: Vec, dates: NDArray[np.int64]) -> tuple[Vec, NDArray[np.int64]]:
    """(날짜 순 AUC, 날짜). 양 · 음이 둘 다 없는 날은 NaN."""
    groups = date_groups(dates)
    out = np.full(len(groups), np.nan)
    for k, idx in enumerate(groups):
        out[k] = auc(score[idx], y[idx])
    return out, np.asarray([int(dates[g[0]]) for g in groups], dtype=np.int64)


@dataclass(frozen=True, slots=True)
class CsResult:
    name: str
    score: Vec  # CPCV OOS 순위 점수(경로 평균)
    daily: Vec  # 날짜별 종목 간 AUC
    auc: float
    lo: float
    hi: float
    n_dates: int
    weights: tuple[float, ...]  # 전 기간 적합(중요도)


def _summarize(name: str, score: Vec, y: Vec, rows: Rows, weights: Vec) -> CsResult:
    daily, _ = per_date_auc(score, y, rows.dates)
    v = daily[~np.isnan(daily)]
    lo, hi = block_bootstrap_mean(daily, BOOT_BLOCK, N_BOOT, SEED)
    return CsResult(name, score, daily, float(v.mean()), lo, hi, int(v.size), tuple(float(w) for w in weights))


def cpcv_rank(rows: Rows, z: Mat, y: Vec, name: str) -> CsResult:
    splits = cpcv_splits(rows.dates, N_GROUPS, K_TEST, HORIZON, EMBARGO_DAYS)
    total = np.zeros(y.size)
    count = np.zeros(y.size)
    for s in splits:
        w = fit_rank_model(z[s.train], y[s.train], rows.dates[s.train], L2_LAMBDA)
        total[s.test] += z[s.test] @ w
        count[s.test] += 1
    return _summarize(name, total / count, y, rows, fit_rank_model(z, y, rows.dates, L2_LAMBDA))


@dataclass(frozen=True, slots=True)
class DiffCi:
    mean: float
    lo: float
    hi: float


def auc_diff(a: CsResult, b: CsResult) -> DiffCi:
    d = a.daily - b.daily
    v = d[~np.isnan(d)]
    lo, hi = block_bootstrap_mean(d, BOOT_BLOCK, N_BOOT, SEED)
    return DiffCi(float(v.mean()), lo, hi)


def walk_forward_rank(rows: Rows, z: Mat, market: Mat | None = None, calibrate: bool = True) -> WalkForward:
    """@1 `walk_forward` 와 같은 재학습 · 보정 일정. `market` 을 주면 b_t 를 시장 로지스틱으로(탐색)."""
    grid = np.unique(rows.dates)
    p_raw = np.full(rows.y.size, np.nan)
    p_cal = np.full(rows.y.size, np.nan)
    clim = np.full(rows.y.size, np.nan)
    h = HORIZON * DAY
    retrains = 0
    cals: list[tuple[int, BetaCalibrator]] = []
    for i in range(0, grid.size, RETRAIN_EVERY):
        a = int(grid[i])
        train = (rows.dates <= a - h) & (rows.dates >= a - TRAIN_DAYS * DAY)
        if np.unique(rows.dates[train]).size < MIN_TRAIN_WEEKS:
            continue
        nxt = int(grid[i + RETRAIN_EVERY]) if i + RETRAIN_EVERY < grid.size else np.iinfo(np.int64).max
        target = (rows.dates >= a) & (rows.dates < nxt)
        w = fit_rank_model(z[train], rows.y[train], rows.dates[train], L2_LAMBDA)
        retrains += 1
        rate = float(rows.y[train].mean())
        base = np.full(int(target.sum()), rate)
        if market is not None:
            sc = Standardizer.fit(market[train])
            fit = fit_logistic(sc.transform(market[train]), rows.y[train], L2_LAMBDA)
            base = fit.predict(sc.transform(market[target]))
        p = combine(base, z[target] @ w)
        p_raw[target] = p
        clim[target] = rate
        if not calibrate:
            p_cal[target] = p
            continue
        pool = (rows.dates <= a - h) & (rows.dates > a - CAL_WEEKS * 7 * DAY) & ~np.isnan(p_raw)
        if pool.sum() >= MIN_CAL_ROWS:
            cal = beta_fit(p_raw[pool], rows.y[pool])
            cals.append((a, cal))
            p_cal[target] = cal.apply(p)
    return WalkForward("cross_section", p_raw, p_cal, clim, retrains, tuple(cals))


@dataclass(slots=True)
class RunOutput:
    n_rows: int
    n_dates: int
    n_symbols: int
    base_rate: float
    main: CsResult | None = None
    rule: CsResult | None = None
    diff: DiffCi | None = None
    signal_gate: bool = False
    shuffle_within: CsResult | None = None
    shuffle_global: CsResult | None = None
    shuffle_ok: bool = False
    walk: WalkForward | None = None
    calib: CalibrationEval | None = None
    ece_ok: bool = False
    bss_ok: bool = False
    adopted: bool = False
    explore: dict[str, CalibrationEval] = field(default_factory=dict[str, CalibrationEval])
    sharpe: tuple[float, int] = (float("nan"), 0)


def _contains_half(r: CsResult) -> bool:
    return r.lo <= 0.5 <= r.hi


def run(
    ohlcv: Mapping[str, OhlcvSeries],
    series: Mapping[str, VintagedSeries],
    start: datetime,
    as_of: datetime,
    workers: int = 1,
    on_step: Callable[[str], None] | None = None,
) -> RunOutput:
    def step(name: str) -> None:
        if on_step is not None:
            on_step(name)

    t_end = int(as_of.timestamp())
    panel = build_panel({s: o.as_of(t_end) for s, o in ohlcv.items()}, int(start.timestamp()), t_end)
    rows, _, _ = build_rows(panel, series, btc_p_high(panel, workers))
    out = RunOutput(
        int(rows.y.size), int(np.unique(rows.dates).size), int(np.unique(rows.symbol).size), float(rows.y.mean())
    )
    z = rank_matrix(rows, SYMBOL_FEATURES, flag_funding=True)
    z_rule = rank_matrix(rows, RULE_FEATURES, flag_funding=False)
    step("rows")
    out.main = cpcv_rank(rows, z, rows.y, "cross_section")
    out.rule = cpcv_rank(rows, z_rule, rows.y, "rule_only")
    out.diff = auc_diff(out.main, out.rule)
    out.signal_gate = out.main.lo > AUC_FLOOR and out.diff.lo > 0
    out.shuffle_within = cpcv_rank(rows, z, shuffle_within_date(rows), "shuffle_within")
    yg = rows.y[np.random.default_rng(SEED).permutation(rows.y.size)]
    out.shuffle_global = cpcv_rank(rows, z, yg, "shuffle_global")
    out.shuffle_ok = _contains_half(out.shuffle_within) and _contains_half(out.shuffle_global)
    step("cpcv")

    out.walk = walk_forward_rank(rows, z)
    out.calib = evaluate_calibration(rows, out.walk)
    out.ece_ok = out.calib.ece <= MAX_ECE
    out.bss_ok = out.calib.bss_lo > 0
    out.adopted = out.signal_gate and out.shuffle_ok and out.ece_ok and out.bss_ok
    step("walk_forward")

    # 탐색 — 판정 무관
    out.explore["보정 없음"] = evaluate_calibration(rows, walk_forward_rank(rows, z, calibrate=False))
    market = rows.x[:, [FEATURES.index(n) for n in MARKET_FEATURES]]
    xs_means = np.full((rows.y.size, 2), np.nan)
    for idx in date_groups(rows.dates):
        for k, n in enumerate(("mom_28d", "vol_pct_365")):
            v: Vec = rows.x[idx, FEATURES.index(n)]
            ok = v[~np.isnan(v)]
            if ok.size:
                xs_means[idx, k] = float(ok.mean())
    out.explore["시장 기저율 모델"] = evaluate_calibration(
        rows, walk_forward_rank(rows, z, market=np.hstack([market, xs_means]))
    )
    r = top_minus_all(rows, out.walk.p_raw)
    sd = float(r.std(ddof=1)) if r.size > 2 else float("nan")
    out.sharpe = (float(r.mean()) / sd if sd > 0 else float("nan"), int(r.size))
    step("explore")
    return out
