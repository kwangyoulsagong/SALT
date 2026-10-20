"""워크포워드 리포트 — 모델 등록의 근거(modeling-evaluation.md §3). 적중률은 폭 · 기준 · 판정 수와 함께만."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Hashable, Iterable
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from salt_forecast.scoring.frame import BacktestColumns
from salt_forecast.store.predictions import ScoreRow


@dataclass(frozen=True, slots=True)
class _Group:
    """(모델, 기간) 하나의 점수 열 — 행 순서는 입력 순서 그대로(평균의 합산 순서가 같아야 같은 숫자가 나온다)."""

    hit90: NDArray[np.bool_]
    hit80: NDArray[np.bool_]
    width90: NDArray[np.float64]
    pinball: NDArray[np.float64]
    direction_hit: NDArray[np.int8]  # −1 = 판정 안 함
    realized: NDArray[np.float64]
    keys: list[Hashable]  # (종목, as_of) — 기준과 짝짓기


def _groups_from_rows(scores: Iterable[ScoreRow]) -> tuple[dict[tuple[str, int], _Group], int]:
    rows: dict[tuple[str, int], list[ScoreRow]] = defaultdict(list)
    symbols: set[str] = set()
    for s in scores:
        rows[(s.model_version, s.horizon_weeks)].append(s)
        symbols.add(s.symbol)
    return {
        k: _Group(
            np.asarray([r.score.hit90 for r in v], dtype=np.bool_),
            np.asarray([r.score.hit80 for r in v], dtype=np.bool_),
            np.asarray([r.score.width90 for r in v], dtype=np.float64),
            np.asarray([r.score.pinball for r in v], dtype=np.float64),
            np.asarray([-1 if r.score.direction_hit is None else int(r.score.direction_hit) for r in v], dtype=np.int8),
            np.asarray([r.score.realized for r in v], dtype=np.float64),
            [(r.symbol, r.as_of) for r in v],
        )
        for k, v in rows.items()
    }, len(symbols)


def _groups_from_columns(cols: BacktestColumns) -> tuple[dict[tuple[str, int], _Group], int]:
    out: dict[tuple[str, int], _Group] = {}
    for code, m in enumerate(cols.models):
        for h in np.unique(cols.h[cols.model == code]).tolist():
            idx = np.flatnonzero((cols.model == code) & (cols.h == h))
            out[(m, int(h))] = _Group(
                cols.hit90[idx],
                cols.hit80[idx],
                cols.width90[idx],
                cols.pinball[idx],
                cols.direction_hit[idx],
                cols.realized[idx],
                list(zip(cols.sym[idx].tolist(), cols.as_of[idx].tolist(), strict=True)),
            )
    return out, int(np.unique(cols.sym).size)


def render(
    scores: Iterable[ScoreRow] | BacktestColumns, models: list[str], baseline_version: str, title: str, notes: list[str]
) -> str:
    groups, n_symbols = (
        _groups_from_columns(scores) if isinstance(scores, BacktestColumns) else _groups_from_rows(scores)
    )
    lines = [
        f"# {title}",
        "",
        *notes,
        "",
        f"- 종목 {n_symbols}개",
        "",
        "| 모델 | 기간 | 표본 | 90% 커버리지 | 80% 커버리지 | 90% 폭 중앙값(로그) | pinball "
        "| 방향 판정 수 | 방향 적중 | 항상 오른다 |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for (m, h), g in sorted(groups.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        if m not in models:
            continue
        n = g.pinball.size
        calls = int(np.count_nonzero(g.direction_hit >= 0))
        hits = int(np.count_nonzero(g.direction_hit == 1))
        hit_rate = f"{hits / calls:.1%}" if calls else "—"
        lines.append(
            f"| `{m}` | {h}주 | {n} | {np.mean(g.hit90):.1%} | "
            f"{np.mean(g.hit80):.1%} | {np.median(g.width90):.3f} | "
            f"{np.mean(g.pinball):.5f} | {calls} ({calls / n:.0%}) | {hit_rate} | "
            f"{np.mean(g.realized > 0):.1%} |"
        )
    lines.append("")
    for h in sorted({h for _, h in groups}):
        b = groups.get((baseline_version, h))
        for model_version in models:
            if model_version == baseline_version:
                continue
            m = groups.get((model_version, h))
            if m is None or b is None:
                continue
            # 같은 as_of · 종목끼리 짝지어 비교한다 — LightGBM 은 앞 52주에 예측이 없다
            bmap = dict(zip(b.keys, b.pinball.tolist(), strict=True))
            pairs = [(p, bmap[k]) for k, p in zip(m.keys, m.pinball.tolist(), strict=True) if k in bmap]
            if not pairs:
                continue
            mp = float(np.mean([p for p, _ in pairs]))
            bp = float(np.mean([q for _, q in pairs]))
            lines.append(
                f"- {h}주 `{model_version}`: pinball skill(기준 대비, 같은 표본 {len(pairs)}) **{1 - mp / bp:+.2%}**"
            )
    return "\n".join(lines) + "\n"
