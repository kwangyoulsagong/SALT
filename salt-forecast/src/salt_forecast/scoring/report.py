"""워크포워드 리포트 — 모델 등록의 근거(modeling-evaluation.md §3). 적중률은 폭 · 기준 · 판정 수와 함께만."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable

import numpy as np

from salt_forecast.store.predictions import ScoreRow


def render(scores: Iterable[ScoreRow], models: list[str], baseline_version: str, title: str, notes: list[str]) -> str:
    groups: dict[tuple[str, int], list[ScoreRow]] = defaultdict(list)
    symbols: set[str] = set()
    for s in scores:
        groups[(s.model_version, s.horizon_weeks)].append(s)
        symbols.add(s.symbol)
    lines = [
        f"# {title}",
        "",
        *notes,
        "",
        f"- 종목 {len(symbols)}개",
        "",
        "| 모델 | 기간 | 표본 | 90% 커버리지 | 80% 커버리지 | 90% 폭 중앙값(로그) | pinball "
        "| 방향 판정 수 | 방향 적중 | 항상 오른다 |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for (m, h), rows in sorted(groups.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        if m not in models:
            continue
        n = len(rows)
        calls = [r for r in rows if r.score.direction_hit is not None]
        hits = sum(1 for r in calls if r.score.direction_hit)
        hit_rate = f"{hits / len(calls):.1%}" if calls else "—"
        lines.append(
            f"| `{m}` | {h}주 | {n} | {np.mean([r.score.hit90 for r in rows]):.1%} | "
            f"{np.mean([r.score.hit80 for r in rows]):.1%} | {np.median([r.score.width90 for r in rows]):.3f} | "
            f"{np.mean([r.score.pinball for r in rows]):.5f} | {len(calls)} ({len(calls) / n:.0%}) | {hit_rate} | "
            f"{np.mean([r.score.realized > 0 for r in rows]):.1%} |"
        )
    lines.append("")
    for h in sorted({h for _, h in groups}):
        b = groups.get((baseline_version, h), [])
        for model_version in models:
            if model_version == baseline_version:
                continue
            m = groups.get((model_version, h), [])
            if not m or not b:
                continue
            # 같은 as_of · 종목끼리 짝지어 비교한다 — LightGBM 은 앞 52주에 예측이 없다
            bmap = {(r.symbol, r.as_of): r.score.pinball for r in b}
            pairs = [(r.score.pinball, bmap[(r.symbol, r.as_of)]) for r in m if (r.symbol, r.as_of) in bmap]
            if not pairs:
                continue
            mp = float(np.mean([p for p, _ in pairs]))
            bp = float(np.mean([q for _, q in pairs]))
            lines.append(
                f"- {h}주 `{model_version}`: pinball skill(기준 대비, 같은 표본 {len(pairs)}) **{1 - mp / bp:+.2%}**"
            )
    return "\n".join(lines) + "\n"
