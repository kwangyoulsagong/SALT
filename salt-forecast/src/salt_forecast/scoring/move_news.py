"""H3 큰 움직임 × 소식 실행 — 사전등록 `move-news@1`(FC-REQ-028 FR-9 · F017 v4 순서 4).

- 패널(국내 kis 1d · 코인 upbit 1d) → 사건 · 소식 유무 · 거래량 · 덮임 · 라벨(지평 1 · 5) · 비용.
- 기록: 아직 기록 안 한 사건 봉(라벨 닫히기 전 = 판정 표본 후보)을 그 시각 값으로.
- 채점: 기록된 사건 중 라벨이 닫힌 것에 s · 비용 · 제때 기록 여부.
- 검정: 과거 전부(참고 — 판정 아님) · 전진 표본(판정 날짜에만 판정).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.base_rate import CRYPTO_ROUND_TRIP
from salt_forecast.domain.move_news import (
    HORIZONS,
    PLACEBO_REPS,
    PLACEBO_SEED,
    REGISTERED_AT,
    CellRun,
    Group,
    cooldown,
    covered,
    diff_stat,
    events,
    group,
    labels,
    market_counts,
    news_counts,
    news_windows,
    placebo_flags,
    run_tests,
    sigma,
    volume_high,
)
from salt_forecast.domain.news_kind import Dictionary
from salt_forecast.domain.panel import Mat, Panel, build_panel, lag, rolling_sum
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.scoring.base_rate import crypto_universe, kr_costs
from salt_forecast.scoring.rule_ic_kr import kr_universe, session_panel, up_breaks
from salt_forecast.store.move_news import EventRow
from salt_forecast.store.news_reaction import RawTitle

KR_RECENT_BREAK = 22


@dataclass(frozen=True, slots=True)
class MarketData:
    """한 시장의 행렬 — 행 = 봉, 열 = 종목."""

    market: str
    dates: NDArray[np.int64]
    symbols: tuple[str, ...]
    r: Mat
    sig: Mat
    event: NDArray[np.bool_]
    news: NDArray[np.int64]
    source_ok: NDArray[np.bool_]  # 행마다
    vol_high: NDArray[np.bool_]
    covered: NDArray[np.bool_]
    s: dict[int, Mat]
    cost: dict[int, Mat]


def _key(market: str, code: str) -> str:
    return code if market == "kr" else f"KRW-{code}"


def title_times(
    market: str, raw: Sequence[RawTitle], d: Dictionary, symbols: Sequence[str], as_of: datetime
) -> tuple[dict[str, NDArray[np.int64]], NDArray[np.int64]]:
    """종목별 · 시장 전체 게시 시각(정렬). 움직임을 전하는 제목(exclude) · 묶음 기사(뉴스 관련 종목 > 2)는 뺀다."""
    have = set(symbols)
    words = d.exclude[market]
    per: dict[str, list[int]] = {}
    every: list[int] = []
    for t in raw:
        if t.published_at > as_of:
            continue
        ts = int(t.published_at.timestamp())
        every.append(ts)  # 덮임은 거르기 전 — 원천이 돌았나만 본다
        if t.origin == "news" and len(t.codes) > d.news_max_codes:
            continue
        low = t.title.lower()
        if any(w in low for w in words):
            continue
        for c in t.codes:
            k = _key(market, c)
            if k in have:
                per.setdefault(k, []).append(ts)
    pub = {k: np.array(sorted(v), dtype=np.int64) for k, v in per.items()}
    return pub, np.array(sorted(every), dtype=np.int64)


def _panel(market: str, ohlcv: Mapping[str, OhlcvSeries], as_of: datetime) -> Panel:
    t_end = int(as_of.timestamp())
    cut = {s: o.as_of(t_end) for s, o in ohlcv.items()}
    cut = {s: o for s, o in cut.items() if o.available_at.size}
    first = min((int(o.available_at[0]) for o in cut.values()), default=t_end)
    last = max((int(o.available_at[-1]) for o in cut.values()), default=first)
    return session_panel(cut, first, t_end) if market == "kr" else build_panel(cut, first, last)


def build(
    market: str, ohlcv: Mapping[str, OhlcvSeries], raw: Sequence[RawTitle], d: Dictionary, as_of: datetime
) -> MarketData:
    p = _panel(market, ohlcv, as_of)
    with np.errstate(divide="ignore", invalid="ignore"):
        r = np.log(p.close / lag(p.close, 1))
    breaks = None
    if market == "kr":
        breaks = up_breaks(p)
        r = np.where(breaks, np.nan, r)
        eligible = kr_universe(p, breaks) & ~(rolling_sum(breaks.astype(np.float64), KR_RECENT_BREAK) > 0)
    else:
        eligible = crypto_universe(p)
    sig = sigma(r)
    ev = events(r, sig, eligible)
    pub, every = title_times(market, raw, d, p.symbols, as_of)
    lo, hi = news_windows(market, p.dates)
    news = news_counts(pub, p.symbols, lo, hi)
    source_ok = market_counts(every, lo, hi) > 0
    s = {h: labels(p.close, r, eligible, h, breaks) for h in HORIZONS}
    cost = {h: kr_costs(p, h) if market == "kr" else np.full(p.close.shape, CRYPTO_ROUND_TRIP) for h in HORIZONS}
    return MarketData(
        market, p.dates, p.symbols, r, sig, ev, news, source_ok, volume_high(p.close * p.volume),
        covered(pub, p.symbols, p.dates), s, cost,
    )  # fmt: skip


# ── 기록 · 채점 ──


def new_events(md: MarketData, known: set[tuple[str, int]], since: int, at: datetime) -> list[EventRow]:
    """since(이 시각 뒤 봉) 의 사건 중 아직 기록 안 한 것 — 지금 값 그대로."""
    out: list[EventRow] = []
    rows = np.flatnonzero(md.dates > since)
    for t in rows:
        for j in np.flatnonzero(md.event[t]):
            sym = md.symbols[j]
            if (sym, int(md.dates[t])) in known:
                continue
            out.append(
                EventRow(
                    md.market, sym, datetime.fromtimestamp(int(md.dates[t]), UTC), float(md.r[t, j]),
                    float(md.sig[t, j]), int(md.news[t, j]), bool(md.vol_high[t, j]), bool(md.covered[t, j]),
                    bool(md.source_ok[t]), at,
                )
            )  # fmt: skip
    return out


def score_events(md: MarketData, rows: Sequence[EventRow], at: datetime) -> list[EventRow]:
    """라벨 5봉까지 닫힌(또는 1봉만 닫힌) 기록 사건에 s · 비용 · 제때 기록. 둘 다 닫히면 scored_at."""
    idx = {int(d): i for i, d in enumerate(md.dates)}
    col = {s: j for j, s in enumerate(md.symbols)}
    out: list[EventRow] = []
    n = md.dates.size
    for e in rows:
        if e.scored_at is not None:
            continue
        i = idx.get(int(e.ref_at.timestamp()))
        j = col.get(e.symbol)
        if i is None or j is None or i + 1 >= n:
            continue
        in_time = e.recorded_at.timestamp() < int(md.dates[i + 1])

        def val(h: int, src: dict[int, Mat], i: int = i, j: int = j) -> float | None:
            v = float(src[h][i, j]) if i + h < n else float("nan")
            return v if np.isfinite(v) else None

        done = i + 5 < n
        out.append(
            EventRow(
                e.market, e.symbol, e.ref_at, e.r, e.sigma, e.news_count, e.volume_high, e.covered, e.source_ok,
                e.recorded_at, val(1, md.s), val(5, md.s), val(1, md.cost), val(5, md.cost), in_time, in_time,
                at if done else None,
            )
        )  # fmt: skip
    return out


# ── 검정 ──


@dataclass(frozen=True, slots=True)
class Sample:
    """한 칸 표본 — 사건 (행, 열) · 날 · s · 비용 · 소식 · 거래량 · 덮인 종목."""

    day: NDArray[np.int64]
    s: NDArray[np.float64]
    net: NDArray[np.float64]
    has: NDArray[np.bool_]
    high: NDArray[np.bool_]
    covered: NDArray[np.bool_]
    rows: NDArray[np.int64]
    cols: NDArray[np.int64]


def history_sample(md: MarketData, h: int) -> Sample:
    """과거 전부(참고) — 원천이 돈 날 · 쿨다운 h · 라벨 있는 사건."""
    m = cooldown(md.event, h) & md.source_ok[:, None] & np.isfinite(md.s[h])
    t, j = np.nonzero(m)
    s = md.s[h][t, j]
    return Sample(
        (md.dates[t] // DAY).astype(np.int64), s, s - md.cost[h][t, j], md.news[t, j] > 0, md.vol_high[t, j],
        md.covered[t, j], t.astype(np.int64), j.astype(np.int64),
    )  # fmt: skip


def forward_sample(md: MarketData, rows: Sequence[EventRow], h: int) -> Sample:
    """전진 — 등록 뒤 봉 · 제때 기록 · 원천 돈 날 · 라벨 있음 · 기록 사건 위 쿨다운 h. 소식 · 거래량은 기록 값."""
    keep = [
        e for e in rows
        if e.ref_at >= REGISTERED_AT and e.source_ok and (e.in_time1 if h == 1 else e.in_time5)
        and (e.s1 if h == 1 else e.s5) is not None
    ]  # fmt: skip
    idx = {int(d): i for i, d in enumerate(md.dates)}
    col = {s: j for j, s in enumerate(md.symbols)}
    mask = np.zeros(md.event.shape, dtype=np.bool_)
    rec: dict[tuple[int, int], EventRow] = {}
    for e in keep:
        i, j = idx.get(int(e.ref_at.timestamp())), col.get(e.symbol)
        if i is not None and j is not None:
            mask[i, j] = True
            rec[(i, j)] = e
    t, j = np.nonzero(cooldown(mask, h))
    ev = [rec[(int(a), int(b))] for a, b in zip(t, j, strict=True)]
    s = np.array([e.s1 if h == 1 else e.s5 for e in ev], dtype=np.float64)
    c = np.array([e.cost1 if h == 1 else e.cost5 for e in ev], dtype=np.float64)
    return Sample(
        (md.dates[t] // DAY).astype(np.int64), s, s - c, np.array([e.news_count > 0 for e in ev], dtype=np.bool_),
        np.array([e.volume_high for e in ev], dtype=np.bool_), np.array([e.covered for e in ev], dtype=np.bool_),
        t.astype(np.int64), j.astype(np.int64),
    )  # fmt: skip


def run_cell(md: MarketData, h: int, smp: Sample, placebo: bool) -> CellRun:
    """집단 · 검정 셋 · 거래량별 · 견고성 · (placebo 면) 소식 날짜 옮긴 200회."""
    news = group(smp.day[smp.has], smp.s[smp.has], h)
    quiet = group(smp.day[~smp.has], smp.s[~smp.has], h)
    moves = group(smp.day, smp.s, h)
    net_news = group(smp.day[smp.has], smp.net[smp.has], h).mean
    net_quiet = group(smp.day[~smp.has], smp.net[~smp.has], h).mean
    by_volume: dict[str, tuple[Group, Group]] = {}
    for name, v in (("high", smp.high), ("normal", ~smp.high)):
        by_volume[name] = (group(smp.day[v & smp.has], smp.s[v & smp.has], h),
                           group(smp.day[v & ~smp.has], smp.s[v & ~smp.has], h))  # fmt: skip
    cell = CellRun(md.market, h, news, quiet, moves, net_news, net_quiet, by_volume, run_tests(news, quiet))
    cv = smp.covered
    rn = group(smp.day[cv & smp.has], smp.s[cv & smp.has], h).mean
    rq = group(smp.day[cv & ~smp.has], smp.s[cv & ~smp.has], h).mean
    cell.robust_same_sign = bool(
        np.isfinite(rn) and np.isfinite(rq) and np.sign(rn) == np.sign(news.mean) and np.sign(rq) == np.sign(quiet.mean)
    )
    if placebo and smp.s.size:
        rng = np.random.default_rng(PLACEBO_SEED + h + (0 if md.market == "kr" else 100))
        flag = md.news > 0
        stats: list[float] = []
        for _ in range(PLACEBO_REPS):
            moved = placebo_flags(flag, rng)
            stats.append(diff_stat(smp.day, smp.s, moved[smp.rows, smp.cols], h))
        arr = np.array(stats)
        arr = arr[np.isfinite(arr)]
        real = news.mean - quiet.mean
        if arr.size:
            cell.placebo_q95 = float(np.quantile(arr, 0.95))
            cell.placebo_pass = bool(np.isfinite(real) and real > cell.placebo_q95)
    return cell


def detail(c: CellRun) -> dict[str, object]:
    def g(x: Group) -> dict[str, float | int]:
        return {"events": x.events, "days": x.days, "mean": x.mean, "se": x.se}

    return {
        "news": g(c.news), "quiet": g(c.quiet), "moves": g(c.moves), "netNews": c.net_news, "netQuiet": c.net_quiet,
        "byVolume": {k: {"news": g(a), "quiet": g(b)} for k, (a, b) in c.by_volume.items()},
    }  # fmt: skip


# ── 리포트 ──


def _pct(x: float) -> str:
    return "—" if not np.isfinite(x) else f"{x * 100:+.2f}%"


def render_report(
    key: str,
    sha: str,
    as_of: datetime,
    reference: Sequence[CellRun],
    forward: Sequence[CellRun],
    recorded: Mapping[str, int],
    windows: Mapping[str, tuple[int, int]],
) -> str:
    lines = [
        f"# H3 큰 움직임 × 소식 — `{key}` ({as_of.date().isoformat()})",
        "",
        f"- 사전등록 `preregistration/2026-11-13-move-news.toml` · 코드 `{sha}` · as_of {as_of.isoformat()}",
        "- 사건 = |r| ≥ 2σ(직전 20 · 오늘 제외) · s = 움직인 방향 × (h 봉 수익 − 같은 날 시장 평균) · 쿨다운 h",
        "- 소식 = 국내 (전 거래일 15:30, 그날 15:30] 시황 · 공시 제목 / 코인 그 하루 심볼 제목."
        " 움직임을 전하는 제목 · 묶음 기사 제외",
        "- **판정은 전진 표본만**(등록 2026-11-13 뒤 · 라벨 닫히기 전 기록). 과거 숫자는 참고 — 소식 이력이 짧다",
        "- '소식 없음' = 우리가 모은 원천에 없음(세상에 없음이 아니다)",
        "",
        "오늘 새로 기록한 사건: " + " · ".join(f"{m} {n}" for m, n in recorded.items()),
        "",
    ]
    for title, cells in (("전진 표본(판정 대상)", forward), ("과거 참고(판정 아님)", reference)):
        lines += [
            f"## {title}",
            "",
            "| 칸 | 소식 있음 사건 · 날 · 평균 s | 소식 없음 사건 · 날 · 평균 s | 차이 | 비용 뒤 있음 · 없음"
            " | 움직임만 |"
            " 거래량 많음 있음 · 없음 | 플라시보 95% | 견고성 | 검정 상태 |",
            "|---|---|---|---|---|---|---|---|---|---|",
        ]
        for c in cells:
            hv = c.by_volume["high"]
            st = " · ".join(f"{t}: {s}{f' ({r})' if r else ''}" for t, (s, r) in c.status.items()) or "—"
            lines.append(
                f"| {c.market} h{c.horizon} | {c.news.events} · {c.news.days} · {_pct(c.news.mean)} |"
                f" {c.quiet.events} · {c.quiet.days} · {_pct(c.quiet.mean)} | {_pct(c.news.mean - c.quiet.mean)} |"
                f" {_pct(c.net_news)} · {_pct(c.net_quiet)} | {_pct(c.moves.mean)} |"
                f" {_pct(hv[0].mean)} · {_pct(hv[1].mean)} | {_pct(c.placebo_q95)} |"
                f" {'같은 부호' if c.robust_same_sign else '다름 · 없음'} | {st} |"
            )
        lines.append("")
    lines += ["## 자료 창", ""]
    for m, (a, b) in windows.items():
        lines.append(f"- {m}: 봉 {datetime.fromtimestamp(a, UTC).date()} ~ {datetime.fromtimestamp(b, UTC).date()}")
    lines += [
        "",
        "## 한계",
        "",
        "- 국내 소식 이력은 서버 1년 백필이 끝나야 찬다(새 맥 2026-11-16). 과거 참고 칸은 대부분 below_min",
        "- 판정 날짜 2027-01-12 · 02-11 · 03-13 — 그 전엔 화면에 이 숫자를 쓰지 않는다",
    ]
    return "\n".join(lines) + "\n"
