"""목표 비중 안내 규칙 백테스트 — 사전등록 target-weight@1 을 그대로 실행한다(FC-REQ-012).

채택 판정이 없다(등록 [question] 주석). 결과는 화면 3종 고지의 근거 — 과거 성적 · 실패 사례 — 이고,
화면이 쓸 수 있는 문장은 등록 [claims] 조건으로만 정한다.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, date, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.labels import ewma_sigma
from salt_forecast.domain.panel import Panel, age_days, build_panel
from salt_forecast.domain.regime import capture, month_keys
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.domain.target_weight import (
    CAP,
    MonthRow,
    Simulation,
    block_indices,
    cagr,
    calmar,
    max_drawdown,
    missed_upside,
    monthly,
    paired_ci,
    simulate,
    target_weights,
    worst_months,
)

BTC = "KRW-BTC"
ETH = "KRW-ETH"
CORE = (BTC, ETH)
TARGETS = (0.10, 0.15, 0.20, 0.30, 0.50)
N_ALTS = 10
ALT_MIN_AGE = 60
ALT_VALUE_DAYS = 30
TARGET_HIT_TOL = 0.25
EXPLORATORY_BAND = 0.05
EXPLORATORY_CAP = 0.3

type Mat = NDArray[np.float64]
type Vec = NDArray[np.float64]


@dataclass(frozen=True, slots=True)
class Curve:
    cagr: float
    vol: float
    mdd: float
    calmar: float
    upside: float
    downside: float
    exposure_mean: float


@dataclass(frozen=True, slots=True)
class Record:
    universe: str
    target: float
    variant: str  # "weekly"(1차) · 탐색 이름
    strat: Curve
    hold_btc: Curve
    hold_universe: Curve
    constant: Curve
    delta_mdd_btc: tuple[float, float, float]
    delta_calmar_constant: tuple[float, float, float]
    missed: list[MonthRow]
    worst: list[MonthRow]
    mean_weights: dict[str, float]

    @property
    def claim_less_drawdown(self) -> bool:
        return self.delta_mdd_btc[1] > 0

    @property
    def claim_timing(self) -> bool:
        return self.delta_calmar_constant[1] > 0

    @property
    def claim_target_hit(self) -> bool:
        return abs(self.strat.vol / self.target - 1.0) <= TARGET_HIT_TOL


@dataclass(slots=True)
class RunOutput:
    window: tuple[date, date]
    records: list[Record] = field(default_factory=list[Record])
    alts_mean: float = float("nan")


def day_of(epoch: int) -> date:
    return datetime.fromtimestamp(epoch, UTC).date()


def simple_returns(panel: Panel) -> Mat:
    c = panel.close
    prev = np.vstack([np.full((1, c.shape[1]), np.nan), c[:-1]])
    with np.errstate(divide="ignore", invalid="ignore"):
        r = c / prev - 1.0
    return np.where(np.isfinite(r), r, 0.0)


def monday_rows(dates: NDArray[np.int64]) -> NDArray[np.bool_]:
    """월요일 00:00 UTC 에 마감한 봉. 1970-01-01 은 목요일 → (일 수 + 3) % 7 == 0 이 월요일."""
    return ((dates // DAY + 3) % 7) == 0


def alt_universe(panel: Panel, t: int, age: NDArray[np.int64] | None = None) -> list[int]:
    """t 기준 상장 60일 이상 · 최근 30일 원화 거래대금 상위 10(BTC · ETH 제외). t 까지 행만 읽는다."""
    lo = max(0, t - ALT_VALUE_DAYS + 1)
    value = np.nansum(panel.close[lo : t + 1] * panel.volume[lo : t + 1], axis=0)
    age_t: NDArray[np.int64] = (age_days(panel) if age is None else age)[t]
    core = {panel.column(s) for s in CORE}
    ok = (age_t >= ALT_MIN_AGE) & ~np.isnan(panel.close[t]) & (value > 0)
    cand = [int(j) for j in np.flatnonzero(ok) if int(j) not in core]
    cand.sort(key=lambda j: -value[j])
    return cand[:N_ALTS]


def target_matrix(panel: Panel, sigma: Mat, rows: NDArray[np.bool_], target: float, universe: str, cap: float) -> Mat:
    """리밸런스 행마다 목표 비중(패널 열 순서). 다른 행은 0(쓰지 않는다)."""
    out = np.zeros(panel.close.shape)
    core = [panel.column(s) for s in CORE]
    age = age_days(panel)
    for t in np.flatnonzero(rows):
        cols = core + (alt_universe(panel, int(t), age) if universe == "core_alts" else [])
        out[t, cols] = target_weights(sigma[t, cols], target, cap)
    return out


def curve(log_r: Vec, btc_log: Vec, exposure: Vec, months: NDArray[np.int64]) -> Curve:
    up, dn = capture(btc_log, log_r, months)
    return Curve(
        cagr=cagr(log_r),
        vol=float(log_r.std() * np.sqrt(365.0)),
        mdd=max_drawdown(log_r),
        calmar=calmar(log_r),
        upside=up,
        downside=dn,
        exposure_mean=float(exposure.mean()),
    )


def _delta_mdd(c: Sequence[Vec]) -> float:
    return max_drawdown(c[0]) - max_drawdown(c[1])


def _delta_calmar(c: Sequence[Vec]) -> float:
    return calmar(c[0]) - calmar(c[1])


def run(ohlcv: Mapping[str, OhlcvSeries], start: datetime, as_of: datetime) -> RunOutput:
    first = min(int(s.available_at[0]) for s in ohlcv.values() if s.available_at.size)
    end = int(as_of.timestamp())
    panel = build_panel(ohlcv, first, end)
    for s in CORE:
        if s not in panel.symbols:
            raise ValueError(f"{s} 일봉이 없다")
    sigma = ewma_sigma(panel) * np.sqrt(365.0)
    simple = simple_returns(panel)
    core_idx = [panel.column(s) for s in CORE]
    last = int(np.searchsorted(panel.dates, end - DAY, side="right")) - 1
    in_period = (panel.dates > int(start.timestamp())) & (np.arange(panel.dates.size) <= last)
    ready = in_period & np.isfinite(sigma[:, core_idx]).all(axis=1)
    mondays = monday_rows(panel.dates) & ready
    if not mondays.any():
        raise ValueError("평가 창 안에 리밸런스 날이 없다")
    first_reb = int(np.argmax(mondays))
    rows = np.flatnonzero(in_period & (np.arange(panel.dates.size) > first_reb))
    months = month_keys(panel.dates)[rows]
    btc_log = np.log1p(simple[:, panel.column(BTC)])[rows]
    btc_curve = curve(btc_log, btc_log, np.ones(rows.size), months)
    idx = block_indices(rows.size)
    every = ready.copy()
    every[:first_reb] = False
    out = RunOutput(window=(day_of(int(panel.dates[rows[0]])), day_of(int(panel.dates[rows[-1]]))))
    alt_counts: list[int] = []

    def one(universe: str, target: float, variant: str, reb: NDArray[np.bool_], cap: float) -> Record:
        tm = target_matrix(panel, sigma, reb, target, universe, cap)
        sim = _band_sim(simple, tm, reb) if variant == "band" else simulate(simple, tm, reb)
        s_log = sim.log_r[rows]
        s_expo = sim.exposure[rows]
        cols = np.flatnonzero(np.abs(tm).sum(axis=0) > 0)
        # 같은 묶음 동일가중 100% · 전략 평균 비중 고정 — 둘 다 같은 리밸런스 날 · 같은 비용
        ew = np.zeros_like(tm)
        const = np.zeros_like(tm)
        mean_w = sim.weights[rows].mean(axis=0)
        for t in np.flatnonzero(reb):
            live = [int(j) for j in np.flatnonzero(tm[t] > 0)]
            if live:
                ew[t, live] = 1.0 / len(live)
            const[t, cols] = mean_w[cols]
        h = simulate(simple, ew, reb)
        c = simulate(simple, const, reb)
        u_log, c_log = h.log_r[rows], c.log_r[rows]
        return Record(
            universe=universe,
            target=target,
            variant=variant,
            strat=curve(s_log, btc_log, s_expo, months),
            hold_btc=btc_curve,
            hold_universe=curve(u_log, btc_log, h.exposure[rows], months),
            constant=curve(c_log, btc_log, c.exposure[rows], months),
            delta_mdd_btc=paired_ci(_delta_mdd, [btc_log, s_log], idx),
            delta_calmar_constant=paired_ci(_delta_calmar, [s_log, c_log], idx),
            missed=missed_upside(monthly(months, s_log, btc_log, s_expo)),
            worst=worst_months(monthly(months, s_log, btc_log, s_expo)),
            mean_weights={panel.symbols[j]: float(mean_w[j]) for j in cols if mean_w[j] > 0.005},
        )

    for universe in ("core", "core_alts"):
        for target in TARGETS:
            out.records.append(one(universe, target, "weekly", mondays, CAP))
    age = age_days(panel)
    for t in np.flatnonzero(mondays):
        alt_counts.append(len(alt_universe(panel, int(t), age)))
    out.alts_mean = float(np.mean(alt_counts))
    out.records.append(one("core", 0.15, "daily", every, CAP))
    out.records.append(one("core", 0.15, "band", every, CAP))
    out.records.append(one("core_alts", 0.15, "cap_0.3", mondays, EXPLORATORY_CAP))
    return out


def _band_sim(simple: Mat, target: Mat, candidate: NDArray[np.bool_]) -> Simulation:
    """탐색 — 매일 목표를 계산하되 한 종목이라도 5%p 넘게 벗어난 날만 맞춘다."""
    n, k = simple.shape
    r = np.nan_to_num(simple)
    w = np.zeros(k)
    pending = 0.0
    log_r, expo, held = np.zeros(n), np.zeros(n), np.zeros((n, k))
    for t in range(n):
        held[t] = w
        expo[t] = w.sum()
        gross = float((w * r[t]).sum())
        log_r[t] = np.log1p(gross - pending)
        pending = 0.0
        growth = 1.0 + gross
        w = w * (1.0 + r[t]) / growth if growth > 0 else np.zeros(k)
        if candidate[t]:
            new = target[t]
            if w.sum() == 0 or np.abs(new - w).max() > EXPLORATORY_BAND:
                pending = 0.0005 * float(np.abs(new - w).sum())
                w = new
    return Simulation(log_r, expo, held)


# ── 리포트 ─────────────────────────────────────────────────────────────────


def pct(x: float, digits: int = 1) -> str:
    return "—" if x != x else f"{x * 100:+.{digits}f}%"


def num(x: float, digits: int = 2) -> str:
    return "—" if x != x else f"{x:.{digits}f}"


def _month(epoch: int) -> str:
    return datetime.fromtimestamp(epoch, UTC).strftime("%Y-%m")


def _ci(t: tuple[float, float, float], f: str = "pct") -> str:
    fmt = pct if f == "pct" else num
    return f"{fmt(t[0])} [{fmt(t[1])}, {fmt(t[2])}]"


def render_report(key: str, sha: str, as_of: datetime, out: RunOutput) -> str:
    lines = [
        f"# 목표 비중 안내 규칙 백테스트 — `{key}` ({as_of.date().isoformat()})",
        "",
        f"- 사전등록: `salt-forecast/preregistration/2026-09-29-target-weight.toml` · 실행 코드 `{sha}`",
        f"- 기간: {out.window[0]} ~ {out.window[1]} · 업비트 원화 일봉 · 매주 월요일 리밸런스 · 편도 0.05%",
        f"- 규칙: 역변동성 × min(1, 목표 σ ÷ 묶음 σ(상관 1)) · 한 종목 상한 {CAP} · 남는 몫 현금(이자 0)",
        f"- core_alts 알트 평균 {out.alts_mean:.1f}개 · **지금 상장 종목만 있다(생존 편향)** — "
        "알트 묶음은 실제보다 좋게 나온다",
        "- **채택 판정이 아니다.** 아래 [claims] 열이 화면이 쓸 수 있는 문장을 정한다",
        "",
        "## 1차 기록 — 매주 리밸런스",
        "",
        "| 묶음 | 목표 σ | CAGR | 실현 σ | MDD | Calmar | 상승 포착 | 하락 포착 | 평균 노출 "
        "| ΔMDD vs BTC [CI] | ΔCalmar vs 고정 [CI] | 덜 빠짐 | 타이밍 | 목표 근처 |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in (x for x in out.records if x.variant == "weekly"):
        s = r.strat
        lines.append(
            f"| {r.universe} | {r.target:.2f} | {pct(s.cagr)} | {pct(s.vol)} | {pct(-s.mdd)} | {num(s.calmar)} | "
            f"{num(s.upside)} | {num(s.downside)} | {num(s.exposure_mean)} | {_ci(r.delta_mdd_btc)} | "
            f"{_ci(r.delta_calmar_constant, 'num')} | {'✓' if r.claim_less_drawdown else '✗'} | "
            f"{'✓' if r.claim_timing else '✗'} | {'✓' if r.claim_target_hit else '✗'} |"
        )
    lines += [
        "",
        "## 기준 곡선",
        "",
        "| 묶음 | 목표 σ | 곡선 | CAGR | 연 σ | MDD | Calmar | 상승 포착 | 평균 노출 |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for r in (x for x in out.records if x.variant == "weekly"):
        curves = (("BTC 보유", r.hold_btc), ("묶음 동일가중 100%", r.hold_universe), ("평균 비중 고정", r.constant))
        for name, c in curves:
            lines.append(
                f"| {r.universe} | {r.target:.2f} | {name} | {pct(c.cagr)} | {pct(c.vol)} | {pct(-c.mdd)} | "
                f"{num(c.calmar)} | {num(c.upside)} | {num(c.exposure_mean)} |"
            )
    lines += ["", "## 실패 사례 (1차 · 선별 없음)", ""]
    for r in (x for x in out.records if x.variant == "weekly" and x.universe == "core"):
        lines.append(f"### core · 목표 σ {r.target:.2f}")
        lines.append("")
        lines.append("| 종류 | 달 | 전략 | BTC 보유 | 평균 노출 |")
        lines.append("|---|---|---|---|---|")
        for kind, rows in (("놓친 상승", r.missed), ("가장 크게 잃은 달", r.worst)):
            for m in rows:
                lines.append(f"| {kind} | {_month(m.month)} | {pct(m.strat)} | {pct(m.btc)} | {num(m.exposure)} |")
        weights = " · ".join(f"{k} {v:.2f}" for k, v in r.mean_weights.items())
        lines += ["", f"평균 비중: {weights}", ""]
    lines += [
        "## 탐색 (화면에 쓰지 않는다)",
        "",
        "| 변형 | 묶음 | 목표 σ | CAGR | 실현 σ | MDD | Calmar | 상승 포착 | 평균 노출 | ΔCalmar vs 고정 [CI] |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in (x for x in out.records if x.variant != "weekly"):
        s = r.strat
        lines.append(
            f"| {r.variant} | {r.universe} | {r.target:.2f} | {pct(s.cagr)} | {pct(s.vol)} | {pct(-s.mdd)} | "
            f"{num(s.calmar)} | {num(s.upside)} | {num(s.exposure_mean)} | {_ci(r.delta_calmar_constant, 'num')} |"
        )
    lines.append("")
    return "\n".join(lines)
