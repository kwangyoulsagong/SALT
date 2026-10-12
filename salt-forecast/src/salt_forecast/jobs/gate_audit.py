"""게이트 감사 — 코인 게이트의 상시 플라시보 리포트(FC-REQ-020 FR-5).

코인 게이트는 **바꾸지 않는다**(사용자 결정 대기). 이 작업은 두 숫자를 리포트에 남길 뿐이다:
1. 지금의 종목별 게이트로 켜진 카드 중 우연 기대 비율(날짜 블록 맞바꾸기)
2. 같은 점수에 국내 주식의 풀링 게이트 + 종목 거부권을 썼다면 몇 개가 켜지고 우연 비율은 얼마인가

DB 에 쓰지 않는다 — 리포트 파일만(`reports/gate-audit-<날짜>.md`). `--dry-run` 이면 출력만.
"""

from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path

from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.models.engine import BASELINE, HORIZONS
from salt_forecast.models.registry import PRODUCTION
from salt_forecast.scoring.evaluate import Paired, paired_scores
from salt_forecast.scoring.pooled_gate import (
    kr_cards,
    per_symbol_cards,
    placebo,
    pooled_gate,
    render_placebo,
    render_pooled,
    trim,
)
from salt_forecast.store.db import engine
from salt_forecast.store.predictions import scores_for

JOB = "gate_audit"
REPORTS = Path(__file__).resolve().parents[3] / "reports"


def main(argv: list[str] | None = None) -> int:
    args = base_parser("게이트 플라시보 감사(코인)").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        cutoff = now.timestamp()
        scores = [s for s in scores_for(eng, [PRODUCTION, BASELINE]) if s.as_of.timestamp() <= cutoff]
        universe = sorted({(s.symbol, s.horizon_weeks) for s in scores})
        pairs = trim(paired_scores(scores, PRODUCTION, BASELINE, universe))

        def current(p: Mapping[tuple[str, int], Paired]) -> int:
            return per_symbol_cards(p, PRODUCTION, BASELINE)

        def pooled(p: Mapping[tuple[str, int], Paired]) -> int:
            return kr_cards(p, PRODUCTION, BASELINE, HORIZONS)[0]

        lines = [
            f"# 게이트 감사 — 코인 `{PRODUCTION}` ({now.date()})",
            "",
            f"- 종목 × 기간 {len(universe)} · 점수 {len(scores)}행(주 격자 · 짝지은 것만 판정에 쓴다)",
            "- 코인 게이트는 이 리포트로 바뀌지 않는다 — 풀링화 여부는 사용자 결정(FC-REQ-020 FR-5)",
            "",
            *render_placebo("지금의 종목별 게이트", placebo(pairs, current), None),
            *render_pooled("가정: 풀링 실력 검정", pooled_gate(pairs, HORIZONS)),
            *render_placebo("가정: 풀링 게이트 + 종목 거부권", placebo(pairs, pooled), None),
        ]
        report = "\n".join(lines)
        log.info("게이트 감사", extra={"fields": {"job": JOB, "pairs": len(pairs)}})
        if args.dry_run:
            print(report)
            return len(pairs)
        REPORTS.mkdir(exist_ok=True)
        (REPORTS / f"gate-audit-{now.date()}.md").write_text(report, encoding="utf-8")
        return len(pairs)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
