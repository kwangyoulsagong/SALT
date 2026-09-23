"""작업 기록 · 락 · 소스 상태."""

from __future__ import annotations

import zlib
from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import Engine, insert, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from salt_forecast.store.tables import job_run, source_status


@contextmanager
def advisory_lock(engine: Engine, name: str) -> Generator[bool]:
    """겹치면 False 를 준다 — 호출자는 즉시 종료한다(architecture.md §3)."""
    key = zlib.crc32(f"salt_forecast:{name}".encode())
    with engine.connect() as conn:
        got = bool(conn.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": key}).scalar())
        try:
            yield got
        finally:
            if got:
                conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": key})
                conn.commit()


def start_run(engine: Engine, job: str, args: dict[str, Any]) -> int:
    with engine.begin() as conn:
        rid = conn.execute(
            insert(job_run).values(job=job, args=args, started_at=datetime.now(UTC)).returning(job_run.c.id)
        ).scalar_one()
    return int(rid)


def finish_run(engine: Engine, run_id: int, *, ok: bool, rows: int | None = None, error: str | None = None) -> None:
    with engine.begin() as conn:
        conn.execute(
            update(job_run)
            .where(job_run.c.id == run_id)
            .values(finished_at=datetime.now(UTC), ok=ok, rows=rows, error=error)
        )


def mark_source(engine: Engine, source: str, *, ok: bool, error: str | None = None) -> None:
    now = datetime.now(UTC)
    values: dict[str, Any] = {"source": source}
    values.update({"last_success_at": now} if ok else {"last_failure_at": now, "last_error": error})
    stmt = pg_insert(source_status).values(**values)
    stmt = stmt.on_conflict_do_update(
        index_elements=["source"], set_={k: v for k, v in values.items() if k != "source"}
    )
    with engine.begin() as conn:
        conn.execute(stmt)


def close_interrupted(engine: Engine, job: str, older_than_hours: int = 6) -> int:
    """끊긴 실행(SIGTERM 등)이 ok = null 로 남은 것을 정리한다. 락을 잡은 뒤에만 부른다 — 지금 도는 것은 없다."""
    with engine.begin() as conn:
        res = conn.execute(
            update(job_run)
            .where(
                job_run.c.job == job,
                job_run.c.finished_at.is_(None),
                job_run.c.started_at < datetime.now(UTC) - timedelta(hours=older_than_hours),
            )
            .values(finished_at=datetime.now(UTC), ok=False, error="interrupted")
        )
    return int(res.rowcount)
