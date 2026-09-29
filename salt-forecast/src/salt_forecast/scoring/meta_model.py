"""메타 모델 · 보정 백테스트 — 사전등록 meta-model@1 을 그대로 실행한다(FC-REQ-011).

1. 한 번 읽은 일봉 패널에서 피처 11개 · 라벨(삼중 장벽 20일 상단 먼저)을 만들고 주 격자 행만 남긴다
2. CPCV(6군 · 2시험 · 퍼지 20일 · 엠바고 7일) 로 학습기 넷을 같은 분할에서 재 모델을 고르고 신호 게이트를 본다
3. 선택 모델로 라이브와 같은 walk-forward(4주 재학습 · 4년 창 · 직전 52주 OOS 로 Beta 보정)를 돌려 보정 게이트를 본다
4. 부차(판정 무관): DSR · BY-FDR(rule-ic@1 탐색표 · 종목별 BSS) · 날짜별 종목 간 AUC · 중요도

학습기는 `Learner` 모양만 안다 — `models.meta` 를 import 하지 않는다(층 독립, 작업이 이어 준다).
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping, Sequence
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from typing import Any, Protocol, runtime_checkable

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.cpcv import (
    benjamini_yekutieli,
    cpcv_splits,
    deflated_sharpe,
    expected_max_sharpe,
    p_from_ci,
)
from salt_forecast.domain.ic import block_bootstrap_mean
from salt_forecast.domain.labels import class_ratio, ewma_sigma, triple_barrier
from salt_forecast.domain.meta_features import BTC, FEATURES, build
from salt_forecast.domain.panel import Mat, Panel, age_days, align_points, build_panel, window_mean
from salt_forecast.domain.prob_calibration import (
    BetaCalibrator,
    BrierParts,
    auc,
    auc_ci,
    beta_fit,
    brier_decomposition,
    bss,
    bss_ci,
    ece,
    log_loss_rows,
    reliability_table,
)
from salt_forecast.domain.regime import hmm_monthly, log_returns
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.store.rule_ic import StoredIc

Vec = NDArray[np.float64]

# 사전등록 meta-model@1 — 파일과 같은 값. 바꾸려면 새 키
HORIZON = 20
GRID_EVERY = 7
MIN_AGE_DAYS = 60
N_GROUPS, K_TEST, EMBARGO_DAYS = 6, 2, 7
BOOT_BLOCK, N_BOOT, SEED = 6, 2000, 20260929
AUC_FLOOR = 0.52
RETRAIN_EVERY = 4
TRAIN_DAYS = 1460
MIN_TRAIN_WEEKS = 104
CAL_WEEKS = 52
MIN_CAL_ROWS = 200
MAX_ECE = 0.05
TOP_SHARE = 0.2
FWD_DAYS = 7
ROUND_TRIP = 0.001
FDR_Q = 0.05
CANDIDATES = ("logistic", "lgbm")


class Predictor(Protocol):
    def predict(self, x: Mat) -> Vec: ...


@runtime_checkable
class Explains(Protocol):
    def importance(self) -> dict[str, float]: ...


class Learner(Protocol):
    name: str

    def fit(self, x: Mat, y: Vec) -> Predictor: ...


@dataclass(frozen=True, slots=True)
class Rows:
    """주 격자 학습 · 평가 행. 행 순서 = (날짜, 종목)."""

    x: Mat  # (n, 11)
    y: Vec  # 0 / 1
    dates: NDArray[np.int64]  # epoch
    symbol: NDArray[np.intp]
    fwd: Vec  # 7일 로그수익(부차 전략용, 라벨 아님)


@dataclass(frozen=True, slots=True)
class CpcvResult:
    name: str
    oos: Vec
    auc: float
    auc_lo: float
    auc_hi: float
    log_loss: float
    split_auc: tuple[float, ...]


@dataclass(frozen=True, slots=True)
class Diff:
    """행별 로그손실 차(a − b)의 날짜 평균 → 블록 CI. 음수 = a 가 낫다."""

    a: str
    b: str
    mean: float
    lo: float
    hi: float


@dataclass(frozen=True, slots=True)
class WalkForward:
    name: str
    p_raw: Vec  # 전 행, 예측 없으면 NaN
    p_cal: Vec  # 보정 있는 행만
    clim: Vec  # 그 행을 예측한 학습 창의 양성 비율
    retrains: int
    calibrators: tuple[tuple[int, BetaCalibrator], ...]


@dataclass(frozen=True, slots=True)
class CalibrationEval:
    n: int
    n_dates: int
    first: date | None
    ece: float
    parts: BrierParts
    bss: float
    bss_lo: float
    bss_hi: float
    bss_full_rate: float  # 참고 — 전 기간 양성 비율 기준
    auc: float
    reliability: tuple[tuple[int, float, float], ...]


@dataclass(frozen=True, slots=True)
class Strategy:
    name: str
    weeks: int
    sharpe_weekly: float
    dsr: float


@dataclass(slots=True)
class RunOutput:
    window: tuple[date, date]
    n_rows: int
    n_dates: int
    n_symbols: int
    base_rate: float
    barrier_ratio: tuple[float, float, float]
    feature_coverage: dict[str, float] = field(default_factory=dict[str, float])
    cpcv: dict[str, CpcvResult] = field(default_factory=dict[str, CpcvResult])
    select_diff: Diff | None = None
    selected: str = ""
    rule_diff: Diff | None = None
    signal_gate: bool = False
    shuffle: CpcvResult | None = None
    shuffle_ok: bool = False
    walk: WalkForward | None = None
    calib: CalibrationEval | None = None
    ece_ok: bool = False
    bss_ok: bool = False
    adopted: bool = False
    strategies: list[Strategy] = field(default_factory=list[Strategy])
    sr0: float = float("nan")
    fdr_symbols: tuple[int, int] = (0, 0)  # (통과, 검정 수)
    cross_section_auc: tuple[float, int] = (float("nan"), 0)
    # 진단(판정 무관) — 셔플 점검이 실패했을 때 누수인지 점검 설계인지 가른다
    shuffle_cs_auc: float = float("nan")  # 날짜 안 셔플 라벨의 종목 간 AUC — 누수 없으면 0.5
    global_shuffle: CpcvResult | None = None  # 날짜까지 섞은 라벨 — 누수 없으면 풀링 AUC 0.5
    oracle_date_auc: float = float("nan")  # 날짜별 실제 양성 비율 자체의 AUC — 풀링 AUC 중 시점 몫의 상한
    importance: dict[str, float] = field(default_factory=dict[str, float])


# ── 데이터 ────────────────────────────────────────────────────────────────


def _base(symbol: str) -> str:
    return symbol.removeprefix("KRW-")


def funding_matrix(panel: Panel, series: Mapping[str, VintagedSeries]) -> Mat:
    out = np.full(panel.shape, np.nan)
    for j, sym in enumerate(panel.symbols):
        s = series.get(f"funding:{_base(sym)}")
        if s is not None:
            out[:, j] = window_mean(s.available, s.value, panel.dates, 7 * DAY)
    return out


def build_rows(
    panel: Panel, series: Mapping[str, VintagedSeries], p_high: Vec
) -> tuple[Rows, tuple[float, float, float], dict[str, float]]:
    fg_s = series.get("fear_greed")
    d = panel.dates
    fg = align_points(fg_s.available, fg_s.value, d, 2 * DAY) if fg_s else np.full(d.size, np.nan)
    sigma = ewma_sigma(panel)
    feats = build(panel, fg, sigma, p_high, funding_matrix(panel, series))
    bar = triple_barrier(panel, HORIZON, sigma)
    fwd = np.full(panel.shape, np.nan)
    with np.errstate(divide="ignore", invalid="ignore"):
        fwd[:-FWD_DAYS] = np.log(panel.close[FWD_DAYS:] / panel.close[:-FWD_DAYS])
    grid = (np.arange(d.size) % GRID_EVERY == 0)[:, None]
    ok = grid & (age_days(panel) >= MIN_AGE_DAYS) & ~np.isnan(panel.close) & ~np.isnan(sigma) & ~np.isnan(bar.label)
    ti, sj = np.nonzero(ok)
    x = np.column_stack([feats[f][ti, sj] for f in FEATURES])
    rows = Rows(x, (bar.label[ti, sj] == 1).astype(np.float64), d[ti], sj.astype(np.intp), fwd[ti, sj])
    ratio = class_ratio(np.where(ok, bar.label, np.nan))
    coverage = {f: float(np.mean(~np.isnan(x[:, i]))) for i, f in enumerate(FEATURES)}
    return rows, ratio, coverage


# ── CPCV ───────────────────────────────────────────────────────────────────


def _per_date_mean(v: Vec, dates: NDArray[np.int64]) -> Vec:
    _, inv = np.unique(dates, return_inverse=True)
    s = np.bincount(inv, weights=v)
    n = np.bincount(inv)
    return s / n


def cpcv_run(rows: Rows, learner: Learner, y: Vec | None = None) -> CpcvResult:
    yy = rows.y if y is None else y
    splits = cpcv_splits(rows.dates, N_GROUPS, K_TEST, HORIZON, EMBARGO_DAYS)
    total = np.zeros(yy.size)
    count = np.zeros(yy.size)
    split_auc: list[float] = []
    for s in splits:
        model = learner.fit(rows.x[s.train], yy[s.train])
        p = model.predict(rows.x[s.test])
        total[s.test] += p
        count[s.test] += 1
        split_auc.append(auc(p, yy[s.test]))
    oos = total / count
    a, lo, hi = auc_ci(oos, yy, rows.dates, BOOT_BLOCK, N_BOOT, SEED)
    return CpcvResult(learner.name, oos, a, lo, hi, float(np.mean(log_loss_rows(oos, yy))), tuple(split_auc))


def loss_diff(rows: Rows, a: CpcvResult, b: CpcvResult) -> Diff:
    d = log_loss_rows(a.oos, rows.y) - log_loss_rows(b.oos, rows.y)
    per_date = _per_date_mean(d, rows.dates)
    lo, hi = block_bootstrap_mean(per_date, BOOT_BLOCK, N_BOOT, SEED)
    return Diff(a.name, b.name, float(per_date.mean()), lo, hi)


def shuffle_within_date(rows: Rows, seed: int = SEED) -> Vec:
    rng = np.random.default_rng(seed)
    y = rows.y.copy()
    for t in np.unique(rows.dates):
        idx = np.flatnonzero(rows.dates == t)
        y[idx] = y[rng.permutation(idx)]
    return y


# ── walk-forward · 보정 ─────────────────────────────────────────────────────


def walk_forward(rows: Rows, learner: Learner) -> WalkForward:
    """라이브와 같은 절차. 재학습 시점 a 의 학습 = 라벨이 a 전에 끝난 행(t ≤ a − 20일) 중 최근 4년, 최소 104주.
    보정 = 직전 52주 OOS 중 라벨이 a 전에 끝난 것. 예측 대상 = a 부터 다음 재학습 전까지의 주 격자."""
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
        model = learner.fit(rows.x[train], rows.y[train])
        retrains += 1
        p = model.predict(rows.x[target])
        p_raw[target] = p
        clim[target] = float(rows.y[train].mean())
        pool = (rows.dates <= a - h) & (rows.dates > a - CAL_WEEKS * 7 * DAY) & ~np.isnan(p_raw)
        if pool.sum() >= MIN_CAL_ROWS:
            cal = beta_fit(p_raw[pool], rows.y[pool])
            cals.append((a, cal))
            p_cal[target] = cal.apply(p)
    return WalkForward(learner.name, p_raw, p_cal, clim, retrains, tuple(cals))


def evaluate_calibration(rows: Rows, wf: WalkForward) -> CalibrationEval:
    m = ~np.isnan(wf.p_cal)
    p, y, dates = wf.p_cal[m], rows.y[m], rows.dates[m]
    if p.size == 0:
        nan = float("nan")
        return CalibrationEval(0, 0, None, nan, BrierParts(nan, nan, nan, nan, nan), nan, nan, nan, nan, nan, ())
    b, lo, hi, _ = bss_ci(p, wf.clim[m], y, dates, BOOT_BLOCK, N_BOOT, SEED)
    return CalibrationEval(
        int(p.size),
        int(np.unique(dates).size),
        _day(int(dates.min())),
        ece(p, y),
        brier_decomposition(p, y),
        b,
        lo,
        hi,
        bss(p, np.full(p.size, y.mean()), y),
        auc(p, y),
        tuple(reliability_table(p, y)),
    )


# ── 부차 ───────────────────────────────────────────────────────────────────


def top_minus_all(rows: Rows, p: Vec) -> Vec:
    """주마다 p 상위 20% 동일가중 − 전체 동일가중 7일 로그수익 − 왕복 수수료. 예측 없는 주는 뺀다."""
    out: list[float] = []
    for t in np.unique(rows.dates):
        idx = np.flatnonzero((rows.dates == t) & ~np.isnan(p) & ~np.isnan(rows.fwd))
        if idx.size < 5:
            continue
        k = max(1, int(np.floor(idx.size * TOP_SHARE)))
        top = idx[np.argsort(-p[idx], kind="mergesort")[:k]]
        out.append(float(rows.fwd[top].mean() - rows.fwd[idx].mean() - ROUND_TRIP))
    return np.asarray(out)


def symbol_bss_fdr(rows: Rows, wf: WalkForward) -> tuple[int, int]:
    m = ~np.isnan(wf.p_cal)
    pvals: list[float] = []
    for s in np.unique(rows.symbol[m]):
        k = m & (rows.symbol == s)
        if np.unique(rows.dates[k]).size < 2:
            pvals.append(float("nan"))
            continue
        _, _, _, boots = bss_ci(wf.p_cal[k], wf.clim[k], rows.y[k], rows.dates[k], BOOT_BLOCK, N_BOOT, SEED)
        ok = boots[~np.isnan(boots)]
        pvals.append(float(np.mean(ok <= 0)) if ok.size else float("nan"))
    pv = np.asarray(pvals)
    return (int(benjamini_yekutieli(pv, FDR_Q).sum()), int(np.sum(~np.isnan(pv))))


def cross_sectional_auc(rows: Rows, p: Vec) -> tuple[float, int]:
    vals: list[float] = []
    for t in np.unique(rows.dates):
        idx = np.flatnonzero(rows.dates == t)
        a = auc(p[idx], rows.y[idx])
        if a == a:
            vals.append(a)
    return (float(np.mean(vals)) if vals else float("nan"), len(vals))


@dataclass(frozen=True, slots=True)
class FdrRow:
    row: StoredIc
    p: float
    survives: bool


def rule_ic_fdr(rows: Sequence[StoredIc]) -> list[FdrRow]:
    p = np.asarray([p_from_ci(r.ic_mean, r.ci_low, r.ci_high) for r in rows])
    keep = benjamini_yekutieli(p, FDR_Q)
    return [FdrRow(r, float(pi), bool(k)) for r, pi, k in zip(rows, p, keep, strict=True)]


# ── 실행 ───────────────────────────────────────────────────────────────────


def _day(epoch: int) -> date:
    return datetime.fromtimestamp(int(epoch), tz=UTC).date()


def btc_p_high(panel: Panel, workers: int) -> Vec:
    if BTC not in panel.symbols:
        return np.full(panel.dates.size, np.nan)
    r = log_returns(panel.close[:, panel.column(BTC)])
    mapper: Callable[[Callable[[Any], Any], Iterable[Any]], Iterable[Any]]
    if workers > 1:
        with ProcessPoolExecutor(max_workers=workers) as pool:
            return hmm_monthly(panel.dates, r, k=2, mapper=pool.map).p_high
    mapper = map
    return hmm_monthly(panel.dates, r, k=2, mapper=mapper).p_high


def run(
    ohlcv: Mapping[str, OhlcvSeries],
    series: Mapping[str, VintagedSeries],
    learners: Mapping[str, Learner],
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
    rows, ratio, coverage = build_rows(panel, series, btc_p_high(panel, workers))
    out = RunOutput(
        window=(_day(int(rows.dates.min())), _day(int(rows.dates.max()))),
        n_rows=int(rows.y.size),
        n_dates=int(np.unique(rows.dates).size),
        n_symbols=int(np.unique(rows.symbol).size),
        base_rate=float(rows.y.mean()),
        barrier_ratio=ratio,
        feature_coverage=coverage,
    )
    step("rows")
    for name, learner in learners.items():
        out.cpcv[name] = cpcv_run(rows, learner)
        step(f"cpcv:{name}")
    sel = loss_diff(rows, out.cpcv["lgbm"], out.cpcv["logistic"])
    out.select_diff = sel
    out.selected = "lgbm" if sel.hi < 0 else "logistic"
    chosen = out.cpcv[out.selected]
    out.rule_diff = loss_diff(rows, chosen, out.cpcv["rule_only"])
    out.signal_gate = chosen.auc_lo > AUC_FLOOR and out.rule_diff.hi < 0
    out.shuffle = cpcv_run(rows, learners[out.selected], shuffle_within_date(rows))
    out.shuffle_ok = out.shuffle.auc_lo <= 0.5 <= out.shuffle.auc_hi
    ys = shuffle_within_date(rows)
    out.shuffle_cs_auc = cross_sectional_auc(Rows(rows.x, ys, rows.dates, rows.symbol, rows.fwd), out.shuffle.oos)[0]
    yg = rows.y[np.random.default_rng(SEED).permutation(rows.y.size)]
    out.global_shuffle = cpcv_run(rows, learners[out.selected], yg)
    _, inv = np.unique(rows.dates, return_inverse=True)
    out.oracle_date_auc = auc((np.bincount(inv, rows.y) / np.bincount(inv))[inv], rows.y)
    step("shuffle")

    walks = {n: walk_forward(rows, learners[n]) for n in ("rule_only", "logistic", "lgbm")}
    step("walk_forward")
    out.walk = walks[out.selected]
    out.calib = evaluate_calibration(rows, out.walk)
    out.ece_ok = out.calib.ece <= MAX_ECE
    out.bss_ok = out.calib.bss_lo > 0
    out.adopted = out.signal_gate and out.shuffle_ok and out.ece_ok and out.bss_ok

    # 부차 — DSR(시도 N = 4, 상수 확률 climatology 는 순위가 없어 전략 샤프가 없다 → 분산은 셋으로)
    sharpes: dict[str, tuple[Vec, float]] = {}
    for n, wf in walks.items():
        r = top_minus_all(rows, wf.p_raw)
        sd = float(r.std(ddof=1)) if r.size > 2 else float("nan")
        sharpes[n] = (r, float(r.mean()) / sd if sd > 0 else float("nan"))
    trial = np.asarray([s for _, s in sharpes.values() if s == s])
    out.sr0 = expected_max_sharpe(float(trial.var(ddof=1)) if trial.size > 1 else 0.0, len(learners))
    for n, (r, _) in sharpes.items():
        sr, dsr = deflated_sharpe(r, out.sr0)
        out.strategies.append(Strategy(n, int(r.size), sr, dsr))
    out.fdr_symbols = symbol_bss_fdr(rows, out.walk)
    out.cross_section_auc = cross_sectional_auc(rows, chosen.oos)
    full = learners[out.selected].fit(rows.x, rows.y)
    out.importance = full.importance() if isinstance(full, Explains) else {}
    step("secondary")
    return out
