"""단타 방향 확률 — 사전등록 short-direction@1(FC-REQ-028 FR-1 · FR-4) 의 순수 계산.

- 피처 · 라벨 · 유니버스는 패널 행렬로(행 t 는 available_at ≤ t 만 읽는다 — 라벨만 `forward_log_return`).
- 모델: logit p = logit(b) + w·x, b = 학습 창 오른 비율(기후값).
  기준 둘 = 기후값 b · 직전 방향(같은 형태, 피처 sign(r_h)).
- walk-forward: 재학습 간격 · 학습 창 · 엠바고(학습 라벨 끝 < 블록 시작 − 엠바고)
  · Beta 보정은 블록 시작 전에 라벨이 닫힌 OOS 예측만.
- 지표 · 판정은 사전등록 [metrics] · [decision] 그대로. 판정 규칙 바꾸면 새 키.
"""

from __future__ import annotations

import math
import warnings
from collections.abc import Sequence
from dataclasses import dataclass, field
from itertools import pairwise

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.base_rate import holm
from salt_forecast.domain.logistic import LogitFit, Standardizer, fit_logistic, sigmoid
from salt_forecast.domain.panel import Mat, Panel, forward_log_return, lag, rolling_sum
from salt_forecast.domain.prob_calibration import (
    BetaCalibrator,
    beta_fit,
    block_counts,
    bss_ci,
    date_index,
    ece,
    reliability_table,
)
from salt_forecast.domain.series import DAY

Vec = NDArray[np.float64]
HOUR = 3_600

KEY = "short-direction@1"
CLIP = 5.0
L2_LAMBDA = 1.0
CONF_UP = 0.55
CONF_DOWN = 0.45
MIN_CAL_ROWS = 2_000
MAX_ECE = 0.03
MIN_CONFIDENT = 300
ALPHA = 0.05
N_BOOT = 2_000
SEED = 20261111

CRYPTO_FEATURES = ("r1_z", "r4_z", "r24_z", "day_z", "value_z", "btc_r1_z", "rs24_z")
KR_FEATURES = ("r1_z", "r5_z", "r20_z", "gap_z", "value_z", "clv", "mkt_r1_z")
CRYPTO_SIGMA_WINDOW = 168
CRYPTO_UNIVERSE_TOP = 50
CRYPTO_UNIVERSE_SPAN = 720
CRYPTO_UNIVERSE_MIN_BARS = 600
KR_SIGMA_WINDOW = 20
KR_UNIVERSE_TOP = 200

# 화면 사유 — 처음 걸린 것 하나(사전등록 [decision] blocked_reasons 순서)
REASONS = ("shuffle_failed", "no_skill", "miscalibrated", "no_edge_confident", "cost")


@dataclass(frozen=True, slots=True)
class WalkSpec:
    """한 칸의 walk-forward 설정. 시간은 전부 epoch 초(국내는 거래일 격자라 행 수를 초로 바꾸지 않고 행 번호로 센다)."""

    horizon: int  # 행 수(코인 = 시간, 국내 = 거래일)
    retrain_every: int  # 행 수
    train_span: int  # 행 수
    min_train: int  # 행 수
    embargo: int  # 행 수 — 학습 라벨 끝(t + h) ≤ 블록 시작 − embargo
    cal_span: int  # 행 수
    boot_block: int  # 날짜 수


CRYPTO_SPECS = {
    "1h": WalkSpec(1, 7 * 24, 365 * 24, 180 * 24, 24, 60 * 24, 7),
    "4h": WalkSpec(4, 7 * 24, 365 * 24, 180 * 24, 24, 60 * 24, 7),
    "1d": WalkSpec(24, 7 * 24, 365 * 24, 180 * 24, 24, 60 * 24, 7),
}
KR_SPEC = WalkSpec(1, 20, 750, 500, 5, 60, 10)


# ── 패널 계산 ─────────────────────────────────────────────────────────────


def _log_return(close: Mat, k: int) -> Mat:
    with np.errstate(divide="ignore", invalid="ignore"):
        return np.log(close / lag(close, k))


