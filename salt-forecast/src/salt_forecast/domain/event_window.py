"""사건 반응 창 · 선반영 삼분위 — 사전등록 `event-window@2`(FC-REQ-028 FR-8 — @1 과 DART 게시 시각만 다름). I/O 없음.

사건(소식 · 공시)마다 발표 전 · 뒤 누적 초과 등락을 한 행으로,
같은 종류를 발표 전 5봉 초과 등락 삼분위로 나눠 뒤 1 · 5봉을 서술한다.
초과 · 기준 봉 · 쿨다운 · 문턱은 `news-reaction@2` 그대로(`domain/news_reaction`).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, replace
from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.base_rate import effective_n, holm, two_sided_p, wilson
from salt_forecast.domain.news_reaction import COOLDOWN_BARS, MIN_DAYS, MIN_EFFECTIVE_N, Aligned, Title, excess
from salt_forecast.domain.series import OhlcvSeries

KEY = "event-window@2"
HORIZONS = (1, 5)
TERCILES = ("low", "mid", "high")
HOLM_ALPHA = 0.05
MINUTE = 300
POST_MINUTES = 30
_DAY = 86_400


@dataclass(frozen=True, slots=True)
class EventRow:
    """사건 한 행. 창 값은 로그 초과 등락(없으면 NaN). tercile 은 pre5 가 없으면 None."""

    origin: str
    kind: str
    symbol: str
    ref: int
    ref_t: int
    published: int
    pre20: float
    pre5: float
    pre1: float
    post30m: float
    post1: float
    post5: float
    tercile: str | None = None


def pick_events(titles: Sequence[Title], aligned: Mapping[str, Aligned]) -> list[tuple[Title, int]]:
    """제목 → (제목, 기준 봉). 같은 (출처, 종류, 종목)은 앞 사건에서 5봉 안이면 뺀다.

    `news_reaction.events` 와 같은 규칙.
    같은 기준 봉에 여러 제목이면 가장 이른 게시가 그 사건이다(+30분 창의 시작)."""
    first: dict[tuple[str, str, str, int], Title] = {}
    for t in titles:
        a = aligned.get(t.symbol)
        if t.kind == "other" or a is None:
            continue
        ref = int(np.searchsorted(a.t, int(t.published_at.timestamp()), side="right")) - 1
        if ref < 0:
            continue
        k = (t.origin, t.kind, t.symbol, ref)
        if k not in first or t.published_at < first[k].published_at:
            first[k] = t
    by_group: dict[tuple[str, str, str], list[tuple[int, Title]]] = {}
    for (o, kd, s, ref), t in first.items():
        by_group.setdefault((o, kd, s), []).append((ref, t))
    out: list[tuple[Title, int]] = []
    for rows in by_group.values():
        last = -(10**9)
        for ref, t in sorted(rows, key=lambda x: x[0]):
            if ref - last < COOLDOWN_BARS:
                continue
            out.append((t, ref))
            last = ref
    out.sort(key=lambda x: (x[0].origin, x[0].kind, x[0].symbol, x[1]))
    return out


def _one(a: Aligned, i: int, j: int, as_of: int) -> float:
    if j >= a.t.size or i < 0 or a.t[j] > as_of:
        return float("nan")
    return float(excess(a, np.array([i], np.int64), np.array([j], np.int64))[0])


def minute_move(m: OhlcvSeries, start: int, end: int) -> float:
    """5분봉에서 [start, end] 원 로그 등락.

    시작 = start 뒤 첫 봉 시가, 끝 = end 에 마감한 봉 종가. 둘 중 하나라도 없으면 NaN."""
    i = int(np.searchsorted(m.available_at, start + MINUTE, side="left"))  # 시작 뒤 첫 봉(마감 ≥ 시작 + 5분)
    j = int(np.searchsorted(m.available_at, end, side="right")) - 1
    if i >= m.available_at.size or j < i or m.available_at[j] < end - MINUTE:
        return float("nan")
    with np.errstate(divide="ignore", invalid="ignore"):
        return float(np.log(m.close[j] / m.open[i]))


def market_minute_move(minutes: Mapping[str, OhlcvSeries], start: int, end: int) -> float:
    """같은 30분 시장 — 그 창에 봉이 있는 종목들의 원 등락 동일가중 평균."""
    xs = [x for m in minutes.values() if np.isfinite(x := minute_move(m, start, end))]
    return float(np.mean(xs)) if xs else float("nan")


def windows(
    picked: Sequence[tuple[Title, int]],
    aligned: Mapping[str, Aligned],
    minutes: Mapping[str, OhlcvSeries],
    as_of: int,
) -> list[EventRow]:
    """사건마다 창. +30분은 게시 시각 + 30분이 as_of 안이고 그 종목 5분봉이 있는 경우만."""
    market_cache: dict[int, float] = {}
    out: list[EventRow] = []
    for t, ref in picked:
        a = aligned[t.symbol]
        pub = int(t.published_at.timestamp())
        post30 = float("nan")
        m = minutes.get(t.symbol)
        end = pub + POST_MINUTES * 60
        if m is not None and end <= as_of:
            own = minute_move(m, pub, end)
            if np.isfinite(own):
                if pub not in market_cache:
                    market_cache[pub] = market_minute_move(minutes, pub, end)
                post30 = own - market_cache[pub]
        out.append(
            EventRow(
                t.origin, t.kind, t.symbol, ref, int(a.t[ref]), pub,
                _one(a, ref - 20, ref, as_of), _one(a, ref - 5, ref, as_of), _one(a, ref - 1, ref, as_of),
                post30, _one(a, ref, ref + 1, as_of), _one(a, ref, ref + 5, as_of),
            )
        )  # fmt: skip
    return out


def tercile_cuts(rows: Sequence[EventRow]) -> tuple[float, float] | None:
    """출처 하나의 pre5 33.3% · 66.7% 분위(linear). pre5 가 3개 미만이면 None."""
    x = np.asarray([r.pre5 for r in rows if np.isfinite(r.pre5)], dtype=np.float64)
    if x.size < 3:
        return None
    lo, hi = (float(v) for v in np.quantile(x, (1 / 3, 2 / 3)))
    return lo, hi


def tercile_of(pre5: float, cuts: tuple[float, float]) -> str | None:
    if not np.isfinite(pre5):
        return None
    if pre5 <= cuts[0]:
        return "low"
    return "mid" if pre5 <= cuts[1] else "high"


@dataclass(frozen=True, slots=True)
class WindowStat:
    market: str
    origin: str
    kind: str
    tercile: str  # low | mid | high | all
    horizon: int
    status: str
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
    pre5_median: float | None
    base_up_rate: float | None
    p_holm: float | None
    differs: str | None
    pre_low_max: float
    pre_high_min: float
    window_from: datetime | None
    window_to: datetime | None


def _ts(t: int) -> datetime:
    return datetime.fromtimestamp(t, UTC)


def _stat(
    market: str, origin: str, kind: str, tercile: str, h: int, rows: Sequence[EventRow], cuts: tuple[float, float]
) -> WindowStat:
    pairs = [(r.post1 if h == 1 else r.post5, r) for r in rows]
    pairs = [(x, r) for x, r in pairs if np.isfinite(x)]
    x = np.asarray([p[0] for p in pairs], dtype=np.float64)
    days = np.asarray([p[1].ref_t // _DAY for p in pairs], dtype=np.int64)
    up = (x > 0).astype(np.float64)
    n_eff = effective_n(up, days)
    n_days = int(np.unique(days).size)
    ts = [p[1].ref_t for p in pairs]
    window = (_ts(min(ts)), _ts(max(ts))) if ts else (None, None)
    pres = [p[1].pre5 for p in pairs if np.isfinite(p[1].pre5)]
    pre_med = float(np.median(pres)) if pres else None
    if n_eff < MIN_EFFECTIVE_N or n_days < MIN_DAYS:
        return WindowStat(market, origin, kind, tercile, h, "below_min", len(pairs), n_eff, n_days,
                          None, None, None, None, None, None, None,
                          pre_med, None, None, None, *cuts, *window)  # fmt: skip
    rate = float(up.mean())
    lo, hi = wilson(rate, n_eff)
    q10, q50, q90 = (float(v) for v in np.quantile(x, (0.1, 0.5, 0.9)))
    return WindowStat(market, origin, kind, tercile, h, "ok", len(pairs), n_eff, n_days, rate, lo, hi,
                      float(x.mean()), q10, q50, q90, pre_med, None, None, None, *cuts, *window)  # fmt: skip


def describe(market: str, rows: Sequence[EventRow]) -> tuple[list[EventRow], list[WindowStat]]:
    """출처마다 삼분위 경계 → 사건에 삼분위 → (출처, 종류) × 삼분위(+ all) × 지평 서술 → 시장 × 지평 Holm."""
    tagged: list[EventRow] = []
    stats: list[WindowStat] = []
    for origin in sorted({r.origin for r in rows}):
        group = [r for r in rows if r.origin == origin]
        cuts = tercile_cuts(group)
        if cuts is None:
            tagged += group
            continue
        group = [replace(r, tercile=tercile_of(r.pre5, cuts)) for r in group]
        tagged += group
        for kind in sorted({r.kind for r in group}):
            gk = [r for r in group if r.kind == kind]
            for h in HORIZONS:
                base = _stat(market, origin, kind, "all", h, [r for r in gk if r.tercile], cuts)
                stats.append(base)
                for tc in TERCILES:
                    s = _stat(market, origin, kind, tc, h, [r for r in gk if r.tercile == tc], cuts)
                    p0 = base.up_rate if base.status == "ok" else None
                    stats.append(replace(s, base_up_rate=p0))
    return tagged, finalize(stats)


def finalize(stats: Sequence[WindowStat]) -> list[WindowStat]:
    """시장 × 지평마다 삼분위 행(ok · p₀ 있음)끼리 Holm. 통과 + 부호 = higher | lower."""
    out = list(stats)
    fams: dict[tuple[str, int], list[int]] = {}
    pvals: dict[int, float] = {}
    for i, s in enumerate(out):
        if s.tercile != "all" and s.status == "ok" and s.up_rate is not None and s.base_up_rate is not None:
            pvals[i] = two_sided_p(s.up_rate, s.sample_eff, s.base_up_rate)
            fams.setdefault((s.market, s.horizon), []).append(i)
    for idx in fams.values():
        adj = holm([pvals[i] for i in idx])
        for i, p in zip(idx, adj, strict=True):
            s = out[i]
            differs = None
            if p < HOLM_ALPHA and s.up_rate is not None and s.base_up_rate is not None and s.up_rate != s.base_up_rate:
                differs = "higher" if s.up_rate > s.base_up_rate else "lower"
            out[i] = replace(s, p_holm=p, differs=differs)
    return out
