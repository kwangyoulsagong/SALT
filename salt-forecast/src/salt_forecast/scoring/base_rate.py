"""조건부 기저율 — 사전등록 `base-rate@1` 실행(FC-REQ-028 FR-2 · F017 v2 단계 2).

일봉 패널에서 조건이 성립한 (종목, 날)을 찾고, 지평 h 뒤 수익을 모아 `domain/base_rate` 로 서술한다.
같은 정의로 **마지막 봉 기준 라이브 문턱**(지금 가격이 얼마면 조건 성립인가)을 낸다 — 서버는 숫자 비교만 한다.

시점 규칙(time-and-leakage.md):
- 행 t 의 조건은 행 ≤ t 만 본다. σ · 평균 거래대금은 **t−1 까지**(오늘 제외 — 라이브 문턱과 같은 정의)
- 라벨만 t+h 행을 본다(`forward_log_return`). 국내는 라벨 창에 끊김이 있으면 라벨 없음
- 라이브 문턱은 마지막 행 T 까지만 — σ' · 평균은 T 를 포함한 직전 20(= 행 T+1 의 정의)
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, date, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.base_rate import (
    CRYPTO_ROUND_TRIP,
    KR_COMMISSION_PER_SIDE,
    RECENT_DAYS,
    Events,
    Stat,
    StatRow,
    Trigger,
    cooldown,
    describe,
    finalize,
    kr_sell_tax,
    krx_tick,
    rsi_threshold_price,
)
from salt_forecast.domain.panel import Mat, Panel, build_panel, forward_log_return, lag, rolling_sum
from salt_forecast.domain.rule_items import rsi_simple
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.scoring.rule_ic_kr import kr_universe, label_without_breaks, session_panel, up_breaks

WINDOW = 20
K3_SINCE = date(2025, 3, 4)  # 대체거래소 출범 — 그 전 시가 갭은 다른 뜻(사전등록 K3 since)
LISTING_WARMUP_DAYS = 30  # 원천 첫 30일의 "첫 봉"은 상장이 아니라 원천 시작이다(업비트 2017-09 개장일 수십 종목)
LARGE_TOP = 10
SMALL_FRACTION = 2.0 / 3.0


@dataclass(frozen=True, slots=True)
class Condition:
    id: str
    market: str  # kr | crypto
    horizons: tuple[int, ...]
    kind: str  # usual | test | describe


KR_CONDITIONS: tuple[Condition, ...] = (
    Condition("ALL", "kr", (1, 5), "usual"),
    Condition("K1", "kr", (1, 5), "test"),
    Condition("K2", "kr", (1, 5), "test"),
    Condition("K3", "kr", (1,), "test"),
    Condition("K4", "kr", (1, 5), "test"),
    Condition("K6", "kr", (1, 5), "test"),
    Condition("K8", "kr", (1,), "describe"),
)
CRYPTO_CONDITIONS: tuple[Condition, ...] = (
    Condition("ALL", "crypto", (1, 5), "usual"),
    Condition("C1", "crypto", (1,), "test"),
    Condition("C2", "crypto", (1,), "test"),
    Condition("C3S", "crypto", (1,), "test"),
    Condition("C3L", "crypto", (1,), "test"),
    Condition("C7", "crypto", (1, 5), "test"),
    Condition("C8", "crypto", (1,), "describe"),
)


@dataclass(slots=True)
class MarketRun:
    market: str
    window: tuple[date, date]
    stats: list[StatRow] = field(default_factory=list[StatRow])
    triggers: list[Trigger] = field(default_factory=list[Trigger])
    universe_mean: float = float("nan")
    rows: int = 0


# ── 공용 계산 ──


def log_return(p: Panel) -> Mat:
    with np.errstate(divide="ignore", invalid="ignore"):
        return np.log(p.close / lag(p.close, 1))


def rolling_std(m: Mat, w: int) -> Mat:
    """행 t 까지(포함) w 행 표본 표준편차(ddof 1). 창에 결측이 있으면 NaN."""
    s1 = rolling_sum(m, w)
    s2 = rolling_sum(m * m, w)
    with np.errstate(invalid="ignore"):
        var = (s2 - s1 * s1 / w) / (w - 1)
    return np.sqrt(np.maximum(var, 0.0))


def rolling_mean(m: Mat, w: int) -> Mat:
    return rolling_sum(m, w) / w


def _day_keys(p: Panel) -> NDArray[np.int64]:
    return (p.dates // DAY).astype(np.int64)


def _date_of(t: int) -> date:
    return datetime.fromtimestamp(t, tz=UTC).date()


def _events(mask: NDArray[np.bool_], label: Mat, cost: Mat, days: NDArray[np.int64]) -> Events:
    ok = mask & ~np.isnan(label) & ~np.isnan(cost)
    rows, _ = np.nonzero(ok)
    gross = label[ok]
    return Events(days[rows], gross - cost[ok], gross)


def _summarize(
    market: str,
    conditions: tuple[Condition, ...],
    masks: Mapping[str, NDArray[np.bool_]],
    labels: Mapping[int, Mat],
    costs: Mapping[int, Mat],
    days: NDArray[np.int64],
    recent_from_day: int,
) -> list[StatRow]:
    stats: list[Stat] = []
    meta: list[tuple[Condition, int]] = []
    for c in conditions:
        for h in c.horizons:
            mask = masks[c.id] if c.kind == "usual" else cooldown(masks[c.id], h)
            stats.append(describe(_events(mask, labels[h], costs[h], days), recent_from_day))
            meta.append((c, h))
    rows: list[StatRow] = []
    # 수축 · Holm 은 지평마다 따로 p₀ — 평소 행이 below_min 이면(그럴 일은 없다) 수축 · 검정 없이
    for h in sorted({h for _, h in meta}):
        idx = [i for i, (_, hh) in enumerate(meta) if hh == h]
        usual = next((stats[i] for i in idx if meta[i][0].kind == "usual"), None)
        p0 = usual.up_rate if usual is not None else None
        verdicts = finalize([stats[i] for i in idx], [meta[i][0].kind == "test" for i in idx], p0)
        for i, v in zip(idx, verdicts, strict=True):
            c, _ = meta[i]
            rows.append(StatRow(market, c.id, h, c.kind, stats[i], v))
    return rows


# ── 국내 ──


def kr_masks(p: Panel, universe: NDArray[np.bool_]) -> dict[str, NDArray[np.bool_]]:
    r = log_return(p)
    sigma = lag(rolling_std(r, WINDOW), 1)
    avg_value = lag(rolling_mean(p.close * p.volume, WINDOW), 1)
    prev = lag(p.close, 1)
    rsi = rsi_simple(p.close)
    after_k3 = (p.dates >= int(datetime(K3_SINCE.year, K3_SINCE.month, K3_SINCE.day, tzinfo=UTC).timestamp()))[:, None]
    opened = p.open if p.open is not None else np.full_like(p.close, np.nan)
    with np.errstate(invalid="ignore"):
        base = universe & ~np.isnan(sigma) & (sigma > 0)
        return {
            "ALL": universe.copy(),
            "K1": base & (r <= -2 * sigma),
            "K2": base & (r >= 2 * sigma) & (p.close * p.volume >= 3 * avg_value),
            "K3": universe & after_k3 & (opened >= 1.03 * prev),
            "K4": universe & (p.close >= 1.29 * prev),
            "K6": universe
            & (p.close < prev)
            & (prev < lag(p.close, 2))
            & (lag(p.close, 2) < lag(p.close, 3))
            & (p.close <= 0.92 * lag(p.close, 3)),
            "K8": universe & (rsi >= 70) & (p.close >= 1.05 * prev),
        }


def kr_costs(p: Panel, h: int) -> Mat:
    """사건 행 t 의 왕복 비용 — 매도일 = 행 t+h 의 날짜 · 반 틱 = 진입가(C_t) 호가 단위."""
    n = p.dates.size
    tax = np.full(n, np.nan)
    for t in range(n - h):
        tax[t] = kr_sell_tax(_date_of(int(p.dates[t + h])))
    ticks = np.vectorize(krx_tick, otypes=[np.float64])(np.nan_to_num(p.close, nan=1.0))
    with np.errstate(invalid="ignore", divide="ignore"):
        half_ticks = ticks / p.close
    return KR_COMMISSION_PER_SIDE * 2 + tax[:, None] + half_ticks


def kr_triggers(p: Panel, universe: NDArray[np.bool_]) -> list[Trigger]:
    """마지막 행 T 기준 — 다음 거래일(라이브)에 조건이 성립하는 가격 문턱."""
    if p.dates.size < WINDOW + 3:
        return []
    T = p.dates.size - 1
    ref = int(p.dates[T])
    r = log_return(p)
    sigma_next = rolling_std(r, WINDOW)[T]
    avg_next = rolling_mean(p.close * p.volume, WINDOW)[T]
    d = np.diff(p.close, axis=0)[-13:]
    gains = np.nansum(np.where(d > 0, d, 0.0), axis=0)
    losses = np.nansum(np.where(d < 0, -d, 0.0), axis=0)
    out: list[Trigger] = []
    for j, sym in enumerate(p.symbols):
        c = float(p.close[T, j])
        if not universe[T, j] or np.isnan(c):
            continue
        s, v = float(sigma_next[j]), float(avg_next[j])
        if not np.isnan(s) and s > 0:
            out.append(Trigger("kr", sym, "K1", c, ref, price_at_most=c * float(np.exp(-2 * s))))
            if not np.isnan(v):
                out.append(
                    Trigger("kr", sym, "K2", c, ref, price_at_least=c * float(np.exp(2 * s)), value_at_least=3 * v)
                )
        out.append(Trigger("kr", sym, "K3", c, ref, open_at_least=1.03 * c))
        out.append(Trigger("kr", sym, "K4", c, ref, price_at_least=1.29 * c))
        c1, c2 = float(p.close[T - 1, j]), float(p.close[T - 2, j])
        if c < c1 < c2:
            out.append(Trigger("kr", sym, "K6", c, ref, price_at_most=min(c, 0.92 * c2)))
        if not np.isnan(d[:, j]).any():
            rsi_at = rsi_threshold_price(c, float(gains[j]), float(losses[j]))
            out.append(Trigger("kr", sym, "K8", c, ref, price_at_least=max(1.05 * c, rsi_at)))
    return out


def closed_triggers(
    market: str, p: Panel, masks: Mapping[str, NDArray[np.bool_]], conditions: tuple[Condition, ...]
) -> list[Trigger]:
    """마지막 행 T 에서 이미 성립한 조건 — 문턱 없이 'closed'. 평소 행은 조건이 아니라 뺀다."""
    if p.dates.size == 0:
        return []
    T = p.dates.size - 1
    out: list[Trigger] = []
    for c in conditions:
        if c.kind == "usual":
            continue
        for j in np.flatnonzero(masks[c.id][T]):
            out.append(Trigger(market, p.symbols[j], c.id, float(p.close[T, j]), int(p.dates[T]), applies_to="closed"))
    return out


def run_kr(ohlcv: Mapping[str, OhlcvSeries], start: datetime, as_of: datetime) -> MarketRun:
    t_end = int(as_of.timestamp())
    p = session_panel({s: o.as_of(t_end) for s, o in ohlcv.items()}, int(start.timestamp()), t_end)
    breaks = up_breaks(p)
    # 사전등록: 신호 창 [t−21, t] 에 끊김이 있으면 제외(σ 20 창 + 직전 봉) — kr_universe 의 14 창보다 넓다
    recent_break = rolling_sum(breaks.astype(np.float64), WINDOW + 2) > 0
    universe = kr_universe(p, breaks) & ~recent_break
    masks = kr_masks(p, universe)
    horizons = sorted({h for c in KR_CONDITIONS for h in c.horizons})
    labels = {h: label_without_breaks(forward_log_return(p, h), breaks, h) for h in horizons}
    costs = {h: kr_costs(p, h) for h in horizons}
    days = _day_keys(p)
    run = MarketRun("kr", (_date_of(int(p.dates[0])), _date_of(int(p.dates[-1]))))
    run.stats = _summarize("kr", KR_CONDITIONS, masks, labels, costs, days, (t_end - RECENT_DAYS * DAY) // DAY)
    run.triggers = kr_triggers(p, universe) + closed_triggers("kr", p, masks, KR_CONDITIONS)
    run.universe_mean = float(universe.sum(axis=1)[universe.any(axis=1)].mean()) if universe.any() else 0.0
    run.rows = int(p.dates.size)
    return run


# ── 코인 ──


def crypto_universe(p: Panel) -> NDArray[np.bool_]:
    """그날 봉 + 직전 20일 수익 · 거래대금 전부."""
    r = log_return(p)
    sigma = lag(rolling_std(r, WINDOW), 1)
    avg_value = lag(rolling_mean(p.close * p.volume, WINDOW), 1)
    return ~np.isnan(p.close) & ~np.isnan(sigma) & ~np.isnan(avg_value)


def size_groups(avg_value: Mat, universe: NDArray[np.bool_]) -> tuple[NDArray[np.bool_], NDArray[np.bool_]]:
    """행마다 대상 종목을 평균 거래대금 내림차순으로 — 상위 10 = 대형, 하위 2/3 = 소형."""
    large = np.zeros_like(universe)
    small = np.zeros_like(universe)
    for t in range(universe.shape[0]):
        cols = np.flatnonzero(universe[t])
        if cols.size == 0:
            continue
        order = cols[np.argsort(-avg_value[t, cols], kind="stable")]
        large[t, order[:LARGE_TOP]] = True
        cut = int(np.ceil(order.size * (1 - SMALL_FRACTION)))
        small[t, order[cut:]] = True
    return large, small


def listing_rows(p: Panel) -> NDArray[np.bool_]:
    """첫 봉 행 — 원천 첫 30일 안의 첫 봉은 원천 시작이라 뺀다."""
    out = np.zeros(p.close.shape, dtype=np.bool_)
    first_day = int(p.dates[0]) if p.dates.size else 0
    for j, row in enumerate(p.listed_at):
        if 0 <= row < p.dates.size and int(p.dates[row]) - first_day >= LISTING_WARMUP_DAYS * DAY:
            out[row, j] = True
    return out


def crypto_masks(p: Panel, universe: NDArray[np.bool_]) -> dict[str, NDArray[np.bool_]]:
    r = log_return(p)
    sigma = lag(rolling_std(r, WINDOW), 1)
    avg_value = lag(rolling_mean(p.close * p.volume, WINDOW), 1)
    large, small = size_groups(avg_value, universe)
    rsi = rsi_simple(p.close)
    with np.errstate(invalid="ignore"):
        up = universe & (sigma > 0) & (r >= 2 * sigma)
        down = universe & (sigma > 0) & (r <= -2 * sigma)
        return {
            "ALL": universe.copy(),
            "C1": up & small,
            "C2": up & large,
            "C3S": down & small,
            "C3L": down & large,
            "C7": listing_rows(p),
            "C8": universe & (rsi >= 70) & (p.close >= 1.05 * lag(p.close, 1)),
        }


def crypto_triggers(p: Panel) -> list[Trigger]:
    if p.dates.size < WINDOW + 3:
        return []
    T = p.dates.size - 1
    ref = int(p.dates[T])
    r = log_return(p)
    sigma_next = rolling_std(r, WINDOW)[T]
    avg_next = rolling_mean(p.close * p.volume, WINDOW)[T]
    live = ~np.isnan(p.close[T]) & ~np.isnan(sigma_next) & ~np.isnan(avg_next)
    large, small = size_groups(avg_next[None, :], live[None, :])
    listed = listing_rows(p)[T]
    d = np.diff(p.close, axis=0)[-13:]
    gains = np.nansum(np.where(d > 0, d, 0.0), axis=0)
    losses = np.nansum(np.where(d < 0, -d, 0.0), axis=0)
    out: list[Trigger] = []
    for j, sym in enumerate(p.symbols):
        c = float(p.close[T, j])
        if np.isnan(c):
            continue
        if listed[j]:
            out.append(Trigger("crypto", sym, "C7", c, ref))
        if not live[j]:
            continue
        s = float(sigma_next[j])
        if s > 0:
            hi, lo = c * float(np.exp(2 * s)), c * float(np.exp(-2 * s))
            if small[0, j]:
                out.append(Trigger("crypto", sym, "C1", c, ref, price_at_least=hi))
                out.append(Trigger("crypto", sym, "C3S", c, ref, price_at_most=lo))
            if large[0, j]:
                out.append(Trigger("crypto", sym, "C2", c, ref, price_at_least=hi))
                out.append(Trigger("crypto", sym, "C3L", c, ref, price_at_most=lo))
        if not np.isnan(d[:, j]).any():
            rsi_at = rsi_threshold_price(c, float(gains[j]), float(losses[j]))
            out.append(Trigger("crypto", sym, "C8", c, ref, price_at_least=max(1.05 * c, rsi_at)))
    return out


def run_crypto(ohlcv: Mapping[str, OhlcvSeries], as_of: datetime) -> MarketRun:
    t_end = int(as_of.timestamp())
    cut = {s: o.as_of(t_end) for s, o in ohlcv.items()}
    first = min((int(o.available_at[0]) for o in cut.values() if o.available_at.size), default=t_end)
    last = max((int(o.available_at[-1]) for o in cut.values() if o.available_at.size), default=first)
    p = build_panel(cut, first, last)  # 끝 = 마지막 봉 — 지금까지 늘리면 꼬리 행이 비어 라이브 문턱이 0 이 된다
    universe = crypto_universe(p)
    masks = crypto_masks(p, universe)
    horizons = sorted({h for c in CRYPTO_CONDITIONS for h in c.horizons})
    labels = {h: forward_log_return(p, h) for h in horizons}
    costs = {h: np.full(p.close.shape, CRYPTO_ROUND_TRIP) for h in horizons}
    days = _day_keys(p)
    run = MarketRun("crypto", (_date_of(int(p.dates[0])), _date_of(int(p.dates[-1]))))
    run.stats = _summarize("crypto", CRYPTO_CONDITIONS, masks, labels, costs, days, (t_end - RECENT_DAYS * DAY) // DAY)
    run.triggers = crypto_triggers(p) + closed_triggers("crypto", p, masks, CRYPTO_CONDITIONS)
    run.universe_mean = float(universe.sum(axis=1)[universe.any(axis=1)].mean()) if universe.any() else 0.0
    run.rows = int(p.dates.size)
    return run


# ── 리포트 ──

_TEXT: dict[str, str] = {
    "ALL": "평소(대상 전체)",
    "K1": "오늘 ≤ −2σ",
    "K2": "오늘 ≥ +2σ · 거래대금 3배",
    "K3": "시가 갭 ≥ +3% (2025-03-04~)",
    "K4": "오늘 ≥ +29%",
    "K6": "3일 연속 하락 · 누적 ≤ −8%",
    "K8": "RSI ≥ 70 · 오늘 ≥ +5% (서술)",
    "C1": "24h ≥ +2σ · 소형",
    "C2": "24h ≥ +2σ · 대형(상위 10)",
    "C3S": "24h ≤ −2σ · 소형",
    "C3L": "24h ≤ −2σ · 대형(상위 10)",
    "C7": "신규 상장일",
    "C8": "RSI ≥ 70 · 24h ≥ +5% (서술)",
}


def _pct(x: float | None, digits: int = 1) -> str:
    return "—" if x is None else f"{x * 100:.{digits}f}%"


def render_report(key: str, git_sha: str, as_of: datetime, runs: list[MarketRun]) -> str:
    lines = [
        f"# 조건부 기저율 — `{key}` ({as_of.date().isoformat()})",
        "",
        f"- 사전등록 `preregistration/2026-11-11-base-rate.toml` · 코드 `{git_sha}` · as_of {as_of.isoformat()}",
        "- 사기 전 = 비용 뒤 로그수익(국내 수수료 × 2 + 그날 거래세 + 반 틱 × 2 · 코인 0.15%)"
        " · 팔기 전 보유 연장 = 비용 전",
        "- 유효 n = 같은 날 몰림(ICC) 보정 · 문턱 유효 n ≥ 100 · 서로 다른 날 ≥ 60, 못 넘으면 `below_min`(숫자 없음)",
        "- 표본 선택: 국내 = kr-universe@1(시점 고정) · 코인 = 그날 봉과 직전 20일이 있는 업비트 원화 종목"
        "(원천에 남은 폐지 종목 포함). 생존 편향이 남는다 — 원천이 지운 폐지 종목은 없다",
        "- 진입 = 조건이 성립한 날 종가(라이브 점검은 지금 가격) — 장중에 산 사람과 다를 수 있는 근사",
        "- '평소와 다름'은 Holm(시장 · 지평마다 가족) α 0.05 통과 + 수축 차이 부호일 때만."
        " 서술 조건(K8 · C8)은 검정하지 않는다",
        "",
    ]
    for run in runs:
        title = "국내 주식" if run.market == "kr" else "코인"
        lines += [
            f"## {title} — {run.window[0]} ~ {run.window[1]} · 격자 {run.rows}행"
            f" · 하루 평균 대상 {run.universe_mean:.0f}종목",
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
                f"| {r.condition_id} {_TEXT.get(r.condition_id, '')} | {r.horizon} | {s.status} | {s.sample} | "
                f"{s.sample_eff:.0f} | {s.sample_days} | {_pct(s.up_rate)} | {band} | {_pct(v.up_rate_shrunk)} | {q} | "
                f"{hq} | {v.differs or '—'}{ph} | {recent} |"
            )
        closed = sum(1 for t in run.triggers if t.applies_to == "closed")
        lines += ["", f"라이브 문턱 {len(run.triggers) - closed}행(다음 장) · 마지막 봉에 이미 성립 {closed}행", ""]
    lines += [
        "## 한계",
        "",
        "- 장중 조건(VI · 첫 30분 · 1시간 펌프 · 거시 일정 직후)은 없다 — 5분봉 이력이 2026-10-12 부터라"
        " 서로 다른 날 60 을 못 넘는다. 2026-12 중순 `base-rate@2`",
        "- 코인 유의 지정 · 해제(C7 의 나머지 절반)는 스냅샷 이력이 2026-09-30 부터라 `@2`",
        "- 국내 일봉은 2021-10 부터 — 2023-11 ~ 2025-03 공매도 금지 국면이 표본의 약 1/3 이다."
        " '최근' 열이 국면 이동을 표시한다",
    ]
    return "\n".join(lines) + "\n"
