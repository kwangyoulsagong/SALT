"""목표 비중 안내의 알트 위험 몫 판정 — 사전등록 target-weight@2 [alt_share] 를 그대로 실행한다(FC-REQ-013).

@1 과 달리 **판정이 있다**: 후보 a 가 [alt_share.adopt] 를 통과하면 서버가 알트에 그 몫을 주고, 아니면 알트에는
목표 비중을 주지 않는다. 기간 · σ · 리밸런스 · 비용은 @1 [protocol] 과 같다(`scoring.target_weight` 재사용).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import date, datetime

import numpy as np
from numpy.typing import NDArray

from salt_forecast.domain.labels import ewma_sigma
from salt_forecast.domain.panel import Panel, age_days, build_panel
from salt_forecast.domain.regime import month_keys
from salt_forecast.domain.series import DAY, OhlcvSeries
from salt_forecast.domain.target_weight import CAP, block_indices, calmar, paired_ci, simulate, sleeve_weights
from salt_forecast.scoring.target_weight import (
    BTC,
    CORE,
    TARGETS,
    Curve,
    alt_universe,
    curve,
    day_of,
    monday_rows,
    num,
    pct,
    simple_returns,
)

CANDIDATES = (0.10, 0.20)
PRIMARY_TARGET = 0.15
ALPHA = 0.05 / len(CANDIDATES)  # Bonferroni — [1.25%, 98.75%]
EXPLORATORY_SHARE = 0.05
EXPLORATORY_TOP = 3

type Mat = NDArray[np.float64]


@dataclass(frozen=True, slots=True)
class ShareRecord:
    alt_share: float
    target: float
    variant: str  # "top10"(1차) · 탐색 이름
    strat: Curve
    reference: Curve  # a = 0 (@1 core)
    delta_calmar: tuple[float, float, float]  # a − 0, 98.75% CI
    delta_mdd: float  # MDD(a) − MDD(0), 양수 = 더 깊게 빠졌다
    alt_weight_mean: float


@dataclass(slots=True)
class V2Output:
    window: tuple[date, date]
    records: list[ShareRecord] = field(default_factory=list[ShareRecord])
    alts_mean: float = float("nan")

    def primary(self) -> list[ShareRecord]:
        return [r for r in self.records if r.variant == "top10"]

    def passes(self, share: float) -> bool:
        """[alt_share.adopt] pass (1) 0.15 에서 CI 하한 > 0 (2) 5개 목표 전부 점추정 > 0."""
        rows = [r for r in self.primary() if r.alt_share == share]
        at_primary = [r for r in rows if r.target == PRIMARY_TARGET]
        return (
            len(rows) == len(TARGETS)
            and len(at_primary) == 1
            and at_primary[0].delta_calmar[1] > 0
            and all(r.delta_calmar[0] > 0 for r in rows)
        )

    def adopted(self) -> float | None:
        """[alt_share.adopt] choose — 통과한 것 중 작은 a. 없으면 None(알트에 목표 비중 없음)."""
        ok = [a for a in CANDIDATES if self.passes(a)]
        return min(ok) if ok else None


def share_matrix(
    panel: Panel, sigma: Mat, rows: NDArray[np.bool_], target: float, share: float, top: int, cap: float = CAP
) -> Mat:
    """리밸런스 행마다 [alt_share] rule 비중(패널 열 순서). 다른 행은 0. t 까지 행만 읽는다."""
    out = np.zeros(panel.close.shape)
    core = [panel.column(s) for s in CORE]
    age = age_days(panel)
    for t in np.flatnonzero(rows):
        alts = alt_universe(panel, int(t), age)[:top] if share > 0 else []
        w = sleeve_weights(sigma[t, core], sigma[t, alts], target, share, cap)
        out[t, core + alts] = w
    return out


def _delta_calmar(c: Sequence[NDArray[np.float64]]) -> float:
    return calmar(c[0]) - calmar(c[1])


def run_v2(ohlcv: Mapping[str, OhlcvSeries], start: datetime, as_of: datetime) -> V2Output:
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
    idx = block_indices(rows.size)
    alt_mask = np.ones(panel.close.shape[1], dtype=bool)
    alt_mask[core_idx] = False
    out = V2Output(window=(day_of(int(panel.dates[rows[0]])), day_of(int(panel.dates[rows[-1]]))))

    refs: dict[float, tuple[NDArray[np.float64], Curve]] = {}
    for target in TARGETS:
        ref = simulate(simple, share_matrix(panel, sigma, mondays, target, 0.0, 0), mondays)
        refs[target] = (ref.log_r[rows], curve(ref.log_r[rows], btc_log, ref.exposure[rows], months))

    def one(share: float, target: float, variant: str, top: int) -> ShareRecord:
        sim = simulate(simple, share_matrix(panel, sigma, mondays, target, share, top), mondays)
        s_log = sim.log_r[rows]
        r_log, r_curve = refs[target]
        strat = curve(s_log, btc_log, sim.exposure[rows], months)
        return ShareRecord(
            alt_share=share,
            target=target,
            variant=variant,
            strat=strat,
            reference=r_curve,
            delta_calmar=paired_ci(_delta_calmar, [s_log, r_log], idx, alpha=ALPHA),
            delta_mdd=strat.mdd - r_curve.mdd,
            alt_weight_mean=float(sim.weights[rows][:, alt_mask].sum(axis=1).mean()),
        )

    for share in CANDIDATES:
        for target in TARGETS:
            out.records.append(one(share, target, "top10", 10))
    age = age_days(panel)
    out.alts_mean = float(np.mean([len(alt_universe(panel, int(t), age)) for t in np.flatnonzero(mondays)]))
    out.records.append(one(EXPLORATORY_SHARE, PRIMARY_TARGET, "share_0.05", 10))
    for share in CANDIDATES:
        out.records.append(one(share, PRIMARY_TARGET, f"top{EXPLORATORY_TOP}", EXPLORATORY_TOP))
    return out


def render_report_v2(key: str, sha: str, as_of: datetime, out: V2Output) -> str:
    adopted = out.adopted()
    verdict = (
        f"**알트 위험 몫 {adopted:.2f} 채택**"
        if adopted is not None
        else "**채택 없음 — 알트에는 목표 비중을 주지 않는다**"
    )
    lines = [
        f"# 목표 비중 안내 알트 위험 몫 — `{key}` ({as_of.date().isoformat()})",
        "",
        f"- 사전등록: `salt-forecast/preregistration/2026-09-29-target-weight-v2.toml` · 실행 코드 `{sha}`",
        f"- 기간: {out.window[0]} ~ {out.window[1]} · 업비트 원화 일봉 · 매주 월요일 리밸런스 · "
        "편도 0.05% (@1 과 같다)",
        "- 규칙: core = 역변동성(목표 σ × (1 − a)) · 알트 = 역변동성(목표 σ × a) · 한 종목 상한 "
        f"{CAP} · 비교 기준 a = 0(@1 core)",
        f"- 알트 평균 {out.alts_mean:.1f}개(거래대금 상위 10) · "
        "**상장폐지 종목은 수집하지 않는다 — 생존 편향이 알트에 유리하다**",
        f"- 판정 기준: 0.15 에서 ΔCalmar 98.75% CI 하한 > 0 (Bonferroni, 후보 {len(CANDIDATES)}개) + "
        "5개 목표 점추정 전부 > 0",
        f"- 판정: {verdict}",
        "",
        "## 1차 — 알트 상위 10",
        "",
        "| a | 목표 σ | CAGR | 실현 σ | MDD | Calmar | 상승 포착 | 하락 포착 | 알트 평균 비중 "
        "| a = 0 CAGR | a = 0 MDD | a = 0 Calmar | ΔCalmar [98.75% CI] | ΔMDD |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in out.primary():
        s, b = r.strat, r.reference
        lo, hi = r.delta_calmar[1], r.delta_calmar[2]
        lines.append(
            f"| {r.alt_share:.2f} | {r.target:.2f} | {pct(s.cagr)} | {pct(s.vol)} | {pct(-s.mdd)} | {num(s.calmar)} | "
            f"{num(s.upside)} | {num(s.downside)} | {num(r.alt_weight_mean)} | {pct(b.cagr)} | {pct(-b.mdd)} | "
            f"{num(b.calmar)} | {num(r.delta_calmar[0])} [{num(lo)}, {num(hi)}] | {pct(r.delta_mdd)} |"
        )
    lines += ["", "## 후보별 판정", "", "| a | (1) 0.15 CI 하한 > 0 | (2) 5개 점추정 > 0 | 통과 |", "|---|---|---|---|"]
    for share in CANDIDATES:
        rows = [r for r in out.primary() if r.alt_share == share]
        c1 = any(r.target == PRIMARY_TARGET and r.delta_calmar[1] > 0 for r in rows)
        c2 = all(r.delta_calmar[0] > 0 for r in rows)
        lines.append(
            f"| {share:.2f} | {'✓' if c1 else '✗'} | {'✓' if c2 else '✗'} | {'✓' if out.passes(share) else '✗'} |"
        )
    lines += [
        "",
        "## 탐색 (판정 · 화면에 쓰지 않는다)",
        "",
        "| 변형 | a | 목표 σ | CAGR | MDD | Calmar | 알트 평균 비중 | ΔCalmar [98.75% CI] |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for r in (x for x in out.records if x.variant != "top10"):
        s = r.strat
        lines.append(
            f"| {r.variant} | {r.alt_share:.2f} | {r.target:.2f} | {pct(s.cagr)} | {pct(-s.mdd)} | {num(s.calmar)} | "
            f"{num(r.alt_weight_mean)} | {num(r.delta_calmar[0])} "
            f"[{num(r.delta_calmar[1])}, {num(r.delta_calmar[2])}] |"
        )
    lines.append("")
    return "\n".join(lines)
