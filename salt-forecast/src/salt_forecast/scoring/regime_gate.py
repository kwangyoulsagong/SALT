"""시장 국면 게이트 백테스트 — 사전등록 regime-gate@1 을 그대로 실행한다(FC-REQ-010).

한 번 읽은 일봉 패널에서 BTC · 동일가중(ew) 두 자산의 보유 곡선과 게이트 곡선을 만들고,
1차 게이트 셋(trend · hmm · both)을 사전등록 [decision] 으로 판정한다.
이벤트일 σ 비율 · 손절 도달 · 탐색 게이트는 같은 패널로 기록만 한다.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass, field
from datetime import UTC, date, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.events import ScheduledEvent
from salt_forecast.domain.labels import ewma_sigma
from salt_forecast.domain.panel import Panel, age_days, build_panel
from salt_forecast.domain.regime import (
    CurveStats,
    TouchStats,
    curve_stats,
    delta_mdd_ci,
    drawdown_from_peak,
    event_rows,
    first_touch,
    hmm_monthly,
    log_returns,
    month_keys,
    reduction_factor,
    sigma_ratio_ci,
    strategy_returns,
    trend_open,
)
from salt_forecast.domain.series import DAY, OhlcvSeries

BTC = "KRW-BTC"
MIN_AGE_DAYS = 60
PRIMARY_GATES = ("trend", "hmm", "both")
EXPLORATORY_GATES = ("drawdown", "vol_pct", "vol_target", "hmm3")
ASSETS = ("btc", "ew")
MIN_UPSIDE = 0.5
EVENT_KINDS = ("fomc", "cpi")
EVENT_START = int(datetime(2021, 1, 1, tzinfo=UTC).timestamp())
STOP_H = 20
VOL_TARGET = 0.15
VOL_PCT_WINDOW = 30
VOL_PCT_LOOKBACK = 3 * 365
VOL_PCT_Q = 0.8
DRAWDOWN_CUT = -0.20

type Vec = NDArray[np.float64]


@dataclass(frozen=True, slots=True)
class GateResult:
    gate: str
    asset: str
    primary: bool
    hold: CurveStats
    strat: CurveStats
    delta_mdd: float
    ci_low: float
    ci_high: float

    @property
    def passes(self) -> bool:
        return self.ci_low > 0 and self.strat.upside >= MIN_UPSIDE


@dataclass(frozen=True, slots=True)
class EventResult:
    label: str
    primary: bool
    n_event: int
    n_other: int
    ratio: float
    ci_low: float
    ci_high: float
    factor: float


@dataclass(slots=True)
class RunOutput:
    window: tuple[date, date]
    gates: list[GateResult] = field(default_factory=list[GateResult])
    adopted: str | None = None
    events: list[EventResult] = field(default_factory=list[EventResult])
    touches: dict[str, TouchStats] = field(default_factory=dict[str, TouchStats])
    hmm_fits: int = 0
    hmm_last_sigma: tuple[float, ...] = ()
    ew_symbols_mean: float = float("nan")
    shifted_days: int = 0


def _day(epoch: int) -> date:
    return datetime.fromtimestamp(epoch, UTC).date()


def ew_simple_returns(panel: Panel) -> tuple[Vec, Vec]:
    """(동일가중 일 단순수익, 그날 종목 수). 어제 · 오늘 봉이 있고 어제 기준 상장 60일이 지난 종목만."""
    c = panel.close
    prev = np.vstack([np.full((1, c.shape[1]), np.nan), c[:-1]])
    age = age_days(panel)
    age_prev = np.vstack([np.full((1, c.shape[1]), -1), age[:-1]])
    ok = ~np.isnan(c) & ~np.isnan(prev) & (age_prev >= MIN_AGE_DAYS)
    with np.errstate(divide="ignore", invalid="ignore"):
        r = np.where(ok, c / prev - 1.0, 0.0)
    n = ok.sum(axis=1).astype(np.float64)
    out = np.where(n > 0, r.sum(axis=1) / np.maximum(n, 1), np.nan)
    return out, n


def _vol_pct_exposure(r: Vec) -> Vec:
    """30일 실현 σ 가 직전 3년 분포의 80% 분위를 넘으면 0. 3년이 안 차면 1."""
    n = r.size
    sig = np.full(n, np.nan)
    for t in range(VOL_PCT_WINDOW, n):
        w = r[t - VOL_PCT_WINDOW + 1 : t + 1]
        if not np.isnan(w).any():
            sig[t] = w.std()
    out = np.ones(n)
    for t in range(n):
        hist = sig[max(0, t - VOL_PCT_LOOKBACK) : t]
        hist = hist[~np.isnan(hist)]
        if hist.size < VOL_PCT_LOOKBACK * 0.9 or np.isnan(sig[t]):
            continue
        out[t] = 0.0 if sig[t] > np.quantile(hist, VOL_PCT_Q) else 1.0
    return out


def exposures(panel: Panel, workers: int = 1) -> tuple[dict[str, Vec], int, tuple[float, ...]]:
    """게이트 이름 → 행별 노출(BTC 로만 계산). (노출, HMM 적합 수, 마지막 적합의 상태별 일 σ).

    월별 HMM 적합은 서로 독립이라 `workers` > 1 이면 프로세스로 나눈다 — 같은 시드 · 같은 입력이라 결과는 같다.
    """
    j = panel.column(BTC)
    close = panel.close[:, j]
    r = log_returns(close)
    trend = trend_open(close).astype(np.float64)
    with ProcessPoolExecutor(max_workers=workers) as pool:
        h2 = hmm_monthly(panel.dates, r, k=2, mapper=pool.map)
        h3 = hmm_monthly(panel.dates, r, k=3, mapper=pool.map)
    hmm = np.where(np.isnan(h2.p_high), np.nan, (h2.p_high <= 0.5).astype(np.float64))
    hmm3 = np.where(np.isnan(h3.p_high), np.nan, (h3.p_high <= 0.5).astype(np.float64))
    dd = drawdown_from_peak(close)
    sig = ewma_sigma(panel)[:, j] * np.sqrt(365.0)
    out = {
        "trend": trend,
        "hmm": hmm,
        "both": np.where(np.isnan(hmm), np.nan, trend * hmm),
        "drawdown": np.where(dd <= DRAWDOWN_CUT, 0.5, 1.0),
        "vol_pct": _vol_pct_exposure(r),
        "vol_target": np.where(np.isnan(sig), 1.0, np.minimum(1.0, VOL_TARGET / sig)),
        "hmm3": hmm3,
    }
    last = tuple(float(np.sqrt(v)) for v in h2.fits[-1][1].var) if h2.fits else ()
    return out, len(h2.fits), last


def evaluate_gates(panel: Panel, expo: Mapping[str, Vec], rows: NDArray[np.intp]) -> tuple[list[GateResult], float]:
    btc_simple = np.expm1(log_returns(panel.close[:, panel.column(BTC)]))
    ew_simple, ew_n = ew_simple_returns(panel)
    assets = {"btc": btc_simple, "ew": ew_simple}
    months = month_keys(panel.dates)[rows]
    results: list[GateResult] = []
    for asset in ASSETS:
        simple = assets[asset]
        hold_log = np.log1p(np.nan_to_num(simple))[rows]
        hold_stats = curve_stats(hold_log, hold_log, np.ones(rows.size), months)
        for gate in (*PRIMARY_GATES, *EXPLORATORY_GATES):
            e = expo[gate]
            strat_log = strategy_returns(simple, e)[rows]
            d, lo, hi = delta_mdd_ci(hold_log, strat_log)
            results.append(
                GateResult(
                    gate=gate,
                    asset=asset,
                    primary=gate in PRIMARY_GATES,
                    hold=hold_stats,
                    strat=curve_stats(hold_log, strat_log, e[rows - 1], months),
                    delta_mdd=d,
                    ci_low=lo,
                    ci_high=hi,
                )
            )
    return results, float(np.nanmean(ew_n[rows]))


def decide(results: Sequence[GateResult]) -> str | None:
    """사전등록 [decision] — btc · ew 둘 다 통과한 1차 게이트 중 min(Calmar) 최대. 없으면 None."""
    by_gate: dict[str, dict[str, GateResult]] = {}
    for g in results:
        if g.primary:
            by_gate.setdefault(g.gate, {})[g.asset] = g
    passing = [
        (min(v[a].strat.calmar for a in ASSETS), k) for k, v in by_gate.items() if all(v[a].passes for a in ASSETS)
    ]
    if not passing:
        return None
    return max(passing)[1]


def evaluate_events(panel: Panel, events: Sequence[ScheduledEvent], end_row: int) -> list[EventResult]:
    r = log_returns(panel.close[:, panel.column(BTC)])
    rows = (panel.dates > EVENT_START) & (np.arange(r.size) <= end_row) & ~np.isnan(r)
    at = {
        k: np.array([int(e.event_at.timestamp()) for e in events if e.kind == k], dtype=np.int64)
        for k in ("fomc", "cpi", "jobs")
    }

    def one(label: str, mask: NDArray[np.bool_], primary: bool) -> EventResult:
        ev = r[rows & mask]
        other = r[rows & ~mask]
        point, lo, hi = sigma_ratio_ci(ev, other)
        return EventResult(label, primary, int(ev.size), int(other.size), point, lo, hi, reduction_factor(point, lo))

    primary_mask = np.zeros(r.size, dtype=bool)
    for k in EVENT_KINDS:
        primary_mask |= event_rows(panel.dates, at[k])
    next_day = np.zeros(r.size, dtype=bool)
    next_day[1:] = primary_mask[:-1]
    return [
        one("fomc · cpi", primary_mask, True),
        one("fomc", event_rows(panel.dates, at["fomc"]), False),
        one("cpi", event_rows(panel.dates, at["cpi"]), False),
        one("jobs", event_rows(panel.dates, at["jobs"]), False),
        one("fomc · cpi 다음 날", next_day & ~primary_mask, False),
    ]


def evaluate_touches(panel: Panel, start_row: int) -> dict[str, TouchStats]:
    sig = ewma_sigma(panel)
    sig_h = sig * np.sqrt(STOP_H)
    eligible = (age_days(panel) >= MIN_AGE_DAYS) & ~np.isnan(sig_h)
    eligible[:start_row] = False
    ones = np.ones_like(sig_h)
    fixed = np.where(np.isnan(sig_h), np.nan, ones)
    return {
        "volatility": first_touch(panel.high, panel.low, panel.close, STOP_H, -sig_h, 2 * sig_h, 3 * sig_h, eligible),
        "fixed": first_touch(
            panel.high, panel.low, panel.close, STOP_H,
            np.log(0.92) * fixed, np.log(1.12) * fixed, np.log(1.25) * fixed, eligible,
        ),
    }  # fmt: skip


def run(
    ohlcv: Mapping[str, OhlcvSeries],
    events: Sequence[ScheduledEvent],
    start: datetime,
    as_of: datetime,
    workers: int = 1,
) -> RunOutput:
    first = min(int(s.available_at[0]) for s in ohlcv.values() if s.available_at.size)
    end = int(as_of.timestamp())
    panel = build_panel(ohlcv, first, end)
    if BTC not in panel.symbols:
        raise ValueError("KRW-BTC 일봉이 없다")
    # 기간: 시작일 ~ 실행일 전날(마지막 행은 오늘 마감 전일 수 있어 뺀다)
    start_epoch = int(start.timestamp())
    last = int(np.searchsorted(panel.dates, end - DAY, side="right")) - 1
    rows = np.flatnonzero((panel.dates > start_epoch) & (np.arange(panel.dates.size) <= last))
    expo, n_fits, last_sigma = exposures(panel, workers)
    # 첫 수익률의 노출은 전날 행이 정한다 — 그 행에 1차 게이트가 모두 있어야 한다(없으면 창을 그만큼 늦춘다)
    defined = np.ones(panel.dates.size, dtype=bool)
    for g in PRIMARY_GATES:
        defined &= ~np.isnan(expo[g])
    shifted = int(np.argmax(defined[rows - 1]))  # 앞에서 빈 날 수
    rows = rows[defined[rows - 1]]
    if rows.size == 0 or not defined[rows[0] - 1 :].all():
        raise ValueError("평가 창 안에서 1차 게이트가 비는 날이 있다 — 사전등록 기간 가정이 깨졌다")
    gates, ew_mean = evaluate_gates(panel, expo, rows)
    out = RunOutput(window=(_day(int(panel.dates[rows[0]])), _day(int(panel.dates[rows[-1]]))))
    out.gates = gates
    out.adopted = decide(gates)
    out.events = evaluate_events(panel, events, last)
    out.touches = evaluate_touches(panel, int(rows[0]))
    out.hmm_fits = n_fits
    out.hmm_last_sigma = last_sigma
    out.ew_symbols_mean = ew_mean
    out.shifted_days = shifted
    return out


# ── 리포트 ─────────────────────────────────────────────────────────────────


def _pct(x: float, digits: int = 1) -> str:
    return "—" if x != x else f"{x * 100:+.{digits}f}%"


def _num(x: float, digits: int = 2) -> str:
    return "—" if x != x else f"{x:.{digits}f}"


def render_report(key: str, sha: str, as_of: datetime, out: RunOutput) -> str:
    lines = [
        f"# 국면 게이트 백테스트 — `{key}` ({as_of.date().isoformat()})",
        "",
        f"- 사전등록: `salt-forecast/preregistration/2026-09-29-regime-gate.toml` · 실행 코드 `{sha}`",
        f"- 기간: {out.window[0]} ~ {out.window[1]} · 업비트 원화 일봉 · ew 평균 종목 수 {out.ew_symbols_mean:.0f}",
        f"- HMM 월 적합 {out.hmm_fits}회 · 마지막 적합 상태별 일 σ "
        + ", ".join(f"{s * 100:.2f}%" for s in out.hmm_last_sigma),
        f"- 창 시작이 사전등록 기간보다 {out.shifted_days}일 늦다 — 첫 수익률의 노출을 정하는 전날 행이 전달 몫 HMM"
        "(학습 730일 미만)이라서. 판정 규칙은 그대로다",
        "- **표본 선택**: 지금 상장된 종목만 있다(상장폐지 종목 원천 없음 — 생존 편향). "
        "ew 보유 곡선이 실제보다 좋게 나온다",
        "",
        "## 1차 판정",
        "",
        f"**채택: {out.adopted or '없음 — 게이트를 넣지 않는다'}**",
        "",
        "| 게이트 | 자산 | MDD 보유 | MDD 게이트 | ΔMDD | 95% CI | 상승 포착 | 통과 |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for g in out.gates:
        if not g.primary:
            continue
        lines.append(
            f"| {g.gate} | {g.asset} | {_pct(-g.hold.mdd)} | {_pct(-g.strat.mdd)} | {_pct(g.delta_mdd)} | "
            f"[{_pct(g.ci_low)}, {_pct(g.ci_high)}] | {_num(g.strat.upside)} | {'✓' if g.passes else '✗'} |"
        )
    lines += [
        "",
        "## 곡선 전체 (1차 + 탐색)",
        "",
        "| 게이트 | 자산 | 1차 | CAGR | 연 σ | MDD | Calmar | 상승 포착 | 하락 포착 | 평균 노출 | 전환 수 | ΔMDD CI |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for asset in ASSETS:
        h = next(g.hold for g in out.gates if g.asset == asset)
        lines.append(
            f"| 보유 | {asset} | — | {_pct(h.cagr)} | {_pct(h.vol)} | {_pct(-h.mdd)} | "
            f"{_num(h.calmar)} | 1.00 | 1.00 | 1.00 | 0 | — |"
        )
        for g in (x for x in out.gates if x.asset == asset):
            s = g.strat
            lines.append(
                f"| {g.gate} | {asset} | {'✓' if g.primary else ''} | "
                f"{_pct(s.cagr)} | {_pct(s.vol)} | {_pct(-s.mdd)} | "
                f"{_num(s.calmar)} | {_num(s.upside)} | {_num(s.downside)} | {_num(s.exposure_mean)} | {s.switches} | "
                f"[{_pct(g.ci_low)}, {_pct(g.ci_high)}] |"
            )
    lines += [
        "",
        "## 이벤트일 σ 비율 (BTC 일 로그수익, 2021-01 ~)",
        "",
        "| 묶음 | 1차 | 이벤트일 | 그 밖 | σ 비율 | 95% CI | 축소 계수 |",
        "|---|---|---|---|---|---|---|",
    ]
    for e in out.events:
        lines.append(
            f"| {e.label} | {'✓' if e.primary else ''} | {e.n_event} | {e.n_other} | {_num(e.ratio)} | "
            f"[{_num(e.ci_low)}, {_num(e.ci_high)}] | {_num(e.factor)} |"
        )
    lines += [
        "",
        f"## 손절 · 익절 도달 — {STOP_H}일 안 첫 도달 (ew 종목 × 매일 진입, 기록만)",
        "",
        "| 계획 | 표본 | 손절 먼저 | 1차 익절 먼저 | 둘 다 아님 | 추세 유지 도달 "
        "| 손절 시 그날 종가 손실 평균 | 5% 분위 |",
        "|---|---|---|---|---|---|---|---|",
    ]
    names = {"volatility": "σ (−1σ · +2σ · +3σ)", "fixed": "고정 (×0.92 · ×1.12 · ×1.25)"}
    for k, t in out.touches.items():
        lines.append(
            f"| {names[k]} | {t.n:,} | {_pct(t.stop_first)} | {_pct(t.take_first)} | {_pct(t.neither)} | "
            f"{_pct(t.trend_reached)} | {_pct(t.stop_loss_mean)} | {_pct(t.stop_loss_p05)} |"
        )
    lines += [
        "",
        "진입이 종목 · 날짜로 겹쳐 독립 표본이 아니다 — CI 를 적지 않는다(사전등록 [stops]).",
        '손절 비율은 "수익 개선"이 아니라',
        '"얼마를 지킬 수 있나"의 기록이다(리서치 §4-1: 손절은 랜덤워크에서 기대수익을 낮춘다).',
        "",
    ]
    return "\n".join(lines)
