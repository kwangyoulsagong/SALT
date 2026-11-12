"""오늘 등락 한 줄(③) 주간 운영 리포트 — FC-REQ-027 FR-4~6 · F016 단계 D.

매일 배치가 "마지막 성공 6.5일 전"이면 부른다(`due --job move_explanation_report`). 지난 7일 시도를 export 뷰로 읽어
`reports/move-explain-<KST 날짜>.md` 에 게이트 분포 · 걸린 사유 · 인용 수 · 나빠짐 판정 ·
사람 표시 양식을 쓴다. DB 쓰기 0.
"""

from __future__ import annotations

from datetime import timedelta

from salt_forecast.domain.calendar import report_day
from salt_forecast.domain.move_explanation import (
    LABEL_SAMPLE,
    WORSE_BLOCKED_SHARE,
    WORSE_MIN_ATTEMPTS,
    AssetSummary,
    label_sample,
    summarize,
)
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs.rule_ic import REPORTS  # pyright: ignore[reportPrivateUsage]
from salt_forecast.store.db import engine
from salt_forecast.store.move_explanation import attempts_between

JOB = "move_explanation_report"
WINDOW = timedelta(days=7)


def _pct(x: float | None) -> str:
    return "—" if x is None else f"{x * 100:.0f}%"


def _num(x: float | None) -> str:
    return "—" if x is None else f"{x:.1f}"


def _verdict(s: AssetSummary) -> str:
    w = s.worsened
    if w is None:
        return f"판정 안 함(시도 {s.attempts} < {WORSE_MIN_ATTEMPTS})"
    return "**나빠짐 — 끄기 검토**" if w else "기준 안"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("오늘 등락 한 줄 주간 운영 리포트")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        as_of = parse_as_of(args.as_of)
        attempts = attempts_between(engine(), as_of - WINDOW, as_of)
        summary = summarize(attempts)
        sample = label_sample(attempts)
        lines = [
            f"# 오늘 등락 한 줄(③) 운영 — {report_day(as_of)}",
            "",
            "FC-REQ-027 FR-4~6 · F016 단계 D. **켜기 문턱이 아니다**(2026-11-06 사용자 결정)"
            " — 쓰면서 재고, 나빠짐이면 서버"
            " `MOVE_SUMMARY=off` 를 검토한다. 창: 리포트 시각 전 7일 시도(종목 · 거래일 · 지문마다 한 번, 실패 포함).",
            "",
            f"나빠짐 기준(코드 상수 — `domain/move_explanation.py`): 한 주 시도 ≥ {WORSE_MIN_ATTEMPTS} 이고"
            f" 검사가 막은 비율(인용 없음 + 검사 걸림) > {WORSE_BLOCKED_SHARE:.0%}.",
            "",
            "| 자산 | 시도 | 통과 | 인용 없음 | 검사 걸림 | 막은 비율 | 평균 인용 | 인용 / 넣은 사실 | 판정 |",
            "|---|---|---|---|---|---|---|---|---|",
            *[
                f"| {s.asset} | {s.attempts} | {s.ok} | {s.no_citation} | {s.guard_blocked} | {_pct(s.blocked_share)}"
                f" | {_num(s.mean_citations)} | {_pct(s.coverage)} | {_verdict(s)} |"
                for s in summary
            ],
            *(
                ["| — | 0 | — | — | — | — | — | — | 판정 안 함(시도 0 — 카드가 서고 소식이 있는 날이 없었다) |"]
                if not summary
                else []
            ),
            "",
            "## 걸린 사유 · 공급자",
            "",
            *[
                f"- {s.asset}: 사유 {', '.join(f'{k} {v}' for k, v in s.rejections) or '없음'}"
                f" · 공급자 {', '.join(f'{k} {v}' for k, v in s.providers)}"
                for s in summary
            ],
            *(["- 없음"] if not summary else []),
            "",
            f"## 사람 표시 양식(FR-4) — 통과 문장 최대 {LABEL_SAMPLE}개",
            "",
            "칸마다 ✓/✗: **충실**(문장이 인용한 사실과 맞다) ·"
            " **단정**(원인을 단정한다 — 있으면 ✗) · **지어냄**(사실에 없는 주장 — 있으면 ✗).",
            "사실 원문은 화면(상세 카드)의 같은 날 사실에서 인용 id 로 본다."
            " 이 리포트는 제목 · 본문을 다시 싣지 않는다.",
            "",
            "| 거래일 | 종목 | 문장 | 인용 | 충실 | 단정 | 지어냄 |",
            "|---|---|---|---|---|---|---|",
            *[
                f"| {a.trade_date} | {a.asset}:{a.symbol} | {(a.text or '').replace('|', '/')}"
                f" | {len(a.citations)} |  |  |  |"
                for a in sample
            ],
            *(["| — | — | (통과 문장 없음) | — |  |  |  |"] if not sample else []),
            "",
            '"소식 없음" 정직률은 이 뷰로 재지 않는다 — 조용한 날 문장은 저장하지 않고'
            " 요청 때 같은 규칙으로 정한다(서버 경계 표 테스트가 그 몫).",
        ]
        path = REPORTS / f"move-explain-{report_day(as_of)}.md"
        if not args.dry_run:
            path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        log.info(
            "리포트",
            extra={"fields": {"job": JOB, "attempts": len(attempts), "path": str(path), "dry_run": args.dry_run}},
        )
        return len(attempts)

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
