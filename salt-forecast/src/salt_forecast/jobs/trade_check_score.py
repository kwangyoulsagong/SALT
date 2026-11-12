"""점검 채점 — 원장(export 뷰)의 점검 줄마다 기간이 지나면 실제 결과를 적는다(FC-REQ-028 FR-4 · F017 v2 단계 2).

매일 배치에서 돈다(국내 일봉 옮긴 뒤). `--report` 면 주간 리포트 `reports/short-horizon-<날짜>.md` 의 점검 절을 쓴다.
"""

from __future__ import annotations

from datetime import UTC, datetime

from salt_forecast.domain.calendar import report_day
from salt_forecast.domain.trade_check import Outcome, score
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.jobs.rule_ic import REPORTS  # pyright: ignore[reportPrivateUsage]
from salt_forecast.store.db import engine
from salt_forecast.store.prices import load_ohlcv_series
from salt_forecast.store.trade_check import outcome_summary, save_outcomes, unscored_checks

JOB = "trade_check_score"
REPORT_JOB = "trade_check_report"
SOURCE = {"kr": "kis", "crypto": "upbit"}


def _pct(x: float | None) -> str:
    return "—" if x is None else f"{x * 100:.1f}%"


def main(argv: list[str] | None = None) -> int:
    p = base_parser("점검 채점(점검 원장 → 실제 결과)")
    p.add_argument("--report", action="store_true", help="주간 리포트 점검 절을 쓴다")
    args = p.parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        t_end = int(as_of.timestamp())
        rows = unscored_checks(eng, as_of)
        outcomes: list[Outcome] = []
        for market, source in SOURCE.items():
            mine = [r for r in rows if r.market == market]
            if not mine:
                continue
            bars = load_ohlcv_series(eng, source, "1d", sorted({r.symbol for r in mine}))
            for r in mine:
                s = bars.get(r.symbol)
                if s is None:
                    continue
                o = score(r, s.available_at, s.close, t_end)
                if o is not None:
                    outcomes.append(o)
        log.info("채점", extra={"fields": {"job": JOB, "unscored": len(rows), "scored": len(outcomes)}})
        written = len(outcomes) if args.dry_run else save_outcomes(eng, outcomes, datetime.now(UTC))
        if args.report:
            lines = [
                f"# 단타 · 점검 채점 — {as_of.date().isoformat()}",
                "",
                "FC-REQ-028 FR-4. 점검 = 사기 전 · 팔기 전 한 줄(`base-rate@1`). 결과 정의는 점검 문장과 같다 —"
                " 국내 점검한 날 뒤 h 번째 거래일 종가 · 코인 h 일 뒤 첫 일봉 종가,"
                " 사기 전은 비용 뒤 · 팔기 전은 비용 전. 단타 확률(단계 5) · 태그(단계 6)는 아직 없다.",
                "",
                "| 시장 | 방향 | 채점 수 | 보여 준 비율 평균 | 실제 오른 비율 |",
                "|---|---|---|---|---|",
                *[f"| {m} | {s} | {n} | {_pct(shown)} | {_pct(up)} |" for m, s, n, shown, up in outcome_summary(eng)],
                "",
                "표본이 적을 땐 두 비율 차이를 실력 · 결함으로 읽지 않는다 —"
                " 같은 날 몰림(종목 여럿이 같은 날 같은 조건) 때문에 유효 표본은 채점 수보다 훨씬 작다.",
            ]
            path = REPORTS / f"short-horizon-{report_day(as_of)}.md"
            path.write_text("\n".join(lines) + "\n", encoding="utf-8")
            log.info("리포트", extra={"fields": {"job": JOB, "path": str(path)}})
        return written

    # 주간 리포트 회차는 이름을 따로 남긴다 — 배치가 `due --job trade_check_report` 로 6.5일을 센다
    return run_job(REPORT_JOB if args.report else JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
