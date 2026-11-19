"""밸류에이션 밴드 적립 — 지표 · 밴드 · 과거 검산 · 실패 사례(사전등록 band-accumulation@1 · FC-REQ-029 · F003 v2).

순수 계산이다. 시각은 전부 UTC epoch 초(int), 인자로 받는다 — 지금 시각을 읽지 않는다.
시점 고정은 `VintagedSeries`(available ≤ t) 한 길로만 한다(time-and-leakage.md §1).

검산 지표는 평균 단가가 아니라 **52주 뒤 수익률의 배수 가중 평균 − 정액 평균**이다 —
가격과 반대로 사는 어떤 규칙도 평균 단가를
낮춘다. 배수가 미래 수익과 같이 움직였는지만 본다(사전등록 why_not_cost).
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.asof_series import VintagedSeries

DAY = 86_400
WEEK = 7 * DAY
HORIZON = 364 * DAY
# 라벨 가격을 알게 되는 지연 상한 — BTC +2일(Coin Metrics) · 코스피 +1일(ECOS). 둘 다 2일로 보수적으로 닫는다
LABEL_LAG = 2 * DAY

MIN_CLOSED_WEEKS = 260
BOOTSTRAP_DRAWS = 2000
BOOTSTRAP_SEED = 20261119
BLOCK_WEEKS = 52
CASE_GAP_WEEKS = 26
TOP_CASES = 3

BTC_MIN_HISTORY_DAYS = 365
BTC_MAX_STALE = 7 * DAY
KOSPI_MIN_MONTHS = 60
KOSPI_MAX_PER_AGE = 130 * DAY  # band-accumulation@2 — @1 100일은 발표 지연 50일과 어긋났다
KOSPI_MAX_INDEX_STALE = 10 * DAY


@dataclass(frozen=True, slots=True)
class Band:
    key: str
    below: float  # 이 값 미만이면 이 밴드(마지막은 inf)
    multiplier: float


BTC_BANDS: tuple[Band, ...] = (
    Band("extreme_low", 0.0, 3.0),
    Band("low", 2.0, 2.0),
    Band("neutral", 5.0, 1.0),
    Band("high", 7.0, 0.5),
    Band("extreme_high", math.inf, 0.0),
)
KOSPI_BANDS: tuple[Band, ...] = (
    Band("extreme_low", 0.20, 3.0),
    Band("low", 0.50, 2.0),
    Band("neutral", 0.80, 1.0),
    Band("high", 0.95, 0.5),
    Band("extreme_high", math.inf, 0.25),
)


def band_of(value: float, bands: Sequence[Band]) -> Band:
    """경계값은 위 밴드(`below` 미만만 그 밴드 — Z 2.0 은 neutral)."""
    if math.isnan(value):
        raise ValueError("지표 값이 NaN")
    for b in bands:
        if value < b.below:
            return b
    return bands[-1]


@dataclass(frozen=True, slots=True)
class Reading:
    """t 에 알던 지표 한 점."""

    value: float  # BTC = Z · 코스피 = PER 추정
    percentile: float | None  # 코스피만
    basis_observed: int  # 그 값의 근거 관측(BTC 관측일 · 코스피 PER 달 첫날)
    estimated: bool  # 코스피 월 사이 추정이면 True
    secondary: float | None  # 코스피 배당수익률(표시만)


def latest_point(series: VintagedSeries, t: int, cutoff: int | None = None) -> tuple[int, float] | None:
    """t 에 알던, observed ≤ cutoff 인 가장 최근 관측 (observed, 값) — 그 관측의 t 기준 최신 빈티지."""
    c = t if cutoff is None else min(cutoff, t)
    known = (series.available <= t) & (series.observed <= c)
    if not known.any():
        return None
    obs = int(series.observed[known].max())
    idx = np.flatnonzero(known & (series.observed == obs))
    return obs, float(series.value[idx[np.argmax(series.available[idx])]])


def btc_reading(t: int, mvrv: VintagedSeries, mcap: VintagedSeries) -> Reading | None:
    """MVRV Z = (MC − MC ÷ MVRV) ÷ sd(MC 일값, 그 관측일까지 확장 창). 365일 미만 · 7일 넘게 묵으면 None."""
    m = latest_point(mvrv, t)
    c = latest_point(mcap, t)
    if m is None or c is None or m[0] != c[0] or m[1] <= 0:
        return None
    obs = m[0]
    if t - obs > BTC_MAX_STALE:
        return None
    known = (mcap.available <= t) & (mcap.observed <= obs)
    days = np.unique(mcap.observed[known])
    if days.size < BTC_MIN_HISTORY_DAYS:
        return None
    # 관측일마다 t 기준 최신 빈티지 하나(Coin Metrics 는 한 빈티지지만 규칙은 같게) — 정렬 뒤 같은 날 마지막 행
    sub_obs = mcap.observed[known]
    sub_val = mcap.value[known]
    sub_av = mcap.available[known]
    order = np.lexsort((sub_av, sub_obs))
    o, v = sub_obs[order], sub_val[order]
    last_of_day = np.r_[o[1:] != o[:-1], True]
    sd = float(np.std(v[last_of_day], ddof=1))
    if sd <= 0:
        return None
    mc = c[1]
    return Reading((mc - mc / m[1]) / sd, None, obs, False, None)


def _month_end(month_start: int) -> int:
    d = datetime.fromtimestamp(month_start, tz=UTC)
    nxt = datetime(d.year + (d.month == 12), d.month % 12 + 1, 1, tzinfo=UTC)
    return int(nxt.timestamp()) - 1


def kospi_reading(
    t: int, per: VintagedSeries, index: VintagedSeries, dividend: VintagedSeries | None
) -> Reading | None:
    """PER 추정 = 지난달 PER × (지금 지수 ÷ 그 달 말 지수) · 백분위는 t 에 알던 PER 월값 안에서.

    60달 미만 · 묵으면 None.
    """
    p = latest_point(per, t)
    k_now = latest_point(index, t)
    if p is None or k_now is None or t - p[0] > KOSPI_MAX_PER_AGE or t - k_now[0] > KOSPI_MAX_INDEX_STALE:
        return None
    k_end = latest_point(index, t, _month_end(p[0]))
    if k_end is None or k_end[0] < p[0] or k_end[1] <= 0:
        return None
    known = per.available <= t
    months = np.unique(per.observed[known])
    if months.size < KOSPI_MIN_MONTHS:
        return None
    sub_obs, sub_av, sub_val = per.observed[known], per.available[known], per.value[known]
    order = np.lexsort((sub_av, sub_obs))
    o, v = sub_obs[order], sub_val[order]
    values = v[np.r_[o[1:] != o[:-1], True]]  # 달마다 t 기준 최신 빈티지
    estimate = p[1] * k_now[1] / k_end[1]
    pct = float(np.count_nonzero(values <= estimate)) / float(values.size)
    div = latest_point(dividend, t) if dividend is not None else None
    return Reading(estimate, pct, p[0], k_now[0] > k_end[0], None if div is None else div[1])


def mondays(start: int, end: int) -> list[int]:
    """start 이상 첫 월요일 00:00 UTC 부터 end 이하까지 매주."""
    d = datetime.fromtimestamp(start, tz=UTC)
    first = datetime(d.year, d.month, d.day, tzinfo=UTC)
    shift = (7 - first.weekday()) % 7
    t = int(first.timestamp()) + shift * DAY
    if t < start:
        t += WEEK
    return list(range(t, end + 1, WEEK))


def label_return(t: int, price: VintagedSeries) -> float | None:
    """r = P(t + 364일) ÷ P(t) − 1, P(t) = t 직전 관측일 가격. 라벨이라 available 은 보지 않는다(닫힘은 `is_closed`)."""
    a = latest_point(price, 2**62, t - 1)
    b = latest_point(price, 2**62, t + HORIZON - 1)
    if a is None or b is None or a[1] <= 0 or b[0] <= a[0] or (t + HORIZON) - b[0] > 10 * DAY:
        return None
    return b[1] / a[1] - 1.0


def is_closed(t: int, evaluated_at: int) -> bool:
    return t + HORIZON + LABEL_LAG <= evaluated_at


@dataclass(frozen=True, slots=True)
class Week:
    t: int
    multiplier: float
    band: str
    ret: float | None  # 닫힌 주만 값


@dataclass(frozen=True, slots=True)
class Stats:
    n: int
    excess: float | None
    ci_low: float | None
    ci_high: float | None
    years_total: int
    years_positive: int
    window_from: int | None
    window_to: int | None
    units_per_won_ratio: float | None  # 밴드 ÷ 정액 원당 수량(리포트만)
    by_year: tuple[tuple[int, int, float], ...]  # (연도, 주 수, E)


def _excess(m: NDArray[np.float64], r: NDArray[np.float64]) -> float:
    s = float(m.sum())
    if s <= 0:
        return float("nan")
    return float((m * r).sum() / s - r.mean())


def evaluate(weeks: Sequence[Week], prices_at: Sequence[float], seed: int = BOOTSTRAP_SEED) -> Stats:
    """닫힌 주(ret 있음)만. `prices_at` 은 같은 순서의 매수 가격(원당 수량 비교용)."""
    pairs = [(w, p) for w, p in zip(weeks, prices_at, strict=True) if w.ret is not None and p > 0]
    if not pairs:
        return Stats(0, None, None, None, 0, 0, None, None, None, ())
    m = np.array([w.multiplier for w, _ in pairs], dtype=np.float64)
    r = np.array([w.ret for w, _ in pairs], dtype=np.float64)
    px = np.array([p for _, p in pairs], dtype=np.float64)
    n = int(m.size)
    e = _excess(m, r)
    rng = np.random.default_rng(seed)
    nb = max(1, math.ceil(n / BLOCK_WEEKS))
    starts = rng.integers(0, max(1, n - BLOCK_WEEKS + 1), size=(BOOTSTRAP_DRAWS, nb))
    idx = (starts[:, :, None] + np.arange(min(BLOCK_WEEKS, n))[None, None, :]).reshape(BOOTSTRAP_DRAWS, -1)[:, :n]
    mb, rb = m[idx], r[idx]
    sums = mb.sum(axis=1)
    with np.errstate(invalid="ignore", divide="ignore"):
        draws = (mb * rb).sum(axis=1) / sums - rb.mean(axis=1)
    draws = draws[np.isfinite(draws)]
    lo, hi = (float(np.quantile(draws, 0.05)), float(np.quantile(draws, 0.95))) if draws.size else (None, None)
    years: dict[int, list[int]] = {}
    for i, (w, _) in enumerate(pairs):
        years.setdefault(datetime.fromtimestamp(w.t, tz=UTC).year, []).append(i)
    by_year = tuple((y, len(ix), _excess(m[ix], r[ix])) for y, ix in sorted(years.items()) if len(ix) >= 13)
    flat_units = float((1.0 / px).sum() / n)
    band_units = float((m / px).sum() / m.sum()) if m.sum() > 0 else float("nan")
    return Stats(
        n,
        None if math.isnan(e) else e,
        lo,
        hi,
        len(by_year),
        sum(1 for _, _, ye in by_year if ye > 0),
        pairs[0][0].t,
        pairs[-1][0].t,
        band_units / flat_units if flat_units > 0 and not math.isnan(band_units) else None,
        by_year,
    )


@dataclass(frozen=True, slots=True)
class Gate:
    passed: bool
    reason: str | None  # insufficient_sample · not_better_than_flat · stale_inputs


def gate(stats: Stats, has_reading: bool) -> Gate:
    if not has_reading:
        return Gate(False, "stale_inputs")
    if stats.n < MIN_CLOSED_WEEKS:
        return Gate(False, "insufficient_sample")
    if stats.ci_low is None or stats.ci_low <= 0:
        return Gate(False, "not_better_than_flat")
    return Gate(True, None)


@dataclass(frozen=True, slots=True)
class CaseRule:
    cheap_loss: float
    expensive_gain: float
    missed_drop: float


BTC_CASES = CaseRule(-0.30, 0.50, -0.50)
KOSPI_CASES = CaseRule(-0.15, 0.25, -0.25)


@dataclass(frozen=True, slots=True)
class Case:
    t: int
    kind: str  # wrong_cheap · wrong_expensive · missed_drop
    band: str
    multiplier: float
    ret: float


def failure_cases(weeks: Sequence[Week], rule: CaseRule) -> tuple[list[Case], int]:
    """(|r| 큰 순 3건, 전체 사례 수). 같은 사례는 26주 안에 한 번(가장 나쁜 주)."""
    raw: list[Case] = []
    for w in weeks:
        if w.ret is None:
            continue
        if w.multiplier >= 2 and w.ret <= rule.cheap_loss:
            raw.append(Case(w.t, "wrong_cheap", w.band, w.multiplier, w.ret))
        elif w.multiplier <= 0.5 and w.ret >= rule.expensive_gain:
            raw.append(Case(w.t, "wrong_expensive", w.band, w.multiplier, w.ret))
        elif w.multiplier >= 1 and w.ret <= rule.missed_drop:
            raw.append(Case(w.t, "missed_drop", w.band, w.multiplier, w.ret))
    # 시간 순으로 26주 안 묶음 → 묶음마다 |r| 가장 큰 주
    episodes: list[list[Case]] = []
    for c in sorted(raw, key=lambda x: x.t):
        if episodes and episodes[-1][-1].kind == c.kind and c.t - episodes[-1][-1].t <= CASE_GAP_WEEKS * WEEK:
            episodes[-1].append(c)
        else:
            episodes.append([c])
    worst = [max(ep, key=lambda x: abs(x.ret)) for ep in episodes]
    return sorted(worst, key=lambda x: abs(x.ret), reverse=True)[:TOP_CASES], len(worst)


KIMCHI_MAX_SKEW = 3 * DAY


@dataclass(frozen=True, slots=True)
class Kimchi:
    premium: float  # 업비트 원화 ÷ (바이낸스 USDT × 원/달러) − 1
    as_of: int  # 세 값 중 가장 늦게 알게 된 시각


def _close_as_of(available: NDArray[np.int64], close: NDArray[np.float64], t: int) -> tuple[int, float] | None:
    i = int(np.searchsorted(available, t, side="right")) - 1
    return None if i < 0 else (int(available[i]), float(close[i]))


def kimchi_premium(
    t: int,
    upbit: tuple[NDArray[np.int64], NDArray[np.float64]],
    binance: tuple[NDArray[np.int64], NDArray[np.float64]],
    usdkrw: VintagedSeries,
) -> Kimchi | None:
    """t 에 알던 마지막 일봉 종가 둘 + 환율. 셋이 3일 넘게 어긋나면 None(다른 날 값끼리 나누지 않는다)."""
    u = _close_as_of(*upbit, t)
    b = _close_as_of(*binance, t)
    f = latest_point(usdkrw, t)
    if u is None or b is None or f is None or b[1] <= 0 or f[1] <= 0:
        return None
    stamps = (u[0], b[0], f[0])
    if max(stamps) - min(stamps) > KIMCHI_MAX_SKEW:
        return None
    return Kimchi(u[1] / (b[1] * f[1]) - 1.0, max(stamps))
