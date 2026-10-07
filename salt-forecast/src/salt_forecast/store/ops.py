"""운영 점검 읽기 · 쓰기 — `job_run` · 주간 원장 기록 시각 → `ops_check` (FC-REQ-018).

읽기는 as_of 까지만 본다 — 과거 시각으로 다시 돌리면 그때 본 것과 같은 판정이 나와야 한다(architecture.md §3).
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date, datetime

from sqlalchemy import Engine, delete, func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from salt_forecast.domain.ops_health import Finding, JobState
from salt_forecast.store.tables import job_run, ops_check, target_weight_live_weight


def job_states(engine: Engine, jobs: Sequence[str], as_of: datetime) -> dict[str, JobState]:
    """작업마다 마지막 성공 시각과 마지막으로 끝난 실행 — 두 쿼리, 작업 수와 무관."""
    done = job_run.c.finished_at <= as_of
    with engine.connect() as conn:
        last_ok: dict[str, datetime] = {
            str(job): at
            for job, at in conn.execute(
                select(job_run.c.job, func.max(job_run.c.finished_at))
                .where(job_run.c.job.in_(jobs), job_run.c.ok.is_(True), done)
                .group_by(job_run.c.job)
            ).all()
        }
        last = conn.execute(
            select(job_run.c.job, job_run.c.finished_at, job_run.c.ok, job_run.c.error)
            .where(job_run.c.job.in_(jobs), done)
            .distinct(job_run.c.job)
            .order_by(job_run.c.job, job_run.c.finished_at.desc())
        ).all()
    out: dict[str, JobState] = {}
    for job, finished_at, ok, error in last:
        out[str(job)] = JobState(
            job=str(job),
            last_ok_at=last_ok.get(str(job)),
            last_finished_at=finished_at,
            last_finished_ok=ok,
            last_error=error,
        )
    return out


def weekly_recorded(engine: Engine, as_of: datetime) -> dict[datetime, datetime]:
    """주간 비중 리밸런스마다 가장 이른 기록 시각(목표 · 등록 무관). as_of 뒤 기록은 보지 않는다."""
    w = target_weight_live_weight
    with engine.connect() as conn:
        rows = conn.execute(
            select(w.c.rebalance_at, func.min(w.c.recorded_at))
            .where(w.c.recorded_at <= as_of)
            .group_by(w.c.rebalance_at)
        ).all()
        return {rebalance: recorded for rebalance, recorded in rows}


def judgment_ledger_dates(engine: Engine, since: date, as_of: datetime) -> set[date]:
    """서버 판단 원장의 라이브 발행일 — `public` 읽기(db-contract.md §1). as_of 뒤에 쓰인 행은 보지 않는다."""
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT DISTINCT as_of_date FROM public.judgment_ledger "
                "WHERE sample_origin = 'live' AND as_of_date >= :since AND created_at <= :as_of"
            ),
            {"since": since, "as_of": as_of.replace(tzinfo=None)},
        ).all()
    return {r[0] for r in rows}


def write_checks(engine: Engine, findings: Sequence[Finding], as_of: datetime, checked_at: datetime) -> int:
    if not findings:
        return 0
    rows = [
        {
            "as_of": as_of,
            "subject": f.subject,
            "status": f.status,
            "last_ok_at": f.last_ok_at,
            "detail": f.detail,
            "checked_at": checked_at,
        }
        for f in findings
    ]
    stmt = pg_insert(ops_check).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["as_of", "subject"],
        set_={k: stmt.excluded[k] for k in ("status", "last_ok_at", "detail", "checked_at")},
    )
    with engine.begin() as conn:
        conn.execute(stmt)
    return len(rows)


def count_expired(engine: Engine, before: datetime) -> tuple[int, int]:
    """보존 기한(db-contract.md §5)이 지난 행 수 — (job_run, ops_check). 도는 중인 실행은 세지 않는다."""
    with engine.connect() as conn:
        runs = conn.execute(
            select(func.count())
            .select_from(job_run)
            .where(job_run.c.started_at < before, job_run.c.finished_at.isnot(None))
        ).scalar_one()
        checks = conn.execute(
            select(func.count()).select_from(ops_check).where(ops_check.c.as_of < before)
        ).scalar_one()
    return int(runs), int(checks)


def prune(engine: Engine, before: datetime) -> tuple[int, int]:
    """보존 기한이 지난 행을 지운다 — 하루 몇십 행이라 한 문장으로 충분하다.

    (서버 performance-database.md §8 의 나눠 지우기는 수만 행 기준이다.)
    """
    with engine.begin() as conn:
        runs = conn.execute(
            delete(job_run).where(job_run.c.started_at < before, job_run.c.finished_at.isnot(None))
        ).rowcount
        checks = conn.execute(delete(ops_check).where(ops_check.c.as_of < before)).rowcount
    return int(runs), int(checks)
