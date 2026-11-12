"""mode-decision@3 [gate] — 표본 밖 후보 초과수익.

사전등록 salt-server/preregistration/2026-11-12-mode-decision-3.toml [gate].

@3 은 점수가 @2 와 같고 행동 대응만 다르다(점수 ≥ 60 = 후보). 그래서 signal-skill@1 이 저장한
@2 과거 검산 행(코인은 2026-09-29 뒤만 저장 = 표본 밖, 국내는 전부 표본 밖)에서 점수 ≥ 60 행이
곧 @3 후보다 — 같은 일정 · 같은 채점이라 signal-skill@2 를 다시 돌린 것과 같은 표본이다.

측정은 judgment-tier@1 [measure] excess 를 예측 쪽 운영 코드 그대로 부른다
(`domain.judgment_tier._excess` — 같은 칸 · 같은 날 평균 · `round_trip` 비용).
행은 `public.v_judgment_outcome_export` 와 같은 조건(outcome · return_rate · evaluated_at 있음) + 점수.
구간은 날짜 블록 부트스트랩 2,000회 · seed 20261111(judgment-tier@1 과 같은 값) — 후보 초과의 평균.

실행(salt-forecast 에서):
    uv run python -I ../salt-server/scripts/forecast-gate/mode-decision-3-gate.py <DB URL> [--gross]
"""

from __future__ import annotations

import sys
from collections import defaultdict
from datetime import UTC, timedelta

import numpy as np
import psycopg

from salt_forecast.domain import judgment_tier as tier

KST = timedelta(hours=9)
CANDIDATE_FROM = 60  # mode-decision@3 [rule].candidate
MIN_CANDIDATES = 20  # [gate].ship
MIN_DAYS = 10

SQL = """
SELECT CASE WHEN signal_type LIKE 'kr\\_stock.%%' THEN 'kr' ELSE 'crypto' END, mode, sample_origin, score,
       judged_at, return_rate::float8
FROM symbol_judgment_snapshots
WHERE rule_version = 'mode-decision@2' AND sample_origin IN ('backtest_full', 'backtest_price_only')
  AND outcome IS NOT NULL AND return_rate IS NOT NULL AND evaluated_at IS NOT NULL
"""


def main(url: str, gross: bool) -> int:
    cells: dict[tuple[str, str, str], list[tier.Row]] = defaultdict(list)
    with psycopg.connect(url) as conn:
        for market, mode, origin, score, judged_at, r in conn.execute(SQL):
            at = judged_at.replace(tzinfo=UTC)
            action = "review_candidate" if score >= CANDIDATE_FROM else "wait"
            cells[(market, mode, origin)].append(tier.Row((at + KST).date(), at, action, float(r)))

    if gross:
        tier.round_trip = lambda market, day: 0.0  # type: ignore[assignment]  # 비용 전 비교용 — 이 프로세스 안에서만

    verdicts: list[bool] = []
    for (market, mode, origin), rows in sorted(cells.items()):
        day_idx, side, excess = tier._excess(rows, market)  # pyright: ignore[reportPrivateUsage]
        cand = side == 1
        days = np.unique(day_idx[cand])
        label = f"{market} {mode} {origin}"
        if cand.sum() == 0:
            print(f"{label}: 후보 0")
            continue
        per_day: list[np.ndarray[tuple[int], np.dtype[np.float64]]] = [excess[cand & (day_idx == d)] for d in days]
        rng = np.random.default_rng(tier.SEED)
        boots = np.array(
            [
                np.concatenate([per_day[int(i)] for i in rng.integers(0, len(days), len(days)).tolist()]).mean()
                for _ in range(tier.REPS)
            ]
        )
        lo, hi = np.percentile(boots, [2.5, 97.5])
        judged = int(cand.sum()) >= MIN_CANDIDATES and len(days) >= MIN_DAYS
        if judged:
            verdicts.append(hi >= 0)
        print(
            f"{label}: 후보 {int(cand.sum())} · 날 {len(days)} · 초과 평균 {excess[cand].mean() * 100:+.3f}%"
            f" · 95% [{lo * 100:+.3f}, {hi * 100:+.3f}]" + ("" if judged else " · 관문 대상 아님(표본 미달)")
        )
    if not gross:
        print("관문:", "ship" if verdicts and all(verdicts) else "hold")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], "--gross" in sys.argv))
