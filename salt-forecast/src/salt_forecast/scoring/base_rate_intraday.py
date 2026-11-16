"""장중 조건부 기저율 — 사전등록 `base-rate@3` 실행(FC-REQ-028 FR-7 · F017 v4 순서 3).

5분봉 격자에서 조건이 성립한 (종목, 칸)을 찾고 1시간(12칸) · 4시간(48칸) 뒤 수익을 모아 `domain/base_rate` 로 서술한다.
서술 · 수축 · Holm 은 `base-rate@1` 과 같은 함수(`describe` · `finalize`) — 다른 것은 격자 · 조건 · 라벨뿐이다.

**구간으로 나눠 돈다.** 코인 5분봉 2년은 302종목 × 21만 칸 ≈ 6천만 칸 — 행렬 하나가 0.5GB 라 통째로 못 든다.
구간(60일)마다 앞 21일(같은 시각 20일 평균 · 크기 묶음 창)과 뒤 1일(4시간 라벨)을 덧대 읽고,
사건은 구간 안 칸에서만 센다.
쿨다운(최대 48칸)은 덧댄 칸까지 포함해 걸어 구간 경계에서 같은 사건을 두 번 세지 않는다.

시점 규칙(time-and-leakage.md):
- 칸 t 의 조건은 칸 ≤ t 만 본다. 같은 시각 평균 · 크기 묶음은 **t 이전 날 · 칸까지**(오늘 그 시각 제외)
- 라벨만 t+h 칸을 본다. 국내는 그날 마지막 칸에서 끊는다
- VI · 거시 발표는 available_at(발동 · 발표 시각) <= 사건 칸 마감만. 라이브 문턱은 마지막 칸 T 까지만
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.base_rate import (
    CRYPTO_ROUND_TRIP,
    KR_COMMISSION_PER_SIDE,
    Events,
    Stat,
    StatRow,
    Trigger,
    cooldown,
    describe,
    finalize,
    kr_sell_tax,
    krx_tick,
)
from salt_forecast.domain.panel import Mat, Panel, build_panel, lag
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.scoring.base_rate import Condition, MarketRun

KEY = "base-rate@3"
BAR = 300
HOUR_BARS = 12
KST = 9 * 3600
SAME_TIME_DAYS = 20
SIZE_BARS = 288 * 20
RECENT_DAYS = 90
UP = float(np.log(1.03))
DOWN = float(np.log(0.97))
GAP = 1.03
K7_UP = 1.02
VALUE_SURGE = 3.0
LARGE_TOP = 10
CHUNK_DAYS = 60
PAD_BEFORE_DAYS = 21
KR_PAD_BEFORE_DAYS = 32  # 20거래일 = 달력 약 28일 + 연휴 여유
PAD_AFTER_DAYS = 1
MACRO_KINDS = ("cpi", "fomc", "jobs")

CRYPTO_CONDITIONS: tuple[Condition, ...] = (
    Condition("ALL", "crypto", (1, 4), "usual"),
    Condition("CM1S", "crypto", (1, 4), "test"),
    Condition("CM1L", "crypto", (1, 4), "test"),
    Condition("CM2S", "crypto", (1, 4), "test"),
    Condition("CM2L", "crypto", (1, 4), "test"),
    Condition("CM3", "crypto", (1, 4), "test"),
    Condition("C4", "crypto", (1, 4), "test"),
    Condition("C6U", "crypto", (4,), "test"),
    Condition("C6D", "crypto", (4,), "test"),
)
KR_CONDITIONS: tuple[Condition, ...] = (
    Condition("ALL", "kr", (1, 4), "usual"),
    Condition("KM1", "kr", (1, 4), "test"),
    Condition("KM2", "kr", (1, 4), "test"),
    Condition("KM3", "kr", (1, 4), "test"),
    Condition("KM4", "kr", (1, 4), "test"),
    Condition("K5", "kr", (1, 4), "test"),
    Condition("K7", "kr", (1, 4), "test"),
)

Loader = Callable[[datetime, datetime], Mapping[str, OhlcvSeries]]


@dataclass(frozen=True, slots=True)
class Frame:
    """한 구간의 패널 + 칸마다 KST 날 · 분. `core` = 사건을 세는 칸(덧댄 칸 제외)."""

    p: Panel
    days: NDArray[np.int64]
    minute: NDArray[np.int64]
    core: NDArray[np.bool_]


# ── 공용 계산 (I/O 없음) ──


def kst_days(dates: NDArray[np.int64]) -> NDArray[np.int64]:
    return ((dates + KST) // DAY).astype(np.int64)


def kst_minute(dates: NDArray[np.int64]) -> NDArray[np.int64]:
    """칸 마감의 KST 하루 중 분."""
    return (((dates + KST) % DAY) // 60).astype(np.int64)


def window_sum(m: Mat, w: int, alive: NDArray[np.bool_]) -> Mat:
    """칸 t 까지(포함) w 칸 합 — 빈 칸은 0(체결 없음). 종목이 생기기 전(`alive` 거짓) · 창이 모자란 칸은 NaN."""
    c = np.cumsum(np.nan_to_num(m), axis=0)
    out = c.copy()
    out[w:] = c[w:] - c[:-w]
    out[: w - 1] = np.nan
    born = np.cumsum(alive, axis=0)
    out[born < 1] = np.nan
    return out


def same_time_mean(m: Mat, minute: NDArray[np.int64], w: int) -> Mat:
    """칸 t 와 **같은 시각**(분 칸)의 직전 w 개 칸 평균 — 오늘 그 시각은 빼고. 창에 NaN 이 있으면 NaN."""
    out = np.full_like(m, np.nan)
    for s in np.unique(minute):
        rows = np.flatnonzero(minute == s)
        sub = m[rows]
        if rows.size <= w:
            continue
        c = np.cumsum(np.nan_to_num(sub), axis=0)
        holes = np.cumsum(np.isnan(sub), axis=0)
        mean = np.full_like(sub, np.nan)
        # 칸 i(그 시각의 i 번째)의 평균 = 그 시각 i−w … i−1
        mean[w:] = (c[w - 1 : -1] - np.vstack([np.zeros((1, sub.shape[1])), c[: -w - 1]])) / w
        bad = holes[w - 1 : -1] - np.vstack([np.zeros((1, sub.shape[1])), holes[: -w - 1]])
        mean[w:][bad > 0] = np.nan
        out[rows] = mean
    return out


def ffill(m: Mat) -> Mat:
    """행 방향 앞 값 채우기 — 라벨 전용(체결 없는 칸 = 가격 그대로, 사전등록 label). 조건 계산엔 쓰지 않는다."""
    rows: NDArray[np.int64] = np.arange(m.shape[0], dtype=np.int64)[:, None]
    idx: NDArray[np.int64] = np.where(~np.isnan(m), rows, 0)
    idx = np.maximum.accumulate(idx, axis=0)
    out = m[idx, np.arange(m.shape[1])]
    first = np.cumsum(~np.isnan(m), axis=0) == 0
    out[first] = np.nan
    return out


def rank_groups(size: Mat, universe: NDArray[np.bool_]) -> tuple[NDArray[np.bool_], NDArray[np.bool_]]:
    """칸마다 대상 종목을 크기 내림차순 — 상위 10 = 대형, 하위 2/3 = 소형.

    base-rate@1 `size_groups` 와 같은 규칙을 벡터화했다(5분 칸 수만 개를 파이썬 루프로 돌지 않게)."""
    vals = np.where(universe & ~np.isnan(size), size, -np.inf)
    order = np.argsort(-vals, axis=1, kind="stable")
    rank = np.empty_like(order)
    positions: NDArray[np.int64] = np.broadcast_to(np.arange(order.shape[1], dtype=np.int64), order.shape).copy()
    np.put_along_axis(rank, order, positions, axis=1)
    n = (vals > -np.inf).sum(axis=1)
    # 정수로 — ceil(n × (1 − 2/3)) 은 부동소수(0.33333333333333337 × 30 = 10.000000000000002)로
    # 한 칸 밀려 소형이 하나 준다
    cut = n - (2 * n) // 3
    ok = vals > -np.inf
    return ok & (rank < LARGE_TOP), ok & (rank >= cut[:, None])


def log_ratio(a: Mat, b: Mat) -> Mat:
    with np.errstate(divide="ignore", invalid="ignore"):
        return np.log(a / b)


def bar_close_of(t: datetime) -> int:
    """시각 t 가 든 5분 봉의 마감(epoch 초) — 봉 시작 ≤ t < 시작 + 5분."""
    s = int(t.timestamp())
    return s - s % BAR + BAR


# ── 격자 ──


def crypto_frame(series: Mapping[str, OhlcvSeries], start: int, end: int, core: tuple[int, int]) -> Frame:
    p = build_panel(series, start, end, step=BAR)
    return Frame(p, kst_days(p.dates), kst_minute(p.dates), (p.dates >= core[0]) & (p.dates < core[1]))


def kr_frame(series: Mapping[str, OhlcvSeries], start: int, end: int, core: tuple[int, int]) -> Frame:
    """장중 칸만 — 봉이 하나도 없는 칸(장 밖 · 휴장)을 뺀다.

    그래서 '30분 전 · 같은 시각 20거래일'이 장중 칸으로 이어진다."""
    p = build_panel(series, start, end, step=BAR)
    rows = np.flatnonzero(np.any(~np.isnan(p.close), axis=1))
    has = ~np.isnan(p.close[rows])
    listed = np.where(has.any(axis=0), has.argmax(axis=0), rows.size).astype(np.int64)
    q = Panel(
        p.dates[rows], p.symbols, p.high[rows], p.low[rows], p.close[rows], p.volume[rows], listed,
        None if p.open is None else p.open[rows],
    )  # fmt: skip
    return Frame(q, kst_days(q.dates), kst_minute(q.dates), (q.dates >= core[0]) & (q.dates < core[1]))


# ── 조건 ──


def _values(f: Frame) -> tuple[Mat, Mat, NDArray[np.bool_]]:
    p = f.p
    alive = ~np.isnan(p.close)
    value = p.close * p.volume
    v30 = window_sum(value, 6, alive)
    v60 = window_sum(value, HOUR_BARS, alive)
    return v30, v60, alive


def crypto_masks(f: Frame, macro_closes: Sequence[int]) -> tuple[dict[str, NDArray[np.bool_]], NDArray[np.bool_]]:
    p = f.p
    v30, v60, alive = _values(f)
    avg30 = same_time_mean(v30, f.minute, SAME_TIME_DAYS)
    avg60 = same_time_mean(v60, f.minute, SAME_TIME_DAYS)
    universe = alive & ~np.isnan(avg30)
    r30 = log_ratio(p.close, lag(p.close, 6))
    r60 = log_ratio(p.close, lag(p.close, HOUR_BARS))
    size = lag(window_sum(p.close * p.volume, SIZE_BARS, alive), 1) / SAME_TIME_DAYS
    large, small = rank_groups(size, universe)
    macro = np.isin(p.dates, np.asarray(macro_closes, dtype=np.int64))[:, None]
    with np.errstate(invalid="ignore"):
        up = universe & (r30 >= UP)
        down = universe & (r30 <= DOWN)
        masks = {
            "ALL": universe & (f.minute % 60 == 0)[:, None],
            "CM1S": up & small,
            "CM1L": up & large,
            "CM2S": down & small,
            "CM2L": down & large,
            "CM3": universe & (v30 >= VALUE_SURGE * avg30),
            "C4": universe & (r60 >= UP) & (v60 >= VALUE_SURGE * avg60),
            "C6U": universe & macro & (r60 > 0),
            "C6D": universe & macro & (r60 < 0),
        }
    return masks, universe


def kr_masks(
    f: Frame, vi_closes: Mapping[str, Sequence[int]]
) -> tuple[dict[str, NDArray[np.bool_]], NDArray[np.bool_]]:
    p = f.p
    v30, _, alive = _values(f)
    avg30 = same_time_mean(v30, f.minute, SAME_TIME_DAYS)
    universe = alive & ~np.isnan(avg30)
    r30 = log_ratio(p.close, lag(p.close, 6))
    first_row = np.r_[True, f.days[1:] != f.days[:-1]]
    opened = p.open if p.open is not None else np.full_like(p.close, np.nan)
    # 그날 첫 칸 시가를 그날 모든 칸에 — K7(첫 30분 = 09:30 종가 / 09:00 시가)
    starts: NDArray[np.int64] = np.where(first_row, np.arange(first_row.size, dtype=np.int64), 0)
    day_start = np.maximum.accumulate(starts)
    day_open = opened[day_start]
    vi = np.zeros_like(universe)
    col = {s: j for j, s in enumerate(p.symbols)}
    for code, closes in vi_closes.items():
        j = col.get(code)
        if j is None:
            continue
        rows = np.searchsorted(p.dates, np.asarray(closes, dtype=np.int64))
        ok = rows < p.dates.size
        rows = rows[ok][p.dates[rows[ok]] == np.asarray(closes, dtype=np.int64)[ok]]
        vi[rows, j] = True
    with np.errstate(invalid="ignore"):
        masks = {
            "ALL": universe & (f.minute % 60 == 0)[:, None],
            "KM1": universe & (r30 >= UP),
            "KM2": universe & (r30 <= DOWN),
            "KM3": universe & (v30 >= VALUE_SURGE * avg30),
            "KM4": universe & first_row[:, None] & (opened >= GAP * lag(p.close, 1)),
            "K5": universe & vi,
            "K7": universe & (f.minute == 9 * 60 + 30)[:, None] & (p.close >= K7_UP * day_open),
        }
    return masks, universe


def first_vi_closes(vi: Sequence[tuple[str, datetime]]) -> dict[str, list[int]]:
    """종목 · KST 날마다 첫 정적 VI 의 봉 마감(사전등록 K5 — 그날 첫 발동만)."""
    seen: set[tuple[str, int]] = set()
    out: dict[str, list[int]] = {}
    for code, at in sorted(vi, key=lambda x: (x[0], x[1])):
        day = (int(at.timestamp()) + KST) // DAY
        if (code, day) in seen:
            continue
        seen.add((code, day))
        out.setdefault(code, []).append(bar_close_of(at))
    return out


def macro_closes(events: Sequence[datetime]) -> list[int]:
    """거시 발표 + 1시간이 끝나는 칸(사전등록 C6 — 발표 뒤 첫 1시간의 방향을 그 칸에서 본다)."""
    return [bar_close_of(e + timedelta(hours=1) - timedelta(seconds=1)) for e in events]


# ── 라벨 · 비용 ──


def crypto_labels(p: Panel) -> dict[int, Mat]:
    c = ffill(p.close)
    out: dict[int, Mat] = {}
    for h in (1, 4):
        k = h * HOUR_BARS
        lab = np.full_like(p.close, np.nan)
        lab[:-k] = log_ratio(c[k:], p.close[:-k])
        out[h] = lab
    return out


def kr_labels(f: Frame) -> dict[int, Mat]:
    """오늘 장 마감까지 — t+h 가 그날 마지막 칸을 넘으면 그날 마지막 칸, t 가 마지막 칸이면 없음."""
    n = f.days.size
    last = np.empty(n, dtype=np.int64)
    end = n - 1
    for i in range(n - 1, -1, -1):
        if i < n - 1 and f.days[i] != f.days[i + 1]:
            end = i
        last[i] = end
    c = ffill(f.p.close)
    out: dict[int, Mat] = {}
    for h in (1, 4):
        target = np.minimum(np.arange(n) + h * HOUR_BARS, last)
        ok = target > np.arange(n)
        lab = np.full_like(f.p.close, np.nan)
        lab[ok] = log_ratio(c[target[ok]], f.p.close[ok])
        out[h] = lab
    return out


def kr_cost(f: Frame) -> Mat:
    tax = np.array([kr_sell_tax(date.fromordinal(int(d) + date(1970, 1, 1).toordinal())) for d in f.days])
    ticks = np.vectorize(krx_tick, otypes=[np.float64])(np.nan_to_num(f.p.close, nan=1.0))
    with np.errstate(invalid="ignore", divide="ignore"):
        return KR_COMMISSION_PER_SIDE * 2 + tax[:, None] + ticks / f.p.close


# ── 사건 모으기 · 서술 ──


@dataclass(slots=True)
class Pool:
    """조건 × 지평마다 구간을 넘어 쌓는 사건(날 · 비용 뒤 · 비용 전)."""

    day: dict[tuple[str, int], list[NDArray[np.int64]]]
    net: dict[tuple[str, int], list[NDArray[np.float64]]]
    gross: dict[tuple[str, int], list[NDArray[np.float64]]]

    @staticmethod
    def empty() -> Pool:
        return Pool({}, {}, {})

    def add(
        self, key: tuple[str, int], day: NDArray[np.int64], net: NDArray[np.float64], gross: NDArray[np.float64]
    ) -> None:
        self.day.setdefault(key, []).append(day)
        self.net.setdefault(key, []).append(net)
        self.gross.setdefault(key, []).append(gross)

    def events(self, key: tuple[str, int]) -> Events:
        if key not in self.day:
            return Events(np.zeros(0, np.int64), np.zeros(0), np.zeros(0))
        return Events(np.concatenate(self.day[key]), np.concatenate(self.net[key]), np.concatenate(self.gross[key]))


def collect(
    pool: Pool,
    f: Frame,
    conditions: Sequence[Condition],
    masks: Mapping[str, NDArray[np.bool_]],
    labels: Mapping[int, Mat],
    cost: Mat | float,
) -> None:
    cost_m = cost if isinstance(cost, np.ndarray) else np.full(f.p.close.shape, cost)
    for c in conditions:
        for h in c.horizons:
            m = masks[c.id] if c.kind == "usual" else cooldown(masks[c.id], h * HOUR_BARS)
            ok = m & f.core[:, None] & ~np.isnan(labels[h]) & ~np.isnan(cost_m)
            rows, _ = np.nonzero(ok)
            gross = labels[h][ok]
            pool.add((c.id, h), f.days[rows], gross - cost_m[ok], gross)


def summarize_pool(market: str, conditions: Sequence[Condition], pool: Pool, recent_from_day: int) -> list[StatRow]:
    stats: list[Stat] = []
    meta: list[tuple[Condition, int]] = []
    for c in conditions:
        for h in c.horizons:
            stats.append(describe(pool.events((c.id, h)), recent_from_day))
            meta.append((c, h))
    rows: list[StatRow] = []
    for h in sorted({h for _, h in meta}):
        idx = [i for i, (_, hh) in enumerate(meta) if hh == h]
        usual = next((stats[i] for i in idx if meta[i][0].kind == "usual"), None)
        p0 = usual.up_rate if usual is not None else None
        verdicts = finalize([stats[i] for i in idx], [meta[i][0].kind == "test" for i in idx], p0)
        for i, v in zip(idx, verdicts, strict=True):
            rows.append(StatRow(market, meta[i][0].id, h, meta[i][0].kind, stats[i], v))
    return rows


def chunks(first: int, last: int) -> list[tuple[int, int]]:
    """[first, last] 를 KST 자정 경계 60일 구간으로."""
    start = ((first + KST) // DAY) * DAY - KST
    out: list[tuple[int, int]] = []
    while start <= last:
        end = start + CHUNK_DAYS * DAY
        out.append((start, min(end, last + 1)))
        start = end
    return out


def _d(t: int) -> date:
    return datetime.fromtimestamp(t + KST, tz=UTC).date()


# ── 실행 ──


def run_crypto(load: Loader, first: datetime, as_of: datetime, macro: Sequence[datetime]) -> MarketRun:
    t_end = int(as_of.timestamp())
    pool = Pool.empty()
    closes = macro_closes(macro)
    total_rows = 0
    universe_sum = 0.0
    universe_rows = 0
    for cs, ce in chunks(int(first.timestamp()), t_end):
        lo, hi = cs - PAD_BEFORE_DAYS * DAY, min(ce + PAD_AFTER_DAYS * DAY, t_end)
        series = {s: o.as_of(t_end) for s, o in load(_dt(lo), _dt(hi)).items()}
        if not series:
            continue
        f = crypto_frame(series, lo, hi, (cs, ce))
        masks, universe = crypto_masks(f, closes)
        collect(pool, f, CRYPTO_CONDITIONS, masks, crypto_labels(f.p), CRYPTO_ROUND_TRIP)
        core_u = universe[f.core]
        total_rows += int(f.core.sum())
        universe_sum += float(core_u.sum())
        universe_rows += int(core_u.any(axis=1).sum())
    run = MarketRun("crypto", (_d(int(first.timestamp())), _d(t_end)))
    run.stats = summarize_pool("crypto", CRYPTO_CONDITIONS, pool, _recent_from(t_end))
    run.universe_mean = universe_sum / universe_rows if universe_rows else 0.0
    run.rows = total_rows
    return run


def run_kr(load: Loader, first: datetime, as_of: datetime, vi: Sequence[tuple[str, datetime]]) -> MarketRun:
    t_end = int(as_of.timestamp())
    pool = Pool.empty()
    vi_closes = first_vi_closes(vi)
    total_rows = 0
    universe_sum = 0.0
    universe_rows = 0
    for cs, ce in chunks(int(first.timestamp()), t_end):
        lo, hi = cs - KR_PAD_BEFORE_DAYS * DAY, min(ce + PAD_AFTER_DAYS * DAY, t_end)
        series = {s: o.as_of(t_end) for s, o in load(_dt(lo), _dt(hi)).items()}
        if not series:
            continue
        f = kr_frame(series, lo, hi, (cs, ce))
        if f.p.dates.size == 0:
            continue
        masks, universe = kr_masks(f, vi_closes)
        collect(pool, f, KR_CONDITIONS, masks, kr_labels(f), kr_cost(f))
        core_u = universe[f.core]
        total_rows += int(f.core.sum())
        universe_sum += float(core_u.sum())
        universe_rows += int(core_u.any(axis=1).sum())
    run = MarketRun("kr", (_d(int(first.timestamp())), _d(t_end)))
    run.stats = summarize_pool("kr", KR_CONDITIONS, pool, _recent_from(t_end))
    run.universe_mean = universe_sum / universe_rows if universe_rows else 0.0
    run.rows = total_rows
    return run


def _dt(t: int) -> datetime:
    return datetime.fromtimestamp(t, tz=UTC)


def _recent_from(t_end: int) -> int:
    return (t_end + KST - RECENT_DAYS * DAY) // DAY


# ── 라이브 문턱 (5분마다) ──


def _closed(
    market: str, f: Frame, masks: Mapping[str, NDArray[np.bool_]], conditions: Sequence[Condition]
) -> list[Trigger]:
    T = f.p.dates.size - 1
    out: list[Trigger] = []
    for c in conditions:
        if c.kind == "usual":
            continue
        for j in np.flatnonzero(masks[c.id][T]):
            out.append(
                Trigger(market, f.p.symbols[j], c.id, float(f.p.close[T, j]), int(f.p.dates[T]), applies_to="closed")
            )
    return out


def crypto_live(series: Mapping[str, OhlcvSeries], as_of: datetime, macro: Sequence[datetime]) -> list[Trigger]:
    """마지막 칸 T — '다음 칸에 30분 ±3%' 문턱(기준 = C_{T−5}, 다음 칸의 30분 전 종가) + 이미 성립한 조건."""
    t_end = int(as_of.timestamp())
    cut = {s: o.as_of(t_end) for s, o in series.items()}
    last = max((int(o.available_at[-1]) for o in cut.values() if o.available_at.size), default=0)
    if last == 0:
        return []
    f = crypto_frame(cut, last - (PAD_BEFORE_DAYS + 1) * DAY, last, (last, last + 1))
    if f.p.dates.size < 7:
        return []
    masks, universe = crypto_masks(f, macro_closes(macro))
    T = f.p.dates.size - 1
    alive = ~np.isnan(f.p.close)
    size_next = window_sum(f.p.close * f.p.volume, SIZE_BARS, alive)[T] / SAME_TIME_DAYS
    live = alive[T] & universe[T]
    large, small = rank_groups(size_next[None, :], live[None, :])
    base = ffill(f.p.close)[T - 5]
    out: list[Trigger] = []
    for j, sym in enumerate(f.p.symbols):
        b = float(base[j])
        if not live[j] or np.isnan(b):
            continue
        tag = "S" if small[0, j] else "L" if large[0, j] else None
        if tag is None:
            continue
        out.append(Trigger("crypto", sym, f"CM1{tag}", b, int(f.p.dates[T]), price_at_least=b * GAP))
        out.append(Trigger("crypto", sym, f"CM2{tag}", b, int(f.p.dates[T]), price_at_most=b * (2 - GAP)))
    return out + _closed("crypto", f, masks, CRYPTO_CONDITIONS)


def kr_live(series: Mapping[str, OhlcvSeries], as_of: datetime, vi: Sequence[tuple[str, datetime]]) -> list[Trigger]:
    t_end = int(as_of.timestamp())
    cut = {s: o.as_of(t_end) for s, o in series.items()}
    last = max((int(o.available_at[-1]) for o in cut.values() if o.available_at.size), default=0)
    if last == 0:
        return []
    f = kr_frame(cut, last - KR_PAD_BEFORE_DAYS * DAY, last, (last, last + 1))
    if f.p.dates.size < 7:
        return []
    masks, universe = kr_masks(f, first_vi_closes(vi))
    T = f.p.dates.size - 1
    base = ffill(f.p.close)[T - 5]
    out: list[Trigger] = []
    for j, sym in enumerate(f.p.symbols):
        b = float(base[j])
        if not universe[T, j] or np.isnan(b):
            continue
        out.append(Trigger("kr", sym, "KM1", b, int(f.p.dates[T]), price_at_least=b * GAP))
        out.append(Trigger("kr", sym, "KM2", b, int(f.p.dates[T]), price_at_most=b * (2 - GAP)))
    return out + _closed("kr", f, masks, KR_CONDITIONS)


# ── 리포트 ──

_TEXT: dict[str, str] = {
    "ALL": "평소(정각 칸 전체)",
    "CM1S": "30분 ≥ +3% · 소형",
    "CM1L": "30분 ≥ +3% · 대형(상위 10)",
    "CM2S": "30분 ≤ −3% · 소형",
    "CM2L": "30분 ≤ −3% · 대형(상위 10)",
    "CM3": "30분 거래대금 ≥ 같은 시각 평소 3배",
    "C4": "1시간 ≥ +3% · 거래대금 3배(펌프)",
    "C6U": "거시 발표 뒤 첫 1시간 오름",
    "C6D": "거시 발표 뒤 첫 1시간 내림",
    "KM1": "30분 ≥ +3%",
    "KM2": "30분 ≤ −3%",
    "KM3": "30분 거래대금 ≥ 같은 시각 평소 3배",
    "KM4": "시가 갭 ≥ +3%",
    "K5": "정적 VI 뒤",
    "K7": "첫 30분 ≥ +2%",
}


def _pct(x: float | None) -> str:
    return "—" if x is None else f"{x * 100:.2f}%"


def render_report(git_sha: str, as_of: datetime, runs: list[MarketRun]) -> str:
    lines = [
        f"# 장중 조건부 기저율 — `{KEY}` ({as_of.date().isoformat()})",
        "",
        "- 사전등록 `preregistration/2026-11-16-base-rate-intraday.toml`"
        f" · 코드 `{git_sha}` · as_of {as_of.isoformat()}",
        "- 격자 = 5분봉(코인 업비트 · 국내 서버 KIS 5분봉)."
        " 지평 h = 1 · 4 시간(12 · 48칸), 국내는 그날 장 마감에서 끊는다",
        "- 사기 전 = 비용 뒤 로그수익(코인 0.15% · 국내 수수료 × 2 + 그날 거래세 + 반 틱 × 2)"
        " · 팔기 전 보유 연장 = 비용 전",
        "- 유효 n = 같은 KST 날 몰림(ICC) 보정 · 문턱 유효 n ≥ 100 · 서로 다른 날 ≥ 60,"
        " 못 넘으면 `below_min`(숫자 없음)",
        "- 평소 = 정각 칸만(5분마다 겹치는 라벨로 표본을 부풀리지 않게). 조건 사건은 h 칸 쿨다운",
        "- 진입 = 조건이 성립한 칸 종가(라이브는 지금 가격). 라이브 '30분'은 다음 칸의 30분 전 종가 대비",
        "- '평소와 다름'은 Holm(시장 · 지평마다 가족) α 0.05 통과 + 수축 차이 부호일 때만. '최근' = 최근 90일",
        "",
    ]
    for run in runs:
        title = "국내 주식" if run.market == "kr" else "코인"
        lines += [
            f"## {title} — {run.window[0]} ~ {run.window[1]} · 칸 {run.rows}"
            f" · 칸마다 평균 대상 {run.universe_mean:.0f}종목",
            "",
            "| 조건 | h | 상태 | 사건 | 유효 n | 날 | 오른 비율(비용 뒤) | 95% | 수축 | q10 · q50 · q90"
            " | 보유 연장 q10 · q50 · q90 | 평소와 | 최근 |",
            "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
        ]
        for r in run.stats:
            s, v = r.stat, r.verdict
            band = "—" if s.up_low is None else f"{_pct(s.up_low)} ~ {_pct(s.up_high)}"
            q = "—" if s.q10 is None else f"{_pct(s.q10)} · {_pct(s.q50)} · {_pct(s.q90)}"
            hq = "—" if s.hold_q10 is None else f"{_pct(s.hold_q10)} · {_pct(s.hold_q50)} · {_pct(s.hold_q90)}"
            ph = "" if v.p_holm is None else f" (p {v.p_holm:.3f})"
            recent = "—" if s.recent_differs is None else ("다름" if s.recent_differs else "같음")
            lines.append(
                f"| {r.condition_id} {_TEXT.get(r.condition_id, '')} | {r.horizon}h | {s.status} | {s.sample} | "
                f"{s.sample_eff:.0f} | {s.sample_days} | {_pct(s.up_rate)} | {band} | {_pct(v.up_rate_shrunk)} | {q} | "
                f"{hq} | {v.differs or '—'}{ph} | {recent} |"
            )
        lines.append("")
    lines += [
        "## 한계",
        "",
        "- 국내 5분봉은 서버 KIS 일별분봉 1년 백필(밤마다 2만 호출) + 2026-11-16 부터 400일 보관"
        " — 백필이 끝나기 전 국내 행은 서로 다른 날이 모자라 `below_min` 일 수 있다."
        " 국내 대상은 서버 5분봉 유니버스(약 50종목)뿐 — 전 종목이 아니다",
        "- VI(K5)는 2026-11-16 부터 쌓는다(KIS 는 지난 VI 를 주지 않는다)"
        " — 서로 다른 날 60 이 차는 2027-02 전엔 `below_min`",
        "- 코인 5분봉은 2024-11 부터(약 2년) — 국면 하나가 표본 대부분이다. '최근' 열이 이동을 표시한다",
        "- 업비트는 체결 없는 5분에 봉을 주지 않는다"
        " — 조건(30분 전 봉 필요)은 결측이면 불성립, 라벨은 앞 값으로 잇는다",
        "- C5(거래량 시계 첫 집중 30분)는 리서치 정의가 없어 뺐다 — `base-rate@4` 후보",
    ]
    return "\n".join(lines) + "\n"
