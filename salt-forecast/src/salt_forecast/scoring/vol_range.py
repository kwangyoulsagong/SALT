"""H1 흔들림 · 범위 실행 — 사전등록 `vol-range@3`(@1 + 동결 재생 · FC-REQ-028 FR-9 · F017 v4 순서 4).

- 1차 판정: 자료 끝 2026-11-12 로 자른 패널에서 칸마다 walk-forward → QLIKE · DM(기준 셋) · 덮임 · 플라시보.
- 전진: 지금까지 자료로 같은 walk-forward → 마지막 봉 예측(HAR · 기준 셋 · 컨포멀 80 · 95 반폭).
- 채점: 열린 예측 중 라벨이 닫힌 것에 실현 RV · 수익 · 제때 기록 여부.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime

import numpy as np

from salt_forecast.domain.panel import rolling_sum
from salt_forecast.domain.series import OhlcvSeries
from salt_forecast.domain.vol_range import (
    BASELINES,
    HISTORY_END,
    HORIZONS,
    LEVELS,
    PLACEBO_BLOCK,
    PLACEBO_SEED,
    CellResult,
    ForwardResult,
    HarFit,
    MarketPrep,
    VolPanel,
    block_shuffle,
    crypto_daily_rv,
    data_short,
    garman_klass,
    holm_family,
    judge_history,
    prepare,
    run_cell,
)
from salt_forecast.scoring.rule_ic_kr import kr_universe, session_panel, up_breaks
from salt_forecast.store.vol_range import PredictionRow, scored

KR_RECENT_BREAK = 22  # base-rate@1 — 신호 창 [t−21, t] 에 끊김이면 제외


def kr_panel(ohlcv: Mapping[str, OhlcvSeries], as_of: datetime) -> VolPanel:
    t_end = int(as_of.timestamp())
    cut = {s: o.as_of(t_end) for s, o in ohlcv.items()}
    cut = {s: o for s, o in cut.items() if o.available_at.size}
    first = min((int(o.available_at[0]) for o in cut.values()), default=t_end)
    p = session_panel(cut, first, t_end)
    if p.open is None:
        raise ValueError("국내 패널에 시가가 없다")
    breaks = up_breaks(p)
    rv, neg = garman_klass(p.open, p.high, p.low, p.close)
    rv = np.where(breaks, np.nan, rv)  # 끊긴 날의 밤사이 갭은 두 기준을 잇는다
    prev = np.vstack([np.full((1, p.close.shape[1]), np.nan), p.close[:-1]])
    with np.errstate(divide="ignore", invalid="ignore"):
        ret = np.where(breaks, np.nan, np.log(p.close / prev))
    recent = rolling_sum(breaks.astype(np.float64), KR_RECENT_BREAK) > 0
    eligible = kr_universe(p, breaks) & ~recent
    return VolPanel("kr", p.dates, p.symbols, rv, ret, p.close, eligible, breaks, neg)


def crypto_panel(ohlcv: Mapping[str, OhlcvSeries], as_of: datetime) -> VolPanel:
    t_end = int(as_of.timestamp())
    cut = {s: o.as_of(t_end) for s, o in ohlcv.items()}
    cut = {s: o for s, o in cut.items() if o.available_at.size}
    first = min((int(o.available_at[0]) for o in cut.values()), default=t_end)
    return crypto_daily_rv(cut, first, t_end)


@dataclass(slots=True)
class HistoryRun:
    cells: list[CellResult]
    first_date: dict[str, int] = field(default_factory=dict[str, int])
    placebo_cells: list[CellResult] = field(default_factory=list[CellResult])


def run_history(panels: Mapping[str, VolPanel]) -> HistoryRun:
    """1차 판정 — panels 는 HISTORY_END 로 자른 것. 진짜 · 플라시보 둘 다 칸 12 검정 Holm."""
    end_t = int(HISTORY_END.timestamp())
    cells: list[CellResult] = []
    placebo: list[CellResult] = []
    first: dict[str, int] = {}
    for market, panel in panels.items():
        if panel.dates.size == 0:
            continue
        first[market] = int(panel.dates[0])
        prep = prepare(panel)
        last = panel.dates.size - 1
        for h in HORIZONS:
            cells.append(run_cell(prep, h, last, end_t)[0])
            placebo.append(
                run_cell(prep, h, last, end_t, lambda n, h=h: block_shuffle(n, PLACEBO_BLOCK, PLACEBO_SEED + h))[0]
            )
    holm_family(cells, 0.05)
    holm_family(placebo, 0.05)
    placebo_hit = {m: any(c.pass_a for c in placebo if c.market == m) for m in panels}
    short = {m: data_short(m, first[m]) if m in first else True for m in panels}
    judge_history(cells, placebo_hit, short)
    return HistoryRun(cells, first, placebo)


@dataclass(frozen=True, slots=True)
class LiveCell:
    market: str
    horizon: int
    fit: HarFit | None
    q: tuple[float, float] | None
    rows: list[PredictionRow]


def live_cells(prep: MarketPrep, model_version: str, recorded_at: datetime) -> list[LiveCell]:
    """마지막 봉 T 의 예측 — 칸마다 그 달 적합 · 라벨이 닫힌 직전 250 날짜 컨포멀."""
    p = prep.panel
    out: list[LiveCell] = []
    if p.dates.size == 0:
        return out
    t = p.dates.size - 1
    ref_at = datetime.fromtimestamp(int(p.dates[t]), UTC)
    for h in HORIZONS:
        _, wf, q = run_cell(prep, h, t, int(p.dates[t]))
        k = int(wf.fit_row[t])
        fit = wf.fits[k] if k >= 0 else None
        qt = (float(q[t, 0]), float(q[t, 1])) if np.isfinite(q[t]).all() else None
        rows: list[PredictionRow] = []
        for j in np.flatnonzero(np.isfinite(wf.har[t]) & (wf.har[t] > 0)):
            har = float(wf.har[t, j])
            b = {name: float(wf.base[name][t, j]) for name in BASELINES}
            half = (qt[0] * har**0.5, qt[1] * har**0.5) if qt else (None, None)
            b1, b2, b3 = (v if np.isfinite(v) else None for v in (b["b1"], b["b2"], b["b3"]))
            rows.append(
                PredictionRow(p.market, h, p.symbols[j], ref_at, model_version, har, b1, b2, b3, half[0], half[1],
                              recorded_at)
            )  # fmt: skip
        out.append(LiveCell(p.market, h, fit, qt, rows))
    return out


def score_open(prep: MarketPrep, rows: Sequence[PredictionRow], at: datetime) -> list[PredictionRow]:
    """라벨(봉 t+h)이 패널에 있는 열린 예측 → 실현값. 종목 값이 없으면 NaN 으로 닫는다(판정에서 빠진다)."""
    p = prep.panel
    idx = {int(d): i for i, d in enumerate(p.dates)}
    col = {s: j for j, s in enumerate(p.symbols)}
    out: list[PredictionRow] = []
    for r in rows:
        if r.market != p.market:
            continue
        i = idx.get(int(r.ref_at.timestamp()))
        j = col.get(r.symbol)
        if i is None or i + r.horizon >= p.dates.size:
            continue
        rv = float(prep.y[r.horizon][i, j]) if j is not None else float("nan")
        ret = float(prep.r[r.horizon][i, j]) if j is not None else float("nan")
        in_time = r.recorded_at.timestamp() < int(p.dates[i + 1])
        out.append(scored(r, rv, ret, in_time, at))
    return out


# ── 리포트 ──


def _n(x: float | None, fmt: str = ".4f") -> str:
    return "—" if x is None or not np.isfinite(x) else format(x, fmt)


def _pct(x: float | None) -> str:
    return "—" if x is None or not np.isfinite(x) else f"{x * 100:.1f}%"


def _day(t: int) -> str:
    return datetime.fromtimestamp(t, UTC).date().isoformat() if t else "—"


def render_report(
    key: str,
    sha: str,
    as_of: datetime,
    hist: HistoryRun,
    status: Mapping[tuple[str, int], tuple[str, str | None]],
    forward: Mapping[tuple[str, int], ForwardResult],
    live: Sequence[LiveCell],
    negative_gk: int,
) -> str:
    lines = [
        f"# H1 흔들림 · 범위 — `{key}` ({as_of.date().isoformat()})",
        "",
        f"- 사전등록 `preregistration/2026-11-16-vol-range-3.toml`(@1 + 동결 재생) · 코드 `{sha}`"
        f" · as_of {as_of.isoformat()}",
        "- 1차 판정 = 자료 끝 2026-11-12 walk-forward(확장 창 · 매월 재적합 · 퍼지 h · 엠바고 5)."
        " 손실 QLIKE · DM(날짜 평균 · Newey–West h+5) · Holm 12 검정 α 0.05",
        "- 덮임 = 컨포멀(직전 250 날짜 |r|/√예측) 80 · 95% 가 [78, 82] · [93, 97] + 연도별 ±5%p",
        "- 판정 순서: no_skill(a) > miscalibrated(b) > placebo. 자료가 등록 때보다 짧으면 `history_short`(판정 안 함 —"
        " 전진 예측은 쓴다)",
        f"- 국내 Garman–Klass 음수로 뺀 칸 {negative_gk}",
        "",
        "## 1차(과거 walk-forward)",
        "",
        "| 칸 | 상태 | 판정 행 · 날 | 창 | QLIKE HAR · B1 · B2 · B3 | Holm p B1 · B2 · B3 | 덮임 80 · 95 | 연도별 |"
        " RV≤0 제외 | 플라시보 |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for c in hist.cells:
        st, why = status.get((c.market, c.horizon), (c.status, c.reason))
        ql = " · ".join(_n(c.qlike.get(k)) for k in ("har", *BASELINES))
        ph = " · ".join(_n(c.p_holm.get(k), ".3g") for k in BASELINES)
        cov = " · ".join(_pct(c.cover.get(a)) for a in LEVELS)
        yr = "; ".join(f"{y}: {' · '.join(_pct(v.get(a)) for a in LEVELS)}" for y, v in sorted(c.cover_by_year.items()))
        lines.append(
            f"| {c.market} h{c.horizon} | {st}{f' ({why})' if why else ''} | {c.rows} · {c.days} |"
            f" {_day(c.window[0])} ~ {_day(c.window[1])} | {ql} | {ph} | {cov} ({c.cover_rows}) | {yr or '—'} |"
            f" {c.excluded_nonpos} | {'통과' if c.placebo_pass else '걸림'} |"
        )
    lines += ["", "플라시보(피처 20봉 블록 섞음) — 칸별 pass_a:", ""]
    lines += [f"- {c.market} h{c.horizon}: {'통과(누수 의심)' if c.pass_a else '못 넘음'}" for c in hist.placebo_cells]
    lines += ["", "## 전진(등록 뒤 기준 봉 · 제때 기록 · 라벨 닫힘)", ""]
    lines += ["| 칸 | 행 · 날 | QLIKE HAR · B1 · B2 · B3 | 덮임 80 · 95 |", "|---|---|---|---|"]
    for (m, h), f in sorted(forward.items()):
        ql = " · ".join(_n(f.qlike.get(k)) for k in ("har", *BASELINES))
        lines.append(f"| {m} h{h} | {f.rows} · {f.days} | {ql} | {' · '.join(_pct(f.cover.get(a)) for a in LEVELS)} |")
    lines += ["", "## 오늘 기록한 예측", ""]
    for c in live:
        q = "—" if c.q is None else f"{c.q[0]:.2f} · {c.q[1]:.2f}"
        fit = "—" if c.fit is None else f"β {[round(float(b), 3) for b in c.fit.beta]} · 적합 행 {c.fit.rows}"
        lines.append(f"- {c.market} h{c.horizon}: {len(c.rows)}종목 · 컨포멀 배수 {q} · {fit}")
    lines += [
        "",
        "## 한계",
        "",
        "- 새 맥(2026-11-16)은 국내 일봉 백필 중 — 국내 1차 판정은 2021-10 이력이 찰 때까지 `history_short`",
        "- 화면에는 아직 아무것도 안 간다 — 판정 날짜(2027-01-12 · 02-11 · 03-13)에 전진 시험을 넘은 칸만",
    ]
    return "\n".join(lines) + "\n"
