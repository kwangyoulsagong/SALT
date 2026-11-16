"""H1 흔들림 · 범위 — 사전등록 `vol-range@1`(FC-REQ-028 FR-9 · F017 v4 순서 4). 순수 계산, I/O 없음.

행렬은 (봉, 종목) — 행 t 는 봉 t 의 available_at 에 닫힌 값만 담는다.

## 시점 규칙 (time-and-leakage.md)

- 피처(ln RV_t · 5봉 · 22봉 평균)는 행 ≤ t. 목표 RV_{t+1..t+h} · 수익 r_{t+1..t+h} 는 적합 · 채점에만.
- 적합 f(매월 첫 봉)는 라벨이 닫히고 퍼지 h 봉 · 엠바고 5 봉을 지난 행만: t ≤ f − h − 5.
  예측 행은 [f, 다음 적합) — 행 t 는 적합 f ≤ t 만 쓴다.
- 컨포멀 보정은 행 t 에서 라벨이 닫힌(t' + h ≤ t) 직전 250 날짜의 점수만.

## 등록 해석 (첫 실행 전에 코드로 고정 — 2026-11-16)

- "직전 250 표본" = **직전 250 날짜**의 (종목, 날) 점수 전부. 풀링 패널에서 250 행은 하루치도 안 돼 그날 시장 하나의
  흔들림만 담는다 — 등록의 n_eff 규칙(날짜 군집)과 같은 단위로 읽는다.
- RV ≤ 0(그날 가격이 한 번도 안 움직임) · 로그를 못 하는 행은 HAR · 기준 셋 모두에서 같이 뺀다(건수는 리포트).
- 창 평균(5 · 22 봉 피처 · B3)은 있는 값 ≥ 80% 의 평균(`domain/har.MIN_PRESENT` — kr-scale@1 과 같다). 결측 0 만
  허용하면 수집이 반나절 빈 하루(맥 잠)가 시장 전체를 22일 지운다 —
  첫 시험 실행(2026-11-16, 판정 숫자 전)에서 드러난 결함.
- 1차 판정 자료가 등록 때 자료보다 짧으면(새 맥 백필 중) 판정하지 않는다 — `history_short`. 그동안도 전진 예측은 쓴다.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.base_rate import holm
from salt_forecast.domain.har import MIN_PRESENT
from salt_forecast.domain.series import DAY, OhlcvSeries

KEY = "vol-range@1"
HORIZONS = (1, 5)
MARKETS = ("kr", "crypto")
BASELINES = ("b1", "b2", "b3")
EMBARGO = 5
EWMA_LAMBDA = 0.94
EWMA_SEED = 30
CONF_DATES = 250
LEVELS = (0.80, 0.95)
COVER_BAND = {0.80: (0.78, 0.82), 0.95: (0.93, 0.97)}
YEAR_TOL = 0.05
FIRST_FIT = {"kr": 250, "crypto": 180}
CRYPTO_MIN_HOURS = 22
PLACEBO_BLOCK = 20
PLACEBO_SEED = 20261113
HOLM_ALPHA = 0.05
# 등록 시점 자료 시작(2026-11-13 실측) — 1차 판정 자료가 이보다 늦게 시작하면 history_short
DATA_START = {"kr": date(2021, 10, 12), "crypto": date(2024, 11, 1)}
DATA_START_TOL_DAYS = 31
HISTORY_END = datetime(2026, 11, 12, 15, 0, tzinfo=UTC)  # 2026-11-13 00:00 KST — 등록 [decision] 자료 끝 2026-11-12
REGISTERED_AT = datetime(2026, 11, 13, 2, 49, 40, tzinfo=UTC)  # 등록 커밋 51f6018d — 전진 표본은 이 뒤 기준 봉만
LOOKS = (date(2027, 1, 12), date(2027, 2, 11), date(2027, 3, 13))
ALPHA_PER_LOOK = 0.0166667
FORWARD_MIN_DAYS = 30
HOUR = 3600
_KST = timedelta(hours=9)

Mat = NDArray[np.float64]
Vec = NDArray[np.float64]


@dataclass(frozen=True, slots=True)
class VolPanel:
    """dates = 봉 available_at(epoch). rv = 그 봉의 실현분산 · ret = 직전 봉 종가 → 이 봉 종가 로그수익.
    eligible = 평가 대상(국내 kr-universe@1 · 끊김 창 제외 / 코인 전부). breaks = 국내 끊김(코인 없음)."""

    market: str
    dates: NDArray[np.int64]
    symbols: tuple[str, ...]
    rv: Mat
    ret: Mat
    close: Mat
    eligible: NDArray[np.bool_]
    breaks: NDArray[np.bool_] | None = None
    negative_gk: int = 0


# ── 목표 ──


def crypto_daily_rv(series: Mapping[str, OhlcvSeries], start: int, end: int) -> VolPanel:
    """업비트 1h → 하루(KST 09:00 ~ 다음 날 09:00 = available_at 00:00 UTC) 실현분산.

    RV = 그날 1h 로그수익 제곱합(바로 앞 봉이 정확히 1시간 전일 때만). 그날 봉 < 22 이면 그날 없음.
    종가 = 그날 마지막 봉 종가."""
    first = start - start % DAY + DAY if start % DAY else start
    dates = np.arange(first, end - end % DAY + 1, DAY, dtype=np.int64)
    syms = tuple(sorted(series))
    shape = (dates.size, len(syms))
    rv = np.full(shape, np.nan)
    close = np.full(shape, np.nan)
    for j, s in enumerate(syms):
        o = series[s]
        t = o.available_at
        if t.size < 2:
            continue
        day_end = ((t - 1) // DAY + 1) * DAY
        row = (day_end - first) // DAY
        inside = (row >= 0) & (row < dates.size)
        with np.errstate(divide="ignore", invalid="ignore"):
            r = np.log(o.close[1:] / o.close[:-1])
        ok = ((t[1:] - t[:-1]) == HOUR) & np.isfinite(r) & inside[1:]
        sq = np.zeros(dates.size)
        np.add.at(sq, row[1:][ok], r[ok] ** 2)
        bars = np.bincount(row[inside], minlength=dates.size)[: dates.size]
        full = bars >= CRYPTO_MIN_HOURS
        rv[full, j] = sq[full]
        last = np.full(dates.size, -1, dtype=np.int64)
        np.maximum.at(last, row[inside], np.flatnonzero(inside))
        has = full & (last >= 0)
        close[has, j] = o.close[last[has]]
    with np.errstate(divide="ignore", invalid="ignore"):
        ret = np.vstack([np.full((1, len(syms)), np.nan), np.log(close[1:] / close[:-1])])
    eligible = np.isfinite(rv)
    return VolPanel("crypto", dates, syms, rv, ret, close, eligible)


def garman_klass(open_: Mat, high: Mat, low: Mat, close: Mat) -> tuple[Mat, int]:
    """밤사이 갭 포함 Garman–Klass(등록 target_kr). 음수 칸은 NaN(0 으로 자르지 않는다) — (값, 음수 건수)."""
    prev = np.vstack([np.full((1, close.shape[1]), np.nan), close[:-1]])
    with np.errstate(divide="ignore", invalid="ignore"):
        hl = np.log(high / low)
        co = np.log(close / open_)
        gap = np.log(open_ / prev)
        gk = 0.5 * hl**2 - (2 * math.log(2) - 1) * co**2 + gap**2
    neg = np.isfinite(gk) & (gk < 0)
    return np.where(neg, np.nan, gk), int(neg.sum())


# ── 피처 · 목표 · 기준 ──


def _roll_mean(m: Mat, w: int, min_present: float = 1.0) -> Mat:
    """행 t 까지 w 행 중 있는 값의 평균. 있는 값 < min_present × w 면 NaN(기본 = 결측 0 만)."""
    out = np.full_like(m, np.nan)
    if m.shape[0] < w:
        return out
    c = np.vstack([np.zeros((1, m.shape[1])), np.cumsum(np.nan_to_num(m), axis=0)])
    have = np.vstack([np.zeros((1, m.shape[1])), np.cumsum(np.isfinite(m), axis=0)])
    s = c[w:] - c[:-w]
    n = have[w:] - have[:-w]
    with np.errstate(divide="ignore", invalid="ignore"):
        out[w - 1 :] = np.where(n >= min_present * w - 1e-9, s / n, np.nan)
    return out


def _log_pos(m: Mat) -> Mat:
    with np.errstate(divide="ignore", invalid="ignore"):
        return np.where(m > 0, np.log(m), np.nan)


def features(rv: Mat) -> NDArray[np.float64]:
    """(봉, 종목, 3) — ln RV_t · ln mean(RV_{t−4..t}) · ln mean(RV_{t−21..t}).
    창 평균은 있는 값 ≥ 80%(`har.MIN_PRESENT`)."""
    return np.stack(
        [_log_pos(rv), _log_pos(_roll_mean(rv, 5, MIN_PRESENT)), _log_pos(_roll_mean(rv, 22, MIN_PRESENT))], axis=-1
    )


def forward_sum(rv: Mat, h: int) -> Mat:
    """행 t 의 목표 RV_{t+1..t+h}. 하나라도 없으면 NaN."""
    out = np.full_like(rv, np.nan)
    if rv.shape[0] <= h:
        return out
    s = _roll_mean(rv, h) * h  # 행 t+h 에 [t+1, t+h] 합
    out[:-h] = s[h:]
    return out


def forward_return(close: Mat, h: int, breaks: NDArray[np.bool_] | None = None) -> Mat:
    """ln C_{t+h} / C_t. 국내는 (t, t+h] 에 끊김이 있으면 NaN."""
    out = np.full_like(close, np.nan)
    if close.shape[0] <= h:
        return out
    with np.errstate(divide="ignore", invalid="ignore"):
        out[:-h] = np.log(close[h:] / close[:-h])
    if breaks is not None:
        c = np.cumsum(breaks, axis=0)
        out[:-h] = np.where(c[h:] > c[:-h], np.nan, out[:-h])
    return out


def ewma_var(ret: Mat) -> Mat:
    """RiskMetrics λ 0.94 — 행 t 까지 수익 제곱의 지수 평균. 수익 없는 봉은 건너뛴다. 갱신 < 30 이면 NaN."""
    out = np.full_like(ret, np.nan)
    e: Vec = np.full(ret.shape[1], np.nan)
    n = np.zeros(ret.shape[1], dtype=np.int64)
    sq = ret**2
    for t in range(ret.shape[0]):
        ok = np.isfinite(sq[t])
        row: Vec = sq[t]
        upd: Vec = np.where(np.isnan(e), row, EWMA_LAMBDA * e + (1 - EWMA_LAMBDA) * row)
        e = np.where(ok, upd, e)
        n += ok
        out[t] = np.where(n >= EWMA_SEED, e, np.nan)
    return out


def baselines(rv: Mat, ret: Mat, h: int) -> dict[str, Mat]:
    """B1 어제와 같다 · B2 EWMA · B3 과거 22봉 평균 — 전부 × h."""
    return {"b1": rv * h, "b2": ewma_var(ret) * h, "b3": _roll_mean(rv, 22, MIN_PRESENT) * h}


# ── HAR 적합 ──


@dataclass(frozen=True, slots=True)
class HarFit:
    """ln RV_{t+1..t+h} = β·[1, x]. 역변환 exp(ŷ + s²/2)."""

    beta: Vec
    s2: float
    rows: int
    fit_at: int  # 적합 봉 available_at

    def predict(self, x: NDArray[np.float64]) -> NDArray[np.float64]:
        with np.errstate(over="ignore", invalid="ignore"):
            return np.exp(self.beta[0] + x @ self.beta[1:] + self.s2 / 2)

    def to_json(self) -> dict[str, object]:
        return {"beta": [float(b) for b in self.beta], "s2": self.s2, "rows": self.rows, "fitAt": self.fit_at}

    @staticmethod
    def from_json(d: Mapping[str, object]) -> HarFit:
        beta = d["beta"]
        if not isinstance(beta, list):
            raise ValueError("beta 가 목록이 아니다")
        return HarFit(np.array(beta, dtype=np.float64), float(d["s2"]), int(d["rows"]), int(d["fitAt"]))  # pyright: ignore[reportArgumentType]


def fit_har(x: NDArray[np.float64], y: Mat, rows: NDArray[np.bool_], fit_at: int) -> HarFit | None:
    """x (봉, 종목, 3) · y 목표 RV · rows 적합에 쓸 칸. 행 < 80 이면 None."""
    xs = x[rows]
    ly = _log_pos(y[rows][:, None])[:, 0]
    ok = np.isfinite(ly) & np.isfinite(xs).all(axis=1)
    xs, ly = xs[ok], ly[ok]
    if ly.size < 80:
        return None
    design = np.column_stack([np.ones(ly.size), xs])
    beta, *_ = np.linalg.lstsq(design, ly, rcond=None)
    resid = ly - design @ beta
    s2 = float(resid @ resid / max(ly.size - design.shape[1], 1))
    return HarFit(beta.astype(np.float64), s2, int(ly.size), fit_at)


def month_starts(dates: NDArray[np.int64], first_row: int) -> list[int]:
    """첫 적합 행 + 그 뒤 KST 달이 바뀐 첫 봉 행들(재적합 매월 1일)."""
    if first_row >= dates.size:
        return []
    months = np.array(
        [(datetime.fromtimestamp(int(t), UTC) + _KST).year * 12 + (datetime.fromtimestamp(int(t), UTC) + _KST).month
         for t in dates]
    )  # fmt: skip
    out = [first_row]
    for t in range(first_row + 1, dates.size):
        if months[t] != months[t - 1]:
            out.append(t)
    return out


def first_fit_row(market: str, dates: NDArray[np.int64]) -> int:
    """국내 = 처음 250 봉 뒤 · 코인 = 처음 180 일 뒤."""
    if market == "kr":
        return FIRST_FIT["kr"]
    return int(np.searchsorted(dates, int(dates[0]) + FIRST_FIT["crypto"] * DAY)) if dates.size else 0


@dataclass(frozen=True, slots=True)
class WalkForward:
    """행렬 (봉, 종목) 예측. NaN = 그 칸 예측 없음. fits = 적합 시각 순."""

    har: Mat
    base: dict[str, Mat]
    fits: list[HarFit]
    fit_row: NDArray[np.int64]  # 행마다 쓰인 적합 번호(−1 = 없음)


def walk_forward(
    market: str,
    dates: NDArray[np.int64],
    x: NDArray[np.float64],
    y: Mat,
    base: dict[str, Mat],
    eligible: NDArray[np.bool_],
    h: int,
    end_row: int | None = None,
) -> WalkForward:
    """확장 창 · 매월 재적합. end_row 를 주면 그 행까지만 예측한다(그 뒤 자료는 보지 않는다 — 적합은 행 기준)."""
    n = dates.size if end_row is None else end_row + 1
    har = np.full(y.shape, np.nan)
    fit_row = np.full(dates.size, -1, dtype=np.int64)
    fits: list[HarFit] = []
    starts = [f for f in month_starts(dates[:n], first_fit_row(market, dates)) if f < n]
    rows_idx = np.arange(dates.size)[:, None]
    for k, f in enumerate(starts):
        train = eligible & (rows_idx <= f - h - EMBARGO)
        fit = fit_har(x, y, train, int(dates[f]))
        if fit is None:
            continue
        stop = starts[k + 1] if k + 1 < len(starts) else n
        fits.append(fit)
        fit_row[f:stop] = len(fits) - 1
        har[f:stop] = np.where(eligible[f:stop], fit.predict(x[f:stop]), np.nan)
    masked = {b: np.where(fit_row[:, None] >= 0, v, np.nan) for b, v in base.items()}
    return WalkForward(har, masked, fits, fit_row)


# ── 컨포멀 구간 ──


def conformal_q(score: Mat, h: int, levels: Sequence[float] = LEVELS) -> Mat:
    """(봉, 수준) — 행 t 의 폭 배수. 라벨이 닫힌(행 ≤ t − h) 점수가 있는 날 중 마지막 250 날의 점수 전부.
    그런 날이 250 이 안 되면 NaN.

    분위 = 유한 표본 보정 ceil((n + 1)·α)/n(높은 쪽)."""
    t_n = score.shape[0]
    out = np.full((t_n, len(levels)), np.nan)
    days = np.flatnonzero(np.isfinite(score).any(axis=1))
    for t in range(t_n):
        k = int(np.searchsorted(days, t - h, side="right"))
        if k < CONF_DATES:
            continue
        s = score[days[k - CONF_DATES : k]]
        s = s[np.isfinite(s)]
        n = s.size
        for k, a in enumerate(levels):
            out[t, k] = float(np.quantile(s, min(1.0, math.ceil((n + 1) * a) / n), method="higher"))
    return out


def scores(r: Mat, har: Mat) -> Mat:
    with np.errstate(divide="ignore", invalid="ignore"):
        return np.abs(r) / np.sqrt(har)


# ── 손실 · 검정 ──


def qlike(rv: Mat, pred: Mat) -> Mat:
    """RV/ŷ − ln(RV/ŷ) − 1. RV ≤ 0 · ŷ ≤ 0 은 NaN."""
    with np.errstate(divide="ignore", invalid="ignore"):
        q = rv / pred
        return np.where((rv > 0) & (pred > 0), q - np.log(q) - 1, np.nan)


def newey_west_se(d: Vec, lag: int) -> float:
    """평균의 HAC 표준오차(Bartlett)."""
    n = d.size
    if n < 2:
        return float("nan")
    e = d - d.mean()
    v = float(e @ e) / n
    for k in range(1, min(lag, n - 1) + 1):
        v += 2 * (1 - k / (lag + 1)) * float(e[k:] @ e[:-k]) / n
    return math.sqrt(max(v, 0.0) / n)


def _phi(z: float) -> float:
    return 0.5 * math.erfc(-z / math.sqrt(2))


@dataclass(frozen=True, slots=True)
class DmTest:
    """HAR − 기준 날짜별 평균 손실 차이 d. p = 단측(HAR 가 작다)."""

    baseline: str
    mean_d: float
    t: float
    p: float
    days: int


def dm_test(loss_har: Mat, loss_base: Mat, mask: NDArray[np.bool_], h: int, name: str) -> DmTest:
    """종목을 날짜 안에서 먼저 평균 → 날짜 시계열 d_t · Newey–West 시차 h + 5."""
    ok = mask & np.isfinite(loss_har) & np.isfinite(loss_base)
    cnt = ok.sum(axis=1)
    keep = cnt > 0
    diff = np.where(ok, loss_har - loss_base, 0.0).sum(axis=1)
    d = diff[keep] / cnt[keep]
    if d.size < 2:
        return DmTest(name, float("nan"), float("nan"), 1.0, int(d.size))
    se = newey_west_se(d, h + EMBARGO)
    t = float(d.mean() / se) if se > 0 else float("nan")
    return DmTest(name, float(d.mean()), t, _phi(t) if math.isfinite(t) else 1.0, int(d.size))


@dataclass(slots=True)
class CellResult:
    """한 칸(시장 × 지평)의 과거 1차 판정 재료 · 결과."""

    market: str
    horizon: int
    rows: int = 0
    days: int = 0
    window: tuple[int, int] = (0, 0)
    qlike: dict[str, float] = field(default_factory=dict[str, float])
    dm: list[DmTest] = field(default_factory=list[DmTest])
    p_holm: dict[str, float] = field(default_factory=dict[str, float])
    cover: dict[float, float] = field(default_factory=dict[float, float])
    cover_rows: int = 0
    cover_by_year: dict[int, dict[float, float]] = field(default_factory=dict[int, dict[float, float]])
    excluded_nonpos: int = 0
    placebo_pass: bool = False
    pass_a: bool = False
    pass_b: bool = False
    status: str = "history_short"
    reason: str | None = None


def _year(t: int) -> int:
    return (datetime.fromtimestamp(t, UTC) + _KST).year


def evaluate_cell(
    market: str,
    h: int,
    dates: NDArray[np.int64],
    y: Mat,
    r: Mat,
    wf: WalkForward,
    q: Mat,
    end_t: int,
) -> CellResult:
    """판정 행 = 예측 넷 다 있고 목표 > 0 이고 라벨이 end_t 전에 닫힌 행. QLIKE · DM(기준 셋) · 덮임."""
    out = CellResult(market, h)
    n = dates.size
    closed = np.zeros(n, dtype=np.bool_)
    if n > h:
        closed[: n - h] = dates[h:] <= end_t
    preds = [wf.har, *wf.base.values()]
    all_pred = np.logical_and.reduce([np.isfinite(p) & (p > 0) for p in preds])
    base_rows = closed[:, None] & all_pred & np.isfinite(y)
    mask = base_rows & (y > 0)
    out.excluded_nonpos = int((base_rows & ~(y > 0)).sum())
    out.rows = int(mask.sum())
    day_rows = np.flatnonzero(mask.any(axis=1))
    out.days = int(day_rows.size)
    if out.rows == 0:
        return out
    out.window = (int(dates[day_rows[0]]), int(dates[day_rows[-1]]))
    lh = qlike(y, wf.har)
    out.qlike["har"] = float(np.nanmean(np.where(mask, lh, np.nan)))
    for b, pred in wf.base.items():
        lb = qlike(y, pred)
        out.qlike[b] = float(np.nanmean(np.where(mask, lb, np.nan)))
        out.dm.append(dm_test(lh, lb, mask, h, b))
    cov_mask = mask & np.isfinite(r) & np.isfinite(q[:, :1])
    out.cover_rows = int(cov_mask.sum())
    if out.cover_rows:
        width = np.sqrt(wf.har)
        years = np.array([_year(int(t)) for t in dates])
        for k, a in enumerate(LEVELS):
            hit = np.abs(r) <= q[:, k : k + 1] * width
            out.cover[a] = float(hit[cov_mask].mean())
            for yv in np.unique(years[cov_mask.any(axis=1)]):
                m = cov_mask & (years == yv)[:, None]
                out.cover_by_year.setdefault(int(yv), {})[a] = float(hit[m].mean())
    return out


def coverage_ok(cover: Mapping[float, float], by_year: Mapping[int, Mapping[float, float]] | None) -> bool:
    """덮임 80 · 95 가 [78, 82] · [93, 97] 안 + (과거 판정이면) 어느 해도 목표 ±5%p 밖이 아니다."""
    if any(a not in cover for a in LEVELS):
        return False
    if not all(COVER_BAND[a][0] - 1e-9 <= cover[a] <= COVER_BAND[a][1] + 1e-9 for a in LEVELS):
        return False
    if by_year is None:
        return True
    return all(abs(v - a) <= YEAR_TOL + 1e-9 for yr in by_year.values() for a, v in yr.items())


def holm_family(cells: Sequence[CellResult], alpha: float) -> None:
    """칸 × 기준 전부를 한 가족으로 Holm. pass_a = 기준 셋 모두 QLIKE 작고 Holm p ≤ α."""
    tests = [(c, d) for c in cells for d in c.dm]
    adj = holm([d.p for _, d in tests])
    for (c, d), p in zip(tests, adj, strict=True):
        c.p_holm[d.baseline] = p
    for c in cells:
        c.pass_a = len(c.dm) == len(BASELINES) and all(c.p_holm[d.baseline] <= alpha and d.mean_d < 0 for d in c.dm)


def judge_history(cells: Sequence[CellResult], placebo: Mapping[str, bool], short: Mapping[str, bool]) -> None:
    """1차 판정 — 칸마다 no_skill(a) > miscalibrated(b) > placebo. 시장 자료가 짧으면 history_short.

    placebo[market] = 그 시장 플라시보 HAR 가 어느 칸이든 통과했나(참이면 그 시장 전체 보류 — fail placebo)."""
    for c in cells:
        c.placebo_pass = not placebo.get(c.market, False)
        c.pass_b = coverage_ok(c.cover, c.cover_by_year)
        if short.get(c.market, True):
            c.status, c.reason = "history_short", "data_short"
        elif not c.pass_a:
            c.status, c.reason = "fail", "no_skill"
        elif not c.pass_b:
            c.status, c.reason = "fail", "miscalibrated"
        elif not c.placebo_pass:
            c.status, c.reason = "fail", "placebo"
        else:
            c.status, c.reason = "forward", None


def block_shuffle(n: int, block: int, seed: int) -> NDArray[np.int64]:
    """행 순서를 block 행 묶음으로 섞은 색인(묶음 안 순서는 그대로)."""
    rng = np.random.default_rng(seed)
    starts = list(range(0, n, block))
    order = rng.permutation(len(starts))
    return np.concatenate([np.arange(starts[int(i)], min(starts[int(i)] + block, n)) for i in order]).astype(np.int64)


def data_short(market: str, first_date: int) -> bool:
    """1차 판정 자료가 등록 때보다 늦게 시작하나."""
    first = (datetime.fromtimestamp(first_date, UTC) + _KST).date()
    return (first - DATA_START[market]).days > DATA_START_TOL_DAYS


# ── 전진 시험 ──


@dataclass(frozen=True, slots=True)
class ForwardRow:
    """닫힌 전진 예측 하나."""

    symbol: str
    ref_at: int
    har: float
    base: Mapping[str, float]
    half80: float
    half95: float
    realized_rv: float
    realized_r: float


@dataclass(slots=True)
class ForwardResult:
    market: str
    horizon: int
    rows: int = 0
    days: int = 0
    qlike: dict[str, float] = field(default_factory=dict[str, float])
    dm: list[DmTest] = field(default_factory=list[DmTest])
    p_holm: dict[str, float] = field(default_factory=dict[str, float])
    cover: dict[float, float] = field(default_factory=dict[float, float])
    pass_a: bool = False
    pass_b: bool = False


def forward_result(market: str, h: int, rows: Sequence[ForwardRow]) -> ForwardResult:
    """전진 표본(라벨 닫힘 · 제때 기록)을 날짜 × 종목 행렬로 펴서 같은 손실 · DM · 덮임."""
    out = ForwardResult(market, h)
    keep = [x for x in rows if x.realized_rv > 0 and x.har > 0 and all(v > 0 for v in x.base.values())]
    if not keep:
        return out
    days = sorted({x.ref_at for x in keep})
    syms = sorted({x.symbol for x in keep})
    di = {d: i for i, d in enumerate(days)}
    si = {s: j for j, s in enumerate(syms)}
    shape = (len(days), len(syms))
    y, har, r = np.full(shape, np.nan), np.full(shape, np.nan), np.full(shape, np.nan)
    base = {b: np.full(shape, np.nan) for b in BASELINES}
    hit = {a: np.full(shape, np.nan) for a in LEVELS}
    for x in keep:
        i, j = di[x.ref_at], si[x.symbol]
        y[i, j], har[i, j], r[i, j] = x.realized_rv, x.har, x.realized_r
        for b in BASELINES:
            base[b][i, j] = x.base[b]
        hit[0.80][i, j] = float(abs(x.realized_r) <= x.half80)
        hit[0.95][i, j] = float(abs(x.realized_r) <= x.half95)
    mask = np.isfinite(y)
    out.rows, out.days = len(keep), len(days)
    lh = qlike(y, har)
    out.qlike["har"] = float(np.nanmean(lh))
    for b in BASELINES:
        lb = qlike(y, base[b])
        out.qlike[b] = float(np.nanmean(lb))
        out.dm.append(dm_test(lh, lb, mask, h, b))
    for a in LEVELS:
        out.cover[a] = float(np.nanmean(hit[a]))
    return out


def look_due(today: date, done: int) -> int | None:
    """오늘까지 지난 판정 날짜 중 아직 안 한 첫 번째(0부터). 맥이 그날 잠들어도 다음 실행이 한다."""
    for i, d in enumerate(LOOKS):
        if i >= done and today >= d:
            return i
    return None


def forward_judge(cells: Mapping[str, ForwardResult], look: int) -> dict[str, tuple[str, str | None]]:
    """판정 날짜 — 날 ≥ 30 인 칸만 그날 가족(칸 × 기준)에서 Holm α 0.0167. 통과 = pass_a · pass_b(덮임 띠).
    마지막 날짜에 못 넘으면 fail, 그 전이면 forward."""
    judged = {k: c for k, c in cells.items() if c.days >= FORWARD_MIN_DAYS}
    tests = [(k, d) for k, c in judged.items() for d in c.dm]
    adj = holm([d.p for _, d in tests])
    for (k, d), p in zip(tests, adj, strict=True):
        judged[k].p_holm[d.baseline] = p
    last = look == len(LOOKS) - 1
    out: dict[str, tuple[str, str | None]] = {}
    for k, c in cells.items():
        if k in judged:
            c.pass_a = len(c.dm) == len(BASELINES) and all(
                c.p_holm[d.baseline] <= ALPHA_PER_LOOK and d.mean_d < 0 for d in c.dm
            )
            c.pass_b = coverage_ok(c.cover, None)
            if c.pass_a and c.pass_b:
                out[k] = ("pass", None)
                continue
            reason = "no_skill" if not c.pass_a else "miscalibrated"
        else:
            reason = "below_min"
        out[k] = ("fail", reason) if last else ("forward", f"look{look + 1}_{reason}")
    return out


# ── 전체 실행 묶음 ──


@dataclass(frozen=True, slots=True)
class MarketPrep:
    """시장 하나의 행렬 — 목표 · 수익 · 기준 · 피처를 지평마다."""

    panel: VolPanel
    x: NDArray[np.float64]
    y: dict[int, Mat]
    r: dict[int, Mat]
    base: dict[int, dict[str, Mat]]


def prepare(panel: VolPanel) -> MarketPrep:
    x = features(panel.rv)
    y = {h: forward_sum(panel.rv, h) for h in HORIZONS}
    r = {h: forward_return(panel.close, h, panel.breaks) for h in HORIZONS}
    base = {h: baselines(panel.rv, panel.ret, h) for h in HORIZONS}
    return MarketPrep(panel, x, y, r, base)


def run_cell(
    prep: MarketPrep, h: int, end_row: int, end_t: int, shuffle: Callable[[int], NDArray[np.int64]] | None = None
) -> tuple[CellResult, WalkForward, Mat]:
    """walk-forward → 점수 → 컨포멀 → 판정 재료. shuffle 이 있으면 피처 행을 섞은 플라시보."""
    p = prep.panel
    x = prep.x if shuffle is None else prep.x[shuffle(p.dates.size)]
    wf = walk_forward(p.market, p.dates, x, prep.y[h], prep.base[h], p.eligible, h, end_row)
    q = conformal_q(scores(prep.r[h], wf.har), h)
    return evaluate_cell(p.market, h, p.dates, prep.y[h], prep.r[h], wf, q, end_t), wf, q
