"""DVOL 기반 σ 채점 — 사전등록 dvol-sigma@1 을 그대로 실행한다(FC-REQ-014).

판정이 있다: 통과한 후보가 있으면 목표 비중의 BTC · ETH σ 를 바꾼다(등록 [decision] adopted). 판정 조건 셋은
등록 문장 그대로 `Verdict` 의 세 칸이다. 탐색 표는 리포트에만 쓰고 판정에 쓰지 않는다.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, date, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain import dvol_sigma as dv
from salt_forecast.domain.asof_series import VintagedSeries
from salt_forecast.domain.ic import block_bootstrap_spearman
from salt_forecast.domain.labels import ewma_sigma
from salt_forecast.domain.panel import Panel, align_points, build_panel, forward_log_return
from salt_forecast.domain.regime import sma
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.domain.target_weight import CAP, cagr, calmar, max_drawdown, simulate
from salt_forecast.scoring.target_weight import BTC, CORE, monday_rows, simple_returns, target_matrix

PRIMARY = ("dvol_scaled", "blend")
MIN_DAYS = 500
TARGET = 0.15
DVOL_MAX_AGE = 2 * DAY
ASSET = {"KRW-BTC": "BTC", "KRW-ETH": "ETH"}

type Vec = NDArray[np.float64]


@dataclass(frozen=True, slots=True)
class AssetResult:
    symbol: str
    candidate: str
    horizon: int
    delta: dv.MeanCi  # 1차는 α = 0.025 분위, 탐색은 0.05
    first_half: float
    second_half: float
    by_regime: dict[str, float]


@dataclass(frozen=True, slots=True)
class Sim:
    sigma: str
    cagr: float
    mdd: float
    calmar: float


@dataclass(frozen=True, slots=True)
class Verdict:
    candidate: str
    ci_pass: bool  # (1) 두 종목 ΔQLIKE CI 상한 < 0
    halves_pass: bool  # (2) 앞 · 뒤 절반 두 종목 점추정 < 0
    calmar_pass: bool  # (3) 목표 비중 Calmar ≥ ewma
    insufficient: bool

    @property
    def passed(self) -> bool:
        return not self.insufficient and self.ci_pass and self.halves_pass and self.calmar_pass


@dataclass(frozen=True, slots=True)
class Direction:
    symbol: str
    signal: str
    horizon: int
    ic: float
    lo: float
    hi: float
    n: int


@dataclass(slots=True)
class RunOutput:
    window: tuple[date, date]
    days: dict[str, int] = field(default_factory=dict[str, int])
    primary: list[AssetResult] = field(default_factory=list[AssetResult])
    exploratory: list[AssetResult] = field(default_factory=list[AssetResult])
    sims: list[Sim] = field(default_factory=list[Sim])
    verdicts: list[Verdict] = field(default_factory=list[Verdict])
    direction: list[Direction] = field(default_factory=list[Direction])
    scale_now: dict[str, float] = field(default_factory=dict[str, float])
    sim_window: tuple[date, date] | None = None

    @property
    def adopted(self) -> str | None:
        ok = [v.candidate for v in self.verdicts if v.passed]
        if len(ok) == 2:
            return "blend"
        return ok[0] if ok else None


def _day(epoch: int) -> date:
    return datetime.fromtimestamp(epoch, UTC).date()


def _half_means(d: Vec, lo: int, hi: int) -> tuple[float, float]:
    mid = (lo + hi) // 2
    a, b = d[lo:mid], d[mid : hi + 1]
    return (float(np.nanmean(a)) if np.isfinite(a).any() else float("nan"),
            float(np.nanmean(b)) if np.isfinite(b).any() else float("nan"))  # fmt: skip


def _panel(ohlcv: Mapping[str, OhlcvSeries], as_of: datetime) -> Panel:
    for s in CORE:
        if s not in ohlcv or ohlcv[s].available_at.size == 0:
            raise ValueError(f"{s} 일봉이 없다")
    first = min(int(ohlcv[s].available_at[0]) for s in CORE)
    return build_panel({s: ohlcv[s] for s in CORE}, first, int(as_of.timestamp()))


def run(ohlcv: Mapping[str, OhlcvSeries], dvol: Mapping[str, VintagedSeries], as_of: datetime) -> RunOutput:
    panel = _panel(ohlcv, as_of)
    ewma_all = ewma_sigma(panel) * np.sqrt(float(dv.ANNUAL_DAYS))
    n = panel.dates.size
    per: dict[str, tuple[Vec, dv.Candidates]] = {}
    scale: dict[str, Vec] = {}
    for sym in CORE:
        sid = f"dvol:{ASSET[sym]}"
        if sid not in dvol:
            raise ValueError(f"{sid} 가 없다 — ingest_market --only deribit 먼저")
        s = dvol[sid]
        j = panel.column(sym)
        r = dv.log_returns(panel.close[:, j])
        level = align_points(s.available, s.value, panel.dates, DVOL_MAX_AGE)
        scale[sym] = dv.dvol_scale(r, level)
        per[sym] = (r, dv.candidates(ewma_all[:, j], level, scale[sym]))

    # 격자: 모든 후보가 두 종목 다 값이 있는 첫 날 ~ RV7 이 두 종목 다 닫힌 마지막 날
    ready = np.ones(n, dtype=bool)
    closed = np.zeros(n, dtype=bool)
    for r, c in per.values():
        ready &= np.isfinite(c.ewma) & np.isfinite(c.dvol_scaled) & np.isfinite(c.blend)
        closed |= np.isfinite(dv.forward_rv(r, dv.HORIZON))
    if not ready.any():
        raise ValueError("후보가 모두 값을 갖는 날이 없다")
    g0 = int(np.argmax(ready))
    g1 = int(np.flatnonzero(closed)[-1])
    out = RunOutput(window=(_day(int(panel.dates[g0])), _day(int(panel.dates[g1]))))
    in_grid = np.zeros(n, dtype=bool)
    in_grid[g0 : g1 + 1] = True

    btc_close = panel.close[:, panel.column(BTC)]
    above = btc_close > sma(btc_close, 200)
    regimes = {"above_200d": above & in_grid, "below_200d": ~above & np.isfinite(sma(btc_close, 200)) & in_grid}

    def result(sym: str, name: str, h: int, alpha: float) -> AssetResult:
        r, c = per[sym]
        rv = dv.forward_rv(r, h)
        base = dv.qlike(c.ewma, rv, h)
        d = dv.delta(dv.qlike(getattr(c, name), rv, h), base)
        d[~in_grid] = np.nan
        a, b = _half_means(d, g0, g1)
        by = {k: float(np.nanmean(d[m])) if np.isfinite(d[m]).any() else float("nan") for k, m in regimes.items()}
        return AssetResult(sym, name, h, dv.mean_ci(d, alpha), a, b, by)

    for sym in CORE:
        fin = np.flatnonzero(np.isfinite(scale[sym]))
        if fin.size:
            out.scale_now[sym] = float(scale[sym][fin[-1]])
        for name in PRIMARY:
            out.primary.append(result(sym, name, dv.HORIZON, dv.ALPHA_PRIMARY))
        out.days[sym] = out.primary[-1].delta.n
        out.exploratory.append(result(sym, "raw_dvol", dv.HORIZON, 0.05))
        for name in (*PRIMARY, "raw_dvol"):
            out.exploratory.append(result(sym, name, 30, 0.05))

    # (3) 목표 비중 — σ 만 바꾼 target-weight@1 core 규칙, 같은 날 · 같은 비용
    simple = simple_returns(panel)
    reb = monday_rows(panel.dates) & in_grid
    if reb.any():
        first_reb = int(np.argmax(reb))
        rows = np.arange(first_reb + 1, n)
        out.sim_window = (_day(int(panel.dates[rows[0]])), _day(int(panel.dates[rows[-1]])))
        for name in ("ewma", *PRIMARY):
            sig = np.column_stack([getattr(per[s][1], name) for s in panel.symbols])
            sim = simulate(simple, target_matrix(panel, sig, reb, TARGET, "core", CAP), reb)
            lr = sim.log_r[rows]
            out.sims.append(Sim(name, cagr(lr), max_drawdown(lr), calmar(lr)))
    base_calmar = next((s.calmar for s in out.sims if s.sigma == "ewma"), float("nan"))

    for name in PRIMARY:
        rs = [x for x in out.primary if x.candidate == name]
        sim_c = next((s.calmar for s in out.sims if s.sigma == name), float("nan"))
        out.verdicts.append(
            Verdict(
                candidate=name,
                ci_pass=all(x.delta.hi < 0 for x in rs),
                halves_pass=all(x.first_half < 0 and x.second_half < 0 for x in rs),
                calmar_pass=bool(sim_c >= base_calmar),
                insufficient=any(x.delta.n < MIN_DAYS for x in rs),
            )
        )

    # 탐색 — 방향(리서치 기대 0)
    for sym in CORE:
        r, c = per[sym]
        level = c.raw_dvol * 100.0
        chg = np.full(n, np.nan)
        chg[7:] = level[7:] - level[:-7]
        signals = {"dvol_level": level, "iv_minus_rv": c.raw_dvol - c.ewma, "dvol_change_7d": chg}
        sub = Panel(panel.dates, (sym,), panel.high[:, [panel.column(sym)]], panel.low[:, [panel.column(sym)]],
                    panel.close[:, [panel.column(sym)]], panel.volume[:, [panel.column(sym)]],
                    panel.listed_at[[panel.column(sym)]])  # fmt: skip
        for h in (7, 30):
            fwd = forward_log_return(sub, h)[:, 0]
            for sname, sig in signals.items():
                x = np.where(in_grid, sig, np.nan)
                ic, lo, hi, cnt = block_bootstrap_spearman(x, fwd, max(7, 2 * h), seed=dv.SEED)
                out.direction.append(Direction(sym, sname, h, ic, lo, hi, cnt))
    return out


# ── 리포트 ─────────────────────────────────────────────────────────────────


def _f(x: float, digits: int = 4) -> str:
    return "—" if x != x else f"{x:+.{digits}f}"


def _pct(x: float) -> str:
    return "—" if x != x else f"{x * 100:+.1f}%"


def _ok(b: bool) -> str:
    return "✓" if b else "✗"


def render_report(key: str, sha: str, as_of: datetime, out: RunOutput) -> str:
    adopted = out.adopted
    lines = [
        f"# DVOL 기반 σ 채점 — `{key}` ({as_of.date().isoformat()})",
        "",
        f"- 사전등록: `salt-forecast/preregistration/2026-09-30-dvol-sigma.toml` · 실행 코드 `{sha}`",
        f"- 기간: {out.window[0]} ~ {out.window[1]} · 업비트 원화 일봉 KRW-BTC · KRW-ETH · Deribit DVOL 1D close",
        "- 채점 날짜: " + " · ".join(f"{ASSET[s]} {n}" for s, n in out.days.items()) + f" (등록 최소 {MIN_DAYS})",
        "- 지표: ΔQLIKE = QLIKE(후보) − QLIKE(ewma), 앞으로 7일 실현 분산. **음수 = 후보가 낫다**",
        "- 1차 CI: 이동 블록 부트스트랩(블록 30일 · 2000회 · seed 20260930) 분위 [1.25%, 98.75%] — "
        "판정이 상한 < 0 한쪽이라 4검정 단측 Bonferroni 와 같다",
        "",
        f"## 판정 — **{'채택: ' + adopted if adopted else '채택 없음'}**",
        "",
        "| 후보 | (1) 두 종목 CI 상한 < 0 | (2) 앞 · 뒤 절반 점추정 < 0 | (3) 목표 비중 Calmar ≥ ewma | 표본 | 통과 |",
        "|---|---|---|---|---|---|",
    ]
    for v in out.verdicts:
        lines.append(
            f"| {v.candidate} | {_ok(v.ci_pass)} | {_ok(v.halves_pass)} | {_ok(v.calmar_pass)} | "
            f"{'부족' if v.insufficient else '충분'} | {_ok(v.passed)} |"
        )
    lines += [
        "",
        "## 1차 — 7일 ΔQLIKE",
        "",
        "| 종목 | 후보 | ΔQLIKE | 98.75% 상한 | 1.25% 하한 | 앞 절반 | 뒤 절반 | 날짜 |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for x in out.primary:
        lines.append(
            f"| {ASSET[x.symbol]} | {x.candidate} | {_f(x.delta.mean)} | {_f(x.delta.hi)} | {_f(x.delta.lo)} | "
            f"{_f(x.first_half)} | {_f(x.second_half)} | {x.delta.n} |"
        )
    lines += ["", "## (3) 목표 비중 — σ 만 바꾼 core 규칙(목표 σ 0.15 · 상한 0.6 · 주간 · 편도 0.05%)", ""]
    if out.sim_window:
        lines.append(f"기간 {out.sim_window[0]} ~ {out.sim_window[1]}(DVOL 기간 — 8년 기록과 창이 다르다)")
        lines.append("")
    lines += ["| σ | CAGR | MDD | Calmar |", "|---|---|---|---|"]
    for s in out.sims:
        lines.append(f"| {s.sigma} | {_pct(s.cagr)} | {_pct(-s.mdd)} | {_f(s.calmar, 2)} |")
    lines += [
        "",
        "## 탐색 (판정에 쓰지 않는다)",
        "",
        "### ΔQLIKE — 보정 없는 DVOL · 30일 지평 · 국면별",
        "",
        "| 종목 | 후보 | 지평 | ΔQLIKE [95% CI] | BTC 200일선 위 | 아래 |",
        "|---|---|---|---|---|---|",
    ]
    for x in [*out.exploratory, *out.primary]:
        lines.append(
            f"| {ASSET[x.symbol]} | {x.candidate} | {x.horizon}일 | "
            f"{_f(x.delta.mean)} [{_f(x.delta.lo)}, {_f(x.delta.hi)}] | "
            f"{_f(x.by_regime.get('above_200d', float('nan')))} | {_f(x.by_regime.get('below_200d', float('nan')))} |"
        )
    lines += [
        "",
        "1차 행의 CI 는 여기서도 [1.25%, 98.75%] 분위다.",
        "",
        "### 방향 — 시계열 스피어만(리서치 기대 0 · 규칙 반영 없음)",
        "",
        "| 종목 | 신호 | 지평 | IC [95% CI] | n |",
        "|---|---|---|---|---|",
    ]
    for d in out.direction:
        lines.append(
            f"| {ASSET[d.symbol]} | {d.signal} | {d.horizon}일 | {_f(d.ic, 3)} [{_f(d.lo, 3)}, {_f(d.hi, 3)}] | {d.n} |"
        )
    lines += [
        "",
        "## 알아둘 것",
        "",
        "- DVOL 은 달러 옵션 내재 변동성, 실현 분산은 원화 현물이다 — 환율 · 김치 프리미엄 변동이 실현 쪽에 섞인다. "
        "보정 계수 k 는 수준만 맞춘다",
        "- 보정 계수 k 최신값: " + " · ".join(f"{ASSET[s]} {v:.3f}" for s, v in out.scale_now.items()),
        "- 재현: `uv run python -m salt_forecast.jobs.dvol_sigma --as-of " + as_of.date().isoformat() + "`",
        "",
    ]
    return "\n".join(lines)
