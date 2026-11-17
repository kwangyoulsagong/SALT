"""원인 설명 채점 — 그날 마지막 원인 스냅샷 × 닫힌 결과 → 칸 넷(cause-explain@1 · FC-REQ-022 FR-15)."""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from datetime import date, datetime

from salt_forecast.domain.cause_explain import HORIZONS, KEY, MARKETS, Cell, Row, base_of, kind_of, score_cell
from salt_forecast.domain.ontology import Snapshot, asset_id


def rows_for(
    market: str,
    h: int,
    days: Sequence[Snapshot],
    outs: Mapping[tuple[str, date, int], tuple[float, datetime]],
    cutoff: int | None,
) -> tuple[list[Row], int]:
    """(행, 늦은 기록 수). 늦은 기록 = 찍은 시각이 라벨 첫 봉 뒤(서버 창 규칙상 0 이어야 한다 — 빼고 센다).

    cutoff(판정 표본 끝, epoch) 가 있으면 그 전에 닫힌 라벨만."""
    rows: list[Row] = []
    late = 0
    for s in days:
        if s.market != market:
            continue
        o = outs.get((asset_id(market, s.symbol), s.trade_date, h))
        if o is None:
            continue
        excess, label_at = o
        t_cap, t_lab = int(s.captured_at.timestamp()), int(label_at.timestamp())
        if cutoff is not None and t_lab >= cutoff:
            continue
        first = outs.get((asset_id(market, s.symbol), s.trade_date, 1))
        if first is not None and t_cap >= int(first[1].timestamp()):
            late += 1
            continue
        rows.append(
            Row(
                s.symbol,
                s.trade_date,
                t_cap,
                t_lab,
                kind_of(s.top_kind, s.top_strength),
                base_of(market, s.split),
                excess,
            )
        )
    return rows, late


def run(
    days: Sequence[Snapshot], outs: Mapping[tuple[str, date, int], tuple[float, datetime]], cutoff: int | None = None
) -> tuple[list[Cell], list[dict[str, object]]]:
    cells: list[Cell] = []
    details: list[dict[str, object]] = []
    for m in MARKETS:
        for h in HORIZONS:
            rows, late = rows_for(m, h, days, outs, cutoff)
            c = score_cell(m, h, rows)
            cells.append(c)
            details.append(
                {
                    "late": late,
                    "zero_labels": c.rows_zero,
                    "kinds": c.kinds,
                    "snapshot_days": len({s.trade_date for s in days if s.market == m}),
                }
            )
    return cells, details


def _x(v: float, fmt: str = "{:.4f}") -> str:
    return fmt.format(v) if math.isfinite(v) else "—"


def render_report(
    sha: str, as_of: datetime, cells: Sequence[Cell], details: Sequence[dict[str, object]], counts: Mapping[str, int]
) -> str:
    lines = [
        f"# 원인 설명 채점 — {KEY} ({as_of.date().isoformat()})",
        "",
        f"코드 `{sha}` · 사전등록 `preregistration/2026-11-16-cause-explain.toml` · "
        "전진 시험만(판정 2027-01-15 · 02-14 · 03-16).",
        "칸 숫자는 **판정이 아니다** — 판정 날짜 전 상태는 forward(사유는 그 시점 값).",
        "",
        "## 온톨로지 행 수",
        "",
        "| 층 | 행 |",
        "|---|---|",
        *[f"| {k} | {v} |" for k, v in counts.items()],
        "",
        "## 칸",
        "",
        "| 시장 | h | 상태 | 채점 행 | cold | 날 | Brier(원인) | Brier(기준) | skill | t | p | Holm p | 늦은 기록 |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for c, d in zip(cells, details, strict=True):
        lines.append(
            f"| {c.market} | {c.horizon} | {c.status}{f' ({c.reason})' if c.reason else ''} | "
            f"{c.rows_scored} | {c.rows_cold} | {c.days} | {_x(c.brier_kind)} | {_x(c.brier_base)} | "
            f"{_x(c.skill, '{:+.3f}')} | {_x(c.t, '{:.2f}')} | {_x(c.p, '{:.3f}')} | "
            f"{_x(c.p_holm, '{:.3f}')} | {d['late']} |"
        )
    lines += [
        "",
        "## 원인 종류별(서술 — 판정 아님)",
        "",
        "| 시장 | h | 종류 | 표본 | 오른 비율 |",
        "|---|---|---|---|---|",
    ]
    for c in cells:
        for k, v in sorted(c.kinds.items()):
            lines.append(f"| {c.market} | {c.horizon} | {k} | {int(v['n'])} | {v['up']:.1%} |")
    return "\n".join(lines) + "\n"
