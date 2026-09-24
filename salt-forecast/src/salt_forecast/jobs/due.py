"""작업이 돌 때가 됐는지 — 마지막 성공이 --hours 보다 오래됐으면 종료 코드 0, 아니면 1.

서버 부팅 · 매시 트리거(salt-server `forecast-runner` 워커)가 ops/daily.sh 를 불러도, 이미 오늘 돌았으면 바로 끝난다.
"""

from __future__ import annotations

import argparse
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from salt_forecast.store.db import engine
from salt_forecast.store.tables import job_run


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="작업 실행 시점 판정")
    p.add_argument("--job", required=True)
    p.add_argument("--hours", type=float, default=20.0)
    args = p.parse_args(argv)
    with engine().connect() as conn:
        last = conn.execute(
            select(func.max(job_run.c.finished_at)).where(job_run.c.job == args.job, job_run.c.ok.is_(True))
        ).scalar()
    due = last is None or last < datetime.now(UTC) - timedelta(hours=args.hours)
    print(f"{args.job}: 마지막 성공 {last} → {'실행' if due else '건너뜀'}")
    return 0 if due else 1


if __name__ == "__main__":
    raise SystemExit(main())