def _rolling_std(m: Mat, w: int) -> Mat:
    s1 = rolling_sum(m, w)
    s2 = rolling_sum(m * m, w)
    with np.errstate(invalid="ignore"):
        var = (s2 - s1 * s1 / w) / (w - 1)
    return np.sqrt(np.maximum(var, 0.0))


def _nan_rolling_sum(m: Mat, w: int) -> Mat:
    """결측을 0 으로 본 w 행 합(유니버스 거래대금 · 봉 수 — 빈 시간은 거래 0)."""
    c = np.vstack([np.zeros((1, m.shape[1])), np.cumsum(np.nan_to_num(m), axis=0)])
    out = np.full_like(m, np.nan)
    if m.shape[0] >= w:
        out[w - 1 :] = c[w:] - c[: m.shape[0] - w + 1]
    return out


def _clip(m: Mat) -> Mat:
    return np.clip(m, -CLIP, CLIP)


@dataclass(frozen=True, slots=True)
class CellPanel:
    """한 시장의 피처 · σ · 유니버스 — 지평과 무관한 몫."""

    panel: Panel
    features: tuple[Mat, ...]
    sigma: Mat  # 행 단위 σ(코인 = 1시간 · 국내 = 1거래일)
    universe: NDArray[np.bool_]


def crypto_cell_panel(p: Panel, btc: str = "KRW-BTC") -> CellPanel:
    """1시간 격자 패널(행 = 봉 마감 시각) → 피처 7 · σ · 유니버스(매일 00:00 UTC 에 다시 고른 상위 50)."""
    if p.open is None:
        raise ValueError("코인 피처는 시가가 필요하다")
    close = p.close
    r1 = _log_return(close, 1)
    sigma = _rolling_std(r1, CRYPTO_SIGMA_WINDOW)
    r4 = _log_return(close, 4)
    r24 = _log_return(close, 24)
    # 일중 모멘텀 — 그날 00:00 UTC 봉 시가 대비. 행 i 의 봉 시작 = dates[i] − 1시간
    hod = (((p.dates - HOUR) % DAY) // HOUR).astype(np.int64)
    rows = np.arange(p.dates.size, dtype=np.int64)
    start_row = rows - hod
    day_open = np.full_like(close, np.nan)
    ok = start_row >= 0
    day_open[ok] = p.open[start_row[ok]]
    k = (hod + 1).astype(np.float64)[:, None]
    with np.errstate(divide="ignore", invalid="ignore"):
        day = np.log(close / day_open)
        value = close * p.volume
        mean24 = rolling_sum(value, 24) / 24.0
        value_z = np.log(value / mean24)
    value_z[~np.isfinite(value_z)] = np.nan
    b = p.column(btc) if btc in p.symbols else None
    btc_r1 = (
        np.full_like(close, np.nan) if b is None else (r1[:, b] / sigma[:, b])[:, None] * np.ones((1, close.shape[1]))
    )
    btc_r24 = np.full_like(close, np.nan) if b is None else r24[:, b][:, None] * np.ones((1, close.shape[1]))
    with np.errstate(divide="ignore", invalid="ignore"):
        feats = (
            r1 / sigma,
            r4 / (sigma * 2.0),
            r24 / (sigma * math.sqrt(24)),
            day / (sigma * np.sqrt(k)),
            value_z,
            btc_r1,
            (r24 - btc_r24) / (sigma * math.sqrt(24)),
        )
    return CellPanel(p, tuple(_clip(f) for f in feats), sigma, crypto_universe(p))


def crypto_universe(p: Panel) -> NDArray[np.bool_]:
    """매일 00:00 UTC 경계 행에서 직전 720시간 봉 ≥ 600 · 거래대금 상위 50 → 그날 24행에 적용."""
    has = (~np.isnan(p.close)).astype(np.float64)
    bars = _nan_rolling_sum(has, CRYPTO_UNIVERSE_SPAN)
    value = _nan_rolling_sum(p.close * p.volume, CRYPTO_UNIVERSE_SPAN)
    out = np.zeros(p.close.shape, dtype=np.bool_)
    day = (p.dates - 1) // DAY  # 행 = 봉 마감. 00:00 마감 봉은 전날 몫
    first_of_day = np.flatnonzero(np.r_[True, day[1:] != day[:-1]])
    bounds = np.r_[first_of_day, p.dates.size]
    for a, z in pairwise(bounds):
        pick = a - 1  # 그날 첫 행 직전(= 00:00 UTC 마감) 기준
        if pick < 0:
            continue
        eligible = np.nan_to_num(bars[pick], nan=0.0) >= CRYPTO_UNIVERSE_MIN_BARS
        v = np.where(eligible, np.nan_to_num(value[pick], nan=0.0), -1.0)
        top = np.argsort(-v, kind="mergesort")[:CRYPTO_UNIVERSE_TOP]
        top = top[v[top] > 0]
        out[a:z, top] = True
    return out & ~np.isnan(p.close)


def kr_cell_panel(p: Panel, universe: NDArray[np.bool_]) -> CellPanel:
    """거래일 격자 패널 → 피처 7. `universe` 는 kr-universe@1 + 끊김 제외(호출자)
    — 여기서 거래대금 상위 200 으로 좁힌다."""
    if p.open is None:
        raise ValueError("국내 피처는 시가가 필요하다")
    close = p.close
    r1 = _log_return(close, 1)
    sigma = _rolling_std(r1, KR_SIGMA_WINDOW)
    value = close * p.volume
    mean20 = lag(rolling_sum(value, 20) / 20.0, 1)
    with np.errstate(divide="ignore", invalid="ignore"):
        gap = np.log(p.open / lag(close, 1))
        value_z = np.log(value / mean20)
        rng = p.high - p.low
        clv = np.where(rng > 0, (close - p.low) / rng - 0.5, 0.0)
        r1_z = r1 / sigma
    value_z[~np.isfinite(value_z)] = np.nan
    clv = np.where(np.isnan(close), np.nan, clv)
    top = np.zeros_like(universe)
    avg20 = np.nan_to_num(rolling_sum(value, 20) / 20.0, nan=0.0)
    for t in range(close.shape[0]):
        v = np.where(universe[t], avg20[t], -1.0)
        idx = np.argsort(-v, kind="mergesort")[:KR_UNIVERSE_TOP]
        top[t, idx[v[idx] > 0]] = True
    masked = np.where(top, r1_z, np.nan)
    with warnings.catch_warnings():  # 대상이 없는 날(휴장 격자 아님 — 패널 첫 20행) 은 NaN 이 맞다
        warnings.simplefilter("ignore", RuntimeWarning)
        mkt = np.nanmedian(np.where(np.isfinite(masked), masked, np.nan), axis=1)
    with np.errstate(divide="ignore", invalid="ignore"):
        r5_z = _log_return(close, 5) / (sigma * math.sqrt(5))
        r20_z = _log_return(close, 20) / (sigma * math.sqrt(20))
        gap_z = gap / sigma
    feats = (
        r1_z,
        r5_z,
        r20_z,
        gap_z,
        value_z,
        clv,
        mkt[:, None] * np.ones((1, close.shape[1])),
    )
    return CellPanel(p, tuple(_clip(f) for f in feats), sigma, top)


# ── 행 ────────────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class Rows:
    """시각 순 행. y = NaN 이면 라벨 없음(평가 · 학습에서 빠지고 라이브 예측만)."""

    t: NDArray[np.int64]  # 격자 행 번호
    when: NDArray[np.int64]  # epoch 초
    day: NDArray[np.int64]  # 부트스트랩 날짜 키
    sym: NDArray[np.intp]
    x: Mat
    y: Vec
    r: Vec  # 라벨 로그수익(NaN 가능)
    cost: Vec
    sigma_h: Vec  # σ · √h
    persist: Vec  # sign(직전 h 수익)

    @property
    def size(self) -> int:
        return int(self.t.size)


def cell_rows(cp: CellPanel, h: int, label: Mat, cost: Mat | float, day_of: NDArray[np.int64]) -> Rows:
    """유니버스 안 · 피처 전부 있는 행. `label` 은 호출자가 끊김을 지운 라벨 행렬."""
    x3 = np.stack(cp.features, axis=2)
    past_h = _log_return(cp.panel.close, h)
    ok = cp.universe & np.all(np.isfinite(x3), axis=2) & np.isfinite(cp.sigma) & (cp.sigma > 0) & np.isfinite(past_h)
    ti, si = np.nonzero(ok)
    order = np.lexsort((si, ti))
    ti, si = ti[order], si[order]
    r = label[ti, si]
    y = np.where(np.isnan(r), np.nan, (r > 0).astype(np.float64))
    c: Vec = (
        np.asarray(cost[ti, si], dtype=np.float64) if isinstance(cost, np.ndarray) else np.full(ti.size, float(cost))
    )
    return Rows(
        ti.astype(np.int64),
        cp.panel.dates[ti],
        day_of[ti],
        si.astype(np.intp),
        x3[ti, si],
        y,
        r,
        c,
        cp.sigma[ti, si] * math.sqrt(h),
        np.sign(past_h[ti, si]),
    )


def crypto_label(cp: CellPanel, h: int) -> Mat:
    return forward_log_return(cp.panel, h)


# ── walk-forward ──────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class Fit:
    """한 블록의 학습 결과 — 라이브 예측이 그대로 다시 쓴다(jsonb 로 저장)."""

    scaler: Standardizer
    model: LogitFit
    base: float
    persist: LogitFit
    calibrator: BetaCalibrator | None

    def raw(self, x: Mat) -> Vec:
        return sigmoid(_logit(self.base) + self.scaler.transform(x) @ self.model.coef)

    def predict(self, x: Mat) -> Vec:
        p = self.raw(x)
        return p if self.calibrator is None else self.calibrator.apply(p)

    def to_json(self) -> dict[str, object]:
        cal = self.calibrator
        return {
            "median": self.scaler.median.tolist(),
            "mean": self.scaler.mean.tolist(),
            "std": self.scaler.std.tolist(),
            "coef": self.model.coef.tolist(),
            "base": self.base,
            "beta": None if cal is None else {"a": cal.a, "b": cal.b, "c": cal.c, "n": cal.n},
        }

    @staticmethod
    def from_json(d: dict[str, object]) -> Fit:
        def arr(k: str) -> Vec:
            v = d[k]
            assert isinstance(v, list)
            return np.asarray([float(x) for x in v], dtype=np.float64)  # pyright: ignore[reportUnknownVariableType,reportUnknownArgumentType]

        beta = d.get("beta")
        cal = None
        if isinstance(beta, dict):
            cal = BetaCalibrator(float(beta["a"]), float(beta["b"]), float(beta["c"]), int(beta["n"]))  # pyright: ignore[reportUnknownArgumentType]
        base = d["base"]
        assert isinstance(base, (int, float))
        return Fit(
            Standardizer(arr("median"), arr("mean"), arr("std"), ()),
            LogitFit(0.0, arr("coef"), 0),
            float(base),
            LogitFit(0.0, np.zeros(1), 0),
            cal,
        )


def _logit(b: float) -> float:
    return math.log(b / (1 - b))


@dataclass(slots=True)
class WalkResult:
    p_raw: Vec  # NaN = OOS 아님
    p: Vec  # 최종(보정 뒤)
    base: Vec
    p_persist: Vec
    calibrated: NDArray[np.bool_]
    last_fit: Fit | None = None
    blocks: int = 0


def walk_forward(rows: Rows, spec: WalkSpec, n_grid: int) -> WalkResult:
    """블록 시작 T = min_train, min_train + retrain_every,
    … (격자 행 번호). 학습 = t ∈ [T − train_span, T − embargo − h],
    라벨 있는 행. 보정 풀 = 이전 블록 OOS 중 t + h ≤ T − 1
    · t ≥ T − cal_span. 마지막 블록은 격자 끝 다음 행까지 — 라이브용 적합."""
    n = rows.size
    p_raw = np.full(n, np.nan)
    p_fin = np.full(n, np.nan)
    base = np.full(n, np.nan)
    pers = np.full(n, np.nan)
    cal_mask = np.zeros(n, dtype=np.bool_)
    labeled = ~np.isnan(rows.y)
    first_t = int(rows.t[0]) if n else 0
    out = WalkResult(p_raw, p_fin, base, pers, cal_mask)
    starts = list(range(first_t + spec.min_train, n_grid + 1, spec.retrain_every))
    if not starts:
        return out
    for i, start in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else n_grid + 1
        lo, hi = start - spec.train_span, start - spec.embargo - spec.horizon
        a, z = (int(v) for v in np.searchsorted(rows.t, [lo, hi + 1]))
        tr: NDArray[np.intp] = np.arange(a, z, dtype=np.intp)
        tr = tr[labeled[tr]]
        if tr.size < 100:
            continue
        y = rows.y[tr]
        b = float(np.clip(y.mean(), 0.5 / y.size, 1 - 0.5 / y.size))
        off = np.full(tr.size, _logit(b))
        scaler = Standardizer.fit(rows.x[tr])
        model = fit_logistic(scaler.transform(rows.x[tr]), y, L2_LAMBDA, offset=off, intercept=False)
        persist = fit_logistic(rows.persist[tr][:, None], y, L2_LAMBDA, offset=off, intercept=False)
        c0, c1 = (int(v) for v in np.searchsorted(rows.t, [start - spec.cal_span, start - spec.horizon]))
        pool: NDArray[np.intp] = np.arange(c0, c1, dtype=np.intp)
        pool = pool[labeled[pool] & ~np.isnan(p_raw[pool])]
        cal = beta_fit(p_raw[pool], rows.y[pool]) if pool.size >= MIN_CAL_ROWS else None
        fit = Fit(scaler, model, b, persist, cal)
        out.last_fit = fit
        out.blocks += 1
        e0, e1 = np.searchsorted(rows.t, [start, end])
        if e1 <= e0:
            continue
        sl = slice(int(e0), int(e1))
        p_raw[sl] = fit.raw(rows.x[sl])
        p_fin[sl] = fit.predict(rows.x[sl])
        base[sl] = b
        pers[sl] = sigmoid(_logit(b) + rows.persist[sl] * persist.coef[0])
        cal_mask[sl] = cal is not None
    return out


# ── 지표 · 판정 ───────────────────────────────────────────────────────────


@dataclass(slots=True)
class CellResult:
    market: str
    horizon: str
    rows: int = 0
    window: tuple[int, int] = (0, 0)  # epoch 초
    bss: float = float("nan")
    bss_lo: float = float("nan")
    bss_hi: float = float("nan")
    bss_p: float = 1.0  # 단측 — 부트스트랩 BSS ≤ 0 비율
    bss_p_holm: float = 1.0
    bss_persistence: float = float("nan")
    ece: float = float("nan")
    ece_raw: float = float("nan")
    reliability: list[tuple[int, float, float]] = field(default_factory=lambda: [])
    confident: int = 0
    confident_hits: int = 0
    always_up_hits: int = 0
    hit_diff_lo: float = float("nan")
    hit_diff_hi: float = float("nan")
    net_mean: float = float("nan")
    net_lo: float = float("nan")
    net_hi: float = float("nan")
    up_calls: int = 0
    shuffle_lo: float = float("nan")
    shuffle_hi: float = float("nan")
    misses: list[tuple[int, int, float, float]] = field(default_factory=lambda: [])  # (when, sym, p, r)
    z_quantiles: dict[str, tuple[float, float, float]] = field(default_factory=lambda: {})
    status: str = "fail"
    reason: str | None = None


def _per_day(day_idx: NDArray[np.intp], nd: int, w: Vec) -> Vec:
    return np.bincount(day_idx, weights=w, minlength=nd)


def evaluate(market: str, horizon: str, rows: Rows, wf: WalkResult, spec: WalkSpec) -> CellResult:
    """보정이 처음 가능한 행부터 라벨 있는 OOS 행 전부."""
    res = CellResult(market, horizon)
    ev = wf.calibrated & ~np.isnan(rows.y) & ~np.isnan(wf.p)
    if not ev.any():
        res.reason = "no_skill"
        return res
    first = int(np.argmax(ev))
    ev[:first] = False
    p, y, b, pp = wf.p[ev], rows.y[ev], wf.base[ev], wf.p_persist[ev]
    days = rows.day[ev]
    res.rows = int(ev.sum())
    res.window = (int(rows.when[ev][0]), int(rows.when[ev][-1]))
    res.bss, res.bss_lo, res.bss_hi, boots = bss_ci(p, b, y, days, spec.boot_block, N_BOOT, SEED)
    res.bss_p = float(max(np.mean(boots <= 0), 1.0 / (N_BOOT + 1)))
    ref = float(np.sum((pp - y) ** 2))
    res.bss_persistence = 1.0 - float(np.sum((p - y) ** 2)) / ref if ref > 0 else float("nan")
    res.ece = ece(p, y)
    res.ece_raw = ece(wf.p_raw[ev], y)
    res.reliability = reliability_table(p, y)
    # 확신 구간
    up = p >= CONF_UP
    down = p <= CONF_DOWN
    conf = up | down
    hit = np.where(up, y, 1.0 - y)
    res.confident = int(conf.sum())
    res.confident_hits = int(hit[conf].sum())
    res.always_up_hits = int(y[conf].sum())
    _, inv = date_index(days)
    nd = int(inv.max()) + 1
    counts = block_counts(nd, spec.boot_block, N_BOOT, SEED)
    if res.confident:
        n_d = _per_day(inv, nd, conf.astype(np.float64))
        h_d = _per_day(inv, nd, np.where(conf, hit, 0.0))
        u_d = _per_day(inv, nd, np.where(conf, y, 0.0))
        with np.errstate(invalid="ignore", divide="ignore"):
            diff = (counts @ h_d - counts @ u_d) / (counts @ n_d)
        res.hit_diff_lo, res.hit_diff_hi = (float(v) for v in np.nanquantile(diff, [0.025, 0.975]))
    r, cost = rows.r[ev], rows.cost[ev]
    res.up_calls = int(up.sum())
    if res.up_calls:
        net = r - cost
        res.net_mean = float(net[up].mean())
        n_d = _per_day(inv, nd, up.astype(np.float64))
        s_d = _per_day(inv, nd, np.where(up, net, 0.0))
        with np.errstate(invalid="ignore", divide="ignore"):
            m = (counts @ s_d) / (counts @ n_d)
        res.net_lo, res.net_hi = (float(v) for v in np.nanquantile(m, [0.025, 0.975]))
    # 빗나간 확신 — 최근 순
    when, sym = rows.when[ev], rows.sym[ev]
    wrong = np.flatnonzero(conf & (hit == 0))[::-1][:3]
    res.misses = [(int(when[i]), int(sym[i]), float(p[i]), float(r[i])) for i in wrong]
    # 분위 — 직전 365일(국내 250거래일) OOS
    span = 365 * DAY if market == "crypto" else 250
    recent = (when >= when[-1] - span) if market == "crypto" else (rows.t[ev] >= rows.t[ev][-1] - span)
    z = r / rows.sigma_h[ev]
    for name, sel in (("low", p < CONF_DOWN), ("mid", (p >= CONF_DOWN) & (p <= CONF_UP)), ("high", p > CONF_UP)):
        zz = z[recent & sel & np.isfinite(z)]
        if zz.size >= 30:
            q = np.quantile(zz, [0.10, 0.50, 0.90])
            res.z_quantiles[name] = (float(q[0]), float(q[1]), float(q[2]))
    return res


def shuffle_within_day(y: Vec, day: NDArray[np.int64], seed: int) -> Vec:
    """날짜 안 라벨 셔플 — 라벨 없는 행(NaN)은 그 자리에 둔다."""
    rng = np.random.default_rng(seed)
    out = y.copy()
    ok = ~np.isnan(y)
    idx = np.flatnonzero(ok)
    _, inv = np.unique(day[idx], return_inverse=True)
    order = np.lexsort((rng.random(idx.size), inv))
    grouped = idx[order]
    shuffled = np.empty_like(grouped)
    bounds = np.flatnonzero(np.r_[True, np.diff(inv[order]) != 0, True])
    for a, z in pairwise(bounds):
        shuffled[a:z] = rng.permutation(grouped[a:z])
    out[grouped] = y[shuffled]
    return out


def decide(cells: Sequence[CellResult]) -> None:
    """Holm(가족 = 시험한 칸) 뒤 칸마다 통과 · 사유 — 처음 걸린 것 하나."""
    adj = holm([c.bss_p for c in cells])
    for c, a in zip(cells, adj, strict=True):
        c.bss_p_holm = a
        checks = {
            "shuffle_failed": not (c.shuffle_lo <= 0 <= c.shuffle_hi),
            "no_skill": not (a <= ALPHA and c.bss_lo > 0 and c.bss_persistence > 0),
            "miscalibrated": not (c.ece <= MAX_ECE),
            "no_edge_confident": not (c.confident >= MIN_CONFIDENT and c.hit_diff_lo > 0),
            "cost": not (c.net_mean > 0),
        }
        # 평가 행이 없으면(보정 풀이 한 번도 안 찼다) 실력을 잴 수 없다 — 셔플 점검보다 먼저 no_skill
        c.reason = "no_skill" if c.rows == 0 else next((r for r in REASONS if checks[r]), None)
        c.status = "pass" if c.reason is None else "fail"


def live_quantiles(
    zq: dict[str, tuple[float, float, float]], p: float, sigma_h: float
) -> tuple[float, float, float] | None:
    """p 구간의 z 분위 × 지금 σ·√h. 그 구간 분위가 없으면 None(지어내지 않는다)."""
    name = "low" if p < CONF_DOWN else ("high" if p > CONF_UP else "mid")
    q = zq.get(name)
    if q is None:
        return None
    out = sorted(v * sigma_h for v in q)
    return (out[0], out[1], out[2])


def live_underperforms(p: Vec, up: Vec, days: NDArray[np.int64], block: int) -> bool:
    """라이브 소등 — 확신 행 ≥ 300 이고 (확신 적중 − 늘 오른다) 95% CI 상한 < 0(사전등록 [decision] live)."""
    conf = (p >= CONF_UP) | (p <= CONF_DOWN)
    if int(conf.sum()) < MIN_CONFIDENT:
        return False
    hit = np.where(p >= CONF_UP, up, 1.0 - up)
    _, inv = date_index(days)
    nd = int(inv.max()) + 1
    counts = block_counts(nd, block, N_BOOT, SEED)
    n_d = _per_day(inv, nd, conf.astype(np.float64))
    h_d = _per_day(inv, nd, np.where(conf, hit, 0.0))
    u_d = _per_day(inv, nd, np.where(conf, up, 0.0))
    with np.errstate(invalid="ignore", divide="ignore"):
        diff = (counts @ h_d - counts @ u_d) / (counts @ n_d)
    return bool(np.nanquantile(diff, 0.975) < 0)


@dataclass(frozen=True, slots=True)
class Track:
    """화면 성적 묶음 — 확신 행 수 · 적중 · 같은 행 '늘 오른다' 적중 · 최근 빗나간 확신 3(행 번호)."""

    calls: int
    hits: int
    always_up: int
    misses: tuple[int, ...]


def live_track(p: Vec, realized: Vec) -> Track | None:
    """라이브 확신 행 ≥ 300 이면 라이브 성적(사전등록 [decision] live).
    모자라면 None — 과거 검산 성적 그대로(합산 0)."""
    up = (realized > 0).astype(np.float64)
    conf = (p >= CONF_UP) | (p <= CONF_DOWN)
    if int(conf.sum()) < MIN_CONFIDENT:
        return None
    hit = np.where(p >= CONF_UP, up, 1.0 - up)
    wrong = np.flatnonzero(conf & (hit == 0))[::-1][:3]
    return Track(int(conf.sum()), int(hit[conf].sum()), int(up[conf].sum()), tuple(int(i) for i in wrong))
