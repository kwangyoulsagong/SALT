"""H3 큰 움직임 × 소식 유무 × 거래량 — 사전등록 `move-news@1`(FC-REQ-028 FR-9 · F017 v4 순서 4). 순수 계산, I/O 없음.

행렬은 (봉, 종목). 사건 = |r_t| ≥ 2σ_t(σ = 직전 20개 r, 오늘 제외).
라벨 s = sign(r_t) · (h 봉 수익 − 같은 날 시장 평균).

## 시점 규칙

- 사건 · 소식 유무 · 거래량은 행 t 까지(소식 창 끝 = 봉 마감 전). 라벨만 t + h.
- 전진 표본은 **라벨이 닫히기 전에 기록한** 사건만(`recorded_at < 봉 t+1 available_at`) — 판정은 기록된 값으로.

## 등록 해석 (첫 계산 전에 코드로 고정 — 2026-11-16)

- 코인 소식 원천: 등록 문구는 `forecast.news_item` 이지만 그 표엔 심볼 열이 없다. 심볼이 붙은 같은 계열 원천
  `public.v_news_article_export`(news-reaction@2 · event-window@2 와 같은 것)를 쓴다.
- 국내 소식: `v_kr_news_title_export` 의 시황(news) · 공시 제목(disclosure) 둘 다. 뉴스만 관련 종목 ≤ 2(news_max_codes).
- 원천 덮임 = 그 시장 소식이 그 창에 0건이면(수집 멈춤) 그날 사건 제외.
- 차이 검정 = 날짜별 평균의 두 표본 — t = (m_있음 − m_없음) / sqrt(se² + se²),
  se 는 각 집단 날짜 시계열 Newey–West(시차 h).
- 플라시보 = 차이 통계. 셋(있음 · 없음 · 차이) 모두 그 칸 플라시보를 통과해야 pass.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, date, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.base_rate import holm
from salt_forecast.domain.vol_range import newey_west_se

KEY = "move-news@1"
HORIZONS = (1, 5)
TESTS = ("news_up", "quiet_down", "diff")
SIGMA_WINDOW = 20
EVENT_SIGMA = 2.0
VOLUME_MULT = 2.0
MIN_DAYS = 30
MIN_EVENTS = 100
PLACEBO_REPS = 200
PLACEBO_SHIFT = 20
PLACEBO_SEED = 20261113
COVERED_TITLES = 3
COVERED_DAYS = 30
KR_NEWS_CUTOFF_S = 30 * 60  # 15:30 KST = 봉 available_at(16:00) − 30분
REGISTERED_AT = datetime(2026, 11, 13, 2, 49, 40, tzinfo=UTC)  # 등록 커밋 51f6018d
LOOKS = (date(2027, 1, 12), date(2027, 2, 11), date(2027, 3, 13))
ALPHA_PER_LOOK = 0.0166667

Mat = NDArray[np.float64]
Vec = NDArray[np.float64]


def _roll(m: Mat, w: int, fn: str) -> Mat:
    """행 t 까지 w 행 평균 · 표본 표준편차(ddof 1). 창에 결측이 있으면 NaN."""
    out = np.full_like(m, np.nan)
    if m.shape[0] < w:
        return out
    z = np.zeros((1, m.shape[1]))
    c1 = np.vstack([z, np.cumsum(np.nan_to_num(m), axis=0)])
    c2 = np.vstack([z, np.cumsum(np.nan_to_num(m) ** 2, axis=0)])
    holes = np.vstack([z, np.cumsum(np.isnan(m), axis=0)])
    s1, s2, bad = c1[w:] - c1[:-w], c2[w:] - c2[:-w], holes[w:] - holes[:-w]
    v = s1 / w if fn == "mean" else np.sqrt(np.maximum((s2 - s1 * s1 / w) / (w - 1), 0.0))
    out[w - 1 :] = np.where(bad == 0, v, np.nan)
    return out


def lag1(m: Mat) -> Mat:
    out = np.full_like(m, np.nan)
    out[1:] = m[:-1]
    return out


def sigma(r: Mat) -> Mat:
    """σ_t = 직전 20개 r(오늘 제외) 표본 표준편차 — base-rate@1 과 같다."""
    return lag1(_roll(r, SIGMA_WINDOW, "std"))


def events(r: Mat, sig: Mat, eligible: NDArray[np.bool_]) -> NDArray[np.bool_]:
    with np.errstate(invalid="ignore"):
        return eligible & np.isfinite(r) & (sig > 0) & (np.abs(r) >= EVENT_SIGMA * sig)


def volume_high(turnover: Mat) -> NDArray[np.bool_]:
    """거래대금 ≥ 직전 20일 평균 × 2."""
    avg = lag1(_roll(turnover, SIGMA_WINDOW, "mean"))
    with np.errstate(invalid="ignore"):
        return np.isfinite(avg) & (turnover >= VOLUME_MULT * avg)


def news_windows(market: str, dates: NDArray[np.int64]) -> tuple[NDArray[np.int64], NDArray[np.int64]]:
    """행마다 소식 창 (lo, hi]. 국내 = (전 거래일 15:30, 그날 15:30] · 코인 = 그 하루(봉 available_at − 1일, 봉]."""
    if market == "kr":
        hi = dates - KR_NEWS_CUTOFF_S
        lo = np.concatenate([[hi[0] - 86_400], hi[:-1]]) if dates.size else hi
        return lo.astype(np.int64), hi.astype(np.int64)
    return (dates - 86_400).astype(np.int64), dates.astype(np.int64)


def news_counts(
    pub: Mapping[str, NDArray[np.int64]], symbols: Sequence[str], lo: NDArray[np.int64], hi: NDArray[np.int64]
) -> NDArray[np.int64]:
    """(봉, 종목) 창 안 제목 수. pub[symbol] = 정렬된 게시 시각."""
    out = np.zeros((lo.size, len(symbols)), dtype=np.int64)
    for j, s in enumerate(symbols):
        t = pub.get(s)
        if t is None or t.size == 0:
            continue
        out[:, j] = np.searchsorted(t, hi, side="right") - np.searchsorted(t, lo, side="right")
    return out


def market_counts(all_pub: NDArray[np.int64], lo: NDArray[np.int64], hi: NDArray[np.int64]) -> NDArray[np.int64]:
    """행마다 그 시장 전체 제목 수(원천 덮임)."""
    return np.searchsorted(all_pub, hi, side="right") - np.searchsorted(all_pub, lo, side="right")


def covered(
    pub: Mapping[str, NDArray[np.int64]], symbols: Sequence[str], dates: NDArray[np.int64]
) -> NDArray[np.bool_]:
    """(봉, 종목) — 직전 30일(봉 시각까지) 제목 ≥ 3."""
    lo = dates - COVERED_DAYS * 86_400
    return news_counts(pub, symbols, lo.astype(np.int64), dates) >= COVERED_TITLES


def labels(close: Mat, r: Mat, eligible: NDArray[np.bool_], h: int, breaks: NDArray[np.bool_] | None) -> Mat:
    """s = sign(r_t) · (ln C_{t+h}/C_t − 같은 날 대상 종목 동일가중 평균). 라벨 창에 끊김이면 NaN."""
    fwd = np.full_like(close, np.nan)
    if close.shape[0] > h:
        with np.errstate(divide="ignore", invalid="ignore"):
            fwd[:-h] = np.log(close[h:] / close[:-h])
        if breaks is not None:
            c = np.cumsum(breaks, axis=0)
            fwd[:-h] = np.where(c[h:] > c[:-h], np.nan, fwd[:-h])
    ok = eligible & np.isfinite(fwd)
    cnt = ok.sum(axis=1)
    mkt = np.where(cnt > 0, np.where(ok, fwd, 0.0).sum(axis=1) / np.maximum(cnt, 1), np.nan)
    return np.sign(r) * (fwd - mkt[:, None])


def cooldown(rows: NDArray[np.bool_], h: int) -> NDArray[np.bool_]:
    """같은 종목 사건 뒤 h 봉 안의 다음 사건은 뺀다(겹치는 라벨 0)."""
    out = np.zeros_like(rows)
    for j in range(rows.shape[1]):
        last = -(10**9)
        for t in np.flatnonzero(rows[:, j]):
            if t - last >= h:
                out[t, j] = True
                last = int(t)
    return out


# ── 검정 ──


@dataclass(frozen=True, slots=True)
class Group:
    """날짜별 평균 → 날짜 수준 평균 · NW 표준오차."""

    events: int
    days: int
    mean: float
    se: float


def group(day: NDArray[np.int64], s: Vec, lag: int) -> Group:
    ok = np.isfinite(s)
    day, s = day[ok], s[ok]
    if s.size == 0:
        return Group(0, 0, float("nan"), float("nan"))
    u, inv = np.unique(day, return_inverse=True)
    m = np.bincount(inv, weights=s) / np.bincount(inv)
    return Group(int(s.size), int(u.size), float(m.mean()), newey_west_se(m, lag))


def _phi(z: float) -> float:
    return 0.5 * math.erfc(-z / math.sqrt(2))


def enough(g: Group) -> bool:
    return g.days >= MIN_DAYS and g.events >= MIN_EVENTS


@dataclass(slots=True)
class TestResult:
    test: str
    stat: float = float("nan")  # 평균(있음 · 없음) 또는 차이
    t: float = float("nan")
    p: float = 1.0
    p_holm: float = 1.0
    below_min: bool = True


@dataclass(slots=True)
class CellRun:
    """한 칸(시장 × 지평) — 집단 넷 · 검정 셋 · 플라시보 · 견고성 · 판정."""

    market: str
    horizon: int
    news: Group
    quiet: Group
    moves: Group  # 움직임만의 기저율(소식 무시)
    net_news: float
    net_quiet: float
    by_volume: dict[str, tuple[Group, Group]]  # high · normal → (있음, 없음)
    tests: list[TestResult] = field(default_factory=list[TestResult])
    placebo_q95: float = float("nan")
    placebo_pass: bool = False
    robust_same_sign: bool = False
    status: dict[str, tuple[str, str | None]] = field(default_factory=dict[str, tuple[str, str | None]])


def run_tests(news: Group, quiet: Group) -> list[TestResult]:
    out: list[TestResult] = []
    for name, g in (("news_up", news), ("quiet_down", quiet)):
        r = TestResult(name, g.mean, below_min=not enough(g))
        if g.se > 0 and math.isfinite(g.se):
            r.t = g.mean / g.se
            r.p = 1 - _phi(r.t) if name == "news_up" else _phi(r.t)
        out.append(r)
    d = TestResult("diff", news.mean - quiet.mean, below_min=not (enough(news) and enough(quiet)))
    se = math.sqrt(news.se**2 + quiet.se**2) if math.isfinite(news.se) and math.isfinite(quiet.se) else float("nan")
    if se > 0 and math.isfinite(d.stat):
        d.t = d.stat / se
        d.p = 1 - _phi(d.t)
    out.append(d)
    return out


def placebo_flags(flag: NDArray[np.bool_], rng: np.random.Generator) -> NDArray[np.bool_]:
    """소식 날짜를 같은 종목 안에서 ±20 봉(0 제외) 무작위로 옮긴다. 범위 밖은 버린다."""
    t, j = np.nonzero(flag)
    k = rng.integers(1, PLACEBO_SHIFT + 1, size=t.size) * rng.choice(np.array([-1, 1]), size=t.size)
    nt = t + k
    ok = (nt >= 0) & (nt < flag.shape[0])
    out = np.zeros_like(flag)
    out[nt[ok], j[ok]] = True
    return out


def diff_stat(day: NDArray[np.int64], s: Vec, has: NDArray[np.bool_], lag: int) -> float:
    return group(day[has], s[has], lag).mean - group(day[~has], s[~has], lag).mean


def judge(cells: Sequence[CellRun], alpha: float, last_look: bool) -> None:
    """칸 × 검정 12개 Holm(α). pass = Holm + 플라시보 + 덮인 종목 견고성 부호.
    실패 사유 순서 below_min > no_effect > placebo > coverage. 마지막 판정 날짜 전이면 fail 대신 forward."""
    tests = [(c, r) for c in cells for r in c.tests]
    adj = holm([r.p for _, r in tests])
    for (_, r), p in zip(tests, adj, strict=True):
        r.p_holm = p
    for c in cells:
        for r in c.tests:
            if r.below_min:
                reason: str | None = "below_min"
            elif r.p_holm > alpha:
                reason = "no_effect"
            elif not c.placebo_pass:
                reason = "placebo"
            elif not c.robust_same_sign:
                reason = "coverage"
            else:
                reason = None
            if reason is None:
                c.status[r.test] = ("pass", None)
            else:
                c.status[r.test] = ("fail", reason) if last_look else ("forward", reason)


def look_due(today: date, done: int) -> int | None:
    for i, d in enumerate(LOOKS):
        if i >= done and today >= d:
            return i
    return None
