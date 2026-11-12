"""소식 측정 태그 — 같은 종류 과거 초과 반응 · 선반영. 사전등록 `news-reaction@1` [protocol](FC-REQ-028 FR-3). I/O 없음.

## 시각 규칙 (time-and-leakage.md §1)

- 사건 시각 = 원천 게시 시각(available_at).
  기준 봉 = `available_at <= 게시 시각` 인 마지막 일봉(`events.reaction` 과 같다).
- h 봉 반응은 `as_of` 에 그 봉이 닫혔을 때만. 평소 p₀ 도 같은 조건.
- 국내 원천 끊김(`kr_breaks`)을 걸친 창은 None — 반응 · 선반영 · 평소 모두.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, replace
from datetime import UTC, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.base_rate import effective_n, holm, two_sided_p, wilson
from salt_forecast.domain.kr_breaks import up_limit_breaks
from salt_forecast.domain.series import OhlcvSeries

KEY = "news-reaction@1"
HORIZONS = (1, 5)
PRE_BARS = 5
COOLDOWN_BARS = 5
MIN_EFFECTIVE_N = 30.0
MIN_DAYS = 20
HOLM_ALPHA = 0.05
_DAY = 86_400


@dataclass(frozen=True, slots=True)
class Title:
    """분류 전 제목 하나 × 종목 하나. symbol 은 가격 시계열 키(국내 코드 · 코인 KRW-심볼)."""

    origin: str
    kind: str
    symbol: str
    published_at: datetime


@dataclass(frozen=True, slots=True)
class Aligned:
    """한 종목 봉과 같은 시각의 시장 수준 · 끊김 누적. market 이 NaN 인 봉은 그 창을 쓰지 않는다."""

    symbol: str
    t: NDArray[np.int64]
    close: NDArray[np.float64]
    market: NDArray[np.float64]
    break_cum: NDArray[np.int64] | None


def crypto_index(bars: Mapping[str, OhlcvSeries]) -> OhlcvSeries:
    """업비트 원화 동일가중 — 그날 봉과 바로 전날 봉이 있는 종목의 로그수익 평균을 누적(사전등록 excess)."""
    times = np.unique(np.concatenate([b.available_at for b in bars.values()])) if bars else np.empty(0, np.int64)
    n = times.size
    s = np.zeros(n)
    c = np.zeros(n, dtype=np.int64)
    for b in bars.values():
        if b.available_at.size < 2:
            continue
        pos = np.searchsorted(times, b.available_at)
        consecutive = (b.available_at[1:] - b.available_at[:-1]) == _DAY
        with np.errstate(divide="ignore", invalid="ignore"):
            r = np.log(b.close[1:] / b.close[:-1])
        ok = consecutive & np.isfinite(r)
        np.add.at(s, pos[1:][ok], r[ok])
        np.add.at(c, pos[1:][ok], 1)
    daily = np.divide(s, c, out=np.zeros(n), where=c > 0)
    level = 1000.0 * np.exp(np.cumsum(daily))
    nan = np.full(n, np.nan)
    return OhlcvSeries("CRYPTO-EW", times.astype(np.int64), level, level, level, level, nan)


def align(bars: OhlcvSeries, market: OhlcvSeries, kr_breaks: bool) -> Aligned:
    """종목 봉 시각에 시장 수준을 붙인다(같은 available_at 만 — 없으면 NaN)."""
    idx = np.searchsorted(market.available_at, bars.available_at)
    idx_c = np.clip(idx, 0, max(market.available_at.size - 1, 0))
    hit = (market.available_at.size > 0) & (market.available_at[idx_c] == bars.available_at)
    m = np.where(hit, market.close[idx_c] if market.available_at.size else np.nan, np.nan)
    cum = np.cumsum(up_limit_breaks(bars.close)).astype(np.int64) if kr_breaks else None
    return Aligned(bars.symbol, bars.available_at, bars.close, m.astype(np.float64), cum)


def excess(a: Aligned, i: NDArray[np.int64], j: NDArray[np.int64]) -> NDArray[np.float64]:
    """봉 i → j 초과 로그수익. 범위 밖 · 시장 결측 · 끊김 걸침은 NaN."""
    n = a.t.size
    ok = (i >= 0) & (j < n) & (i < j)
    ii = np.where(ok, i, 0)
    jj = np.where(ok, j, 0)
    with np.errstate(divide="ignore", invalid="ignore"):
        x = np.log(a.close[jj] / a.close[ii]) - np.log(a.market[jj] / a.market[ii])
    if a.break_cum is not None:
        ok &= a.break_cum[jj] == a.break_cum[ii]
    return np.where(ok & np.isfinite(x), x, np.nan)


@dataclass(frozen=True, slots=True)
class Event:
    origin: str
    kind: str
    symbol: str
    ref: int  # 기준 봉 인덱스
    ref_t: int  # 기준 봉 available_at(epoch)


def events(titles: Sequence[Title], aligned: Mapping[str, Aligned]) -> list[Event]:
    """제목 → 사건. 같은 (출처, 종류, 종목, 기준 봉)은 하나.

    같은 (출처, 종류, 종목)은 앞 사건에서 5봉 안이면 뺀다. other 는 사건 아님.
    """
    refs: dict[tuple[str, str, str], set[int]] = {}
    for title in titles:
        a = aligned.get(title.symbol)
        if title.kind == "other" or a is None:
            continue
        ref = int(np.searchsorted(a.t, int(title.published_at.timestamp()), side="right")) - 1
        if ref < 0:
            continue
        refs.setdefault((title.origin, title.kind, title.symbol), set()).add(ref)
    out: list[Event] = []
    for (origin, kind, symbol), rs in refs.items():
        last = -(10**9)
        for r in sorted(rs):
            if r - last < COOLDOWN_BARS:
                continue
            out.append(Event(origin, kind, symbol, r, int(aligned[symbol].t[r])))
            last = r
    out.sort(key=lambda e: (e.origin, e.kind, e.symbol, e.ref))
    return out


def baseline_up_rate(aligned: Mapping[str, Aligned], h: int, as_of: int) -> float | None:
    """평소 p₀ — 종목 풀의 (종목, 봉) 전부 중 as_of 에 창이 닫힌 것의 초과 > 0 비율."""
    up = 0
    n = 0
    for a in aligned.values():
        k = a.t.size
        if k <= h:
            continue
        i = np.arange(k - h, dtype=np.int64)
        j = i + h
        closed = a.t[j] <= as_of
        x = excess(a, i[closed], j[closed])
        x = x[np.isfinite(x)]
        up += int(np.count_nonzero(x > 0))
        n += int(x.size)
    return up / n if n else None


@dataclass(frozen=True, slots=True)
class ReactionStat:
    market: str
    origin: str
    kind: str
    horizon: int
    status: str  # ok | below_min
    sample: int
    sample_eff: float
    sample_days: int
    up_rate: float | None
    up_low: float | None
    up_high: float | None
    mean: float | None
    q10: float | None
    q50: float | None
    q90: float | None
    pre_move_median: float | None
    base_up_rate: float | None
    p_value: float | None
    differs: str | None
    window_from: datetime | None
    window_to: datetime | None


def _ts(epoch: int) -> datetime:
    return datetime.fromtimestamp(epoch, UTC)


def describe(
    market: str,
    evs: Sequence[Event],
    aligned: Mapping[str, Aligned],
    as_of: int,
    base: Mapping[int, float | None],
) -> list[ReactionStat]:
    """(출처, 종류, 지평)마다 서술. differs 는 시장 × 지평 가족 Holm 뒤에 채운다."""
    groups: dict[tuple[str, str], list[Event]] = {}
    for e in evs:
        groups.setdefault((e.origin, e.kind), []).append(e)
    out: list[ReactionStat] = []
    for (origin, kind), ge in sorted(groups.items()):
        for h in HORIZONS:
            xs: list[float] = []
            days: list[int] = []
            pres: list[float] = []
            ts: list[int] = []
            for e in ge:
                a = aligned[e.symbol]
                j = e.ref + h
                if j >= a.t.size or a.t[j] > as_of:
                    continue
                x = float(excess(a, np.array([e.ref]), np.array([j]))[0])
                if not np.isfinite(x):
                    continue
                xs.append(x)
                days.append(e.ref_t // _DAY)
                ts.append(e.ref_t)
                p = float(excess(a, np.array([e.ref - PRE_BARS]), np.array([e.ref]))[0])
                if np.isfinite(p):
                    pres.append(p)
            x_arr = np.asarray(xs, dtype=np.float64)
            up = (x_arr > 0).astype(np.float64)
            d_arr = np.asarray(days, dtype=np.int64)
            n_eff = effective_n(up, d_arr)
            n_days = int(np.unique(d_arr).size)
            p0 = base.get(h)
            window = (_ts(min(ts)), _ts(max(ts))) if ts else (None, None)
            if n_eff < MIN_EFFECTIVE_N or n_days < MIN_DAYS or p0 is None:
                out.append(
                    ReactionStat(
                        market,
                        origin,
                        kind,
                        h,
                        "below_min",
                        len(xs),
                        n_eff,
                        n_days,
                        None,
                        None,
                        None,
                        None,
                        None,
                        None,
                        None,
                        None,
                        p0,
                        None,
                        None,
                        *window,
                    )
                )
                continue
            rate = float(up.mean())
            lo, hi = wilson(rate, n_eff)
            q10, q50, q90 = (float(v) for v in np.quantile(x_arr, (0.1, 0.5, 0.9)))
            pre_med = float(np.median(pres)) if pres else None
            out.append(
                ReactionStat(
                    market,
                    origin,
                    kind,
                    h,
                    "ok",
                    len(xs),
                    n_eff,
                    n_days,
                    rate,
                    lo,
                    hi,
                    float(x_arr.mean()),
                    q10,
                    q50,
                    q90,
                    pre_med,
                    p0,
                    two_sided_p(rate, n_eff, p0),
                    None,
                    *window,
                )
            )
    return finalize(out)


def finalize(stats: Sequence[ReactionStat]) -> list[ReactionStat]:
    """시장 × 지평마다 ok 행끼리 Holm. 통과면 부호대로 higher | lower."""
    out = list(stats)
    fams: dict[tuple[str, int], list[int]] = {}
    for i, s in enumerate(out):
        if s.status == "ok" and s.p_value is not None:
            fams.setdefault((s.market, s.horizon), []).append(i)
    for idx in fams.values():
        adj = holm([p if (p := out[i].p_value) is not None else 1.0 for i in idx])
        for i, p in zip(idx, adj, strict=True):
            s = out[i]
            if p < HOLM_ALPHA and s.up_rate is not None and s.base_up_rate is not None:
                d = "higher" if s.up_rate > s.base_up_rate else "lower"
                out[i] = replace(s, differs=d)
    return out


@dataclass(frozen=True, slots=True)
class PreMove:
    symbol: str
    bar_at: datetime
    pre_move_5d: float


def recent_pre_moves(a: Aligned, as_of: int, keep: int) -> list[PreMove]:
    """as_of 까지 닫힌 마지막 keep 봉 각각의 선반영(그 봉까지 5봉 초과). 값이 없으면 그 봉은 뺀다."""
    end = int(np.searchsorted(a.t, as_of, side="right"))
    j = np.arange(max(0, end - keep), end, dtype=np.int64)
    x = excess(a, j - PRE_BARS, j)
    return [PreMove(a.symbol, _ts(int(a.t[k])), float(v)) for k, v in zip(j, x, strict=True) if np.isfinite(v)]
