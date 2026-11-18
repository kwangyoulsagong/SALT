"""개인 재무 구간 채점 — 매일 (FC-REQ-024 FR-1~5 · 7).

서비스 export 뷰 둘을 읽어 발행 사본을 맞추고(사라진 것은 지움) · 닫힌 판정을 쓰고 ·
6개월 커버리지를 운영 점검에 남긴다.
로직은 domain/personal_projection · store/personal_projection — 여기는 인자 · 락 · 기록만.

--as-of 로 과거 날을 주면 그날 닫혔을 판정만 쓴다. 원천 뷰는 이력이 없는 지금 상태라
(발행은 불변 · 도달 달 · 가계부 판정은 지금 값) 과거 재실행은 "그때 이미 닫힌 것"을 지금 아는 값으로 다시 만든다 —
판정은 처음 값을 지켜 바뀌지 않는다.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.exc import DBAPIError

from salt_forecast.domain.ops_health import Finding
from salt_forecast.domain.personal_projection import (
    Issuance,
    LandingState,
    SavingsState,
    counted_ids,
    coverage,
    coverage_checks,
    kst_date,
    verdicts,
)
from salt_forecast.jobs._common import base_parser, logger, parse_as_of, run_job
from salt_forecast.store.db import engine
from salt_forecast.store.ops import write_checks
from salt_forecast.store.personal_projection import (
    load_verdicts,
    prune_missing,
    read_landings,
    read_savings,
    save_copies,
    save_verdicts,
)

JOB = "personal_scoring"


def main(argv: list[str] | None = None) -> int:
    args = base_parser("개인 재무 구간 채점").parse_args(argv)
    log = logger(JOB)

    def body() -> int:
        eng = engine()
        now = parse_as_of(args.as_of)
        today = kst_date(now)
        issues: list[Issuance] = []
        savings: dict[str, SavingsState] = {}
        landings: dict[str, LandingState] = {}
        read_ok: dict[str, bool] = {}
        # 원천 하나를 못 읽어도(서비스가 아직 그 뷰를 안 만듦 · 권한) 다른 쪽은 돈다 — 못 읽은 종류는 지우지 않는다
        try:
            for i, s in read_savings(eng):
                issues.append(i)
                savings[i.issuance_id] = s
            read_ok["savings_reach"] = True
        except DBAPIError as e:
            log.warning("저축 원천 못 읽음", extra={"fields": {"job": JOB, "error": type(e.orig).__name__}})
            read_ok["savings_reach"] = False
        try:
            for i, ls in read_landings(eng):
                issues.append(i)
                landings[i.issuance_id] = ls
            read_ok["household_landing"] = True
        except DBAPIError as e:
            log.warning("가계부 원천 못 읽음", extra={"fields": {"job": JOB, "error": type(e.orig).__name__}})
            read_ok["household_landing"] = False

        judged = verdicts(issues, savings, landings, today)
        counted = counted_ids(issues)
        rows = 0
        if not args.dry_run:
            stamp = datetime.now(UTC)
            rows += save_copies(eng, issues, stamp)
            for kind, ok in read_ok.items():
                if ok:
                    rows += prune_missing(eng, kind, [i.issuance_id for i in issues if i.kind == kind])  # pyright: ignore[reportArgumentType]
            rows += save_verdicts(eng, judged, stamp)
            stored = load_verdicts(eng, today)
        else:
            stored = judged
        covs = coverage(issues, stored, today)
        checks = coverage_checks(covs)
        for c in checks:
            if c.under_nominal:  # 운영 점검과 같은 꼴 — 막지 않고 WARN(ops_check 는 아무도 화면에 안 그린다)
                fields = {"job": JOB, "subject": c.subject, "detail": c.detail}
                log.warning("커버리지 명목 미달", extra={"fields": fields})
        if not args.dry_run:
            hour = now.replace(minute=0, second=0, microsecond=0)
            write_checks(
                eng,
                [Finding(c.subject, "under_nominal" if c.under_nominal else "ok", None, c.detail) for c in checks],
                hour,
                datetime.now(UTC),
            )
        log.info(
            "채점",
            extra={
                "fields": {
                    "job": JOB,
                    "issuances": len(issues),
                    "with_interval": sum(1 for i in issues if i.has_interval),
                    "counted": len(counted),
                    "closed": len(judged),
                    "read_ok": read_ok,
                    "coverage": [c.detail for c in checks],
                    "dry_run": args.dry_run,
                }
            },
        )
        return rows

    return run_job(JOB, args, body)


if __name__ == "__main__":
    raise SystemExit(main())
