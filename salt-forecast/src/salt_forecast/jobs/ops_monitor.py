"""운영 점검 — 매시(ops/daily.sh). 정기 작업 실패 · 지연 · 미실행, 주간 비중 · 매일 판단 원장을
`forecast.ops_check` 에 남긴다.

막지 않는다 — 기록하고 로그에 WARN 을 남길 뿐이다. 같은 작업에서 보존 90일이 지난 `job_run` · `ops_check` 를 지운다.
"""

from __future__ import annotations

from datetime import UTC, datetime

from salt_forecast.domain.ops_health import is_healthy
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.scoring.ops_monitor import RETENTION, hour_floor, run_checks
from salt_forecast.store import ops
from salt_forecast.store.db import engine

JOB = "ops_monitor"


def main(argv: list[str] | None = None) -> int:
    args = base_parser("운영 점검(정기 작업 · 주간 원장)").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        as_of = parse_as_of(args.as_of)
        findings = run_checks(eng, as_of)
        for f in findings:
            if f.status not in ("ok",):
                log.warning(
                    "점검", extra={"fields": {"job": JOB, "subject": f.subject, "status": f.status, "detail": f.detail}}
                )
        log.info("요약", extra={"fields": {"job": JOB, "healthy": is_healthy(findings), "checked": len(findings)}})
        before = as_of - RETENTION
        if args.dry_run:
            runs, checks = ops.count_expired(eng, before)
            log.info("보존 기한 지남(dry-run)", extra={"fields": {"job": JOB, "job_run": runs, "ops_check": checks}})
            return len(findings)
        written = ops.write_checks(eng, findings, hour_floor(as_of), datetime.now(UTC))
        runs, checks = ops.prune(eng, before)
        if runs or checks:
            log.info("보존 기한 지난 행 삭제", extra={"fields": {"job": JOB, "job_run": runs, "ops_check": checks}})
        return written

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
