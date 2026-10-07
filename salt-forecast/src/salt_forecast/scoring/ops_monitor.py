"""운영 점검 조립 — 정기 작업 기대표 × job_run, 주간 원장 마감(FC-REQ-018).

판정은 `domain.ops_health`, 읽기 · 쓰기는 `store.ops`. 여기서는 둘을 잇기만 한다.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import Engine

from salt_forecast.domain.ops_health import (
    EXPECTATIONS,
    LEDGER_WINDOW_DAYS,
    Finding,
    check_daily_ledger,
    check_jobs,
    check_weekly_ledger,
)
from salt_forecast.scoring.target_weight_live import LIVE_START
from salt_forecast.store import ops

RETENTION = timedelta(days=90)


def hour_floor(at: datetime) -> datetime:
    d = at.astimezone(UTC)
    return d.replace(minute=0, second=0, microsecond=0)


def run_checks(engine: Engine, as_of: datetime) -> list[Finding]:
    states = ops.job_states(engine, [e.job for e in EXPECTATIONS], as_of)
    # 첫 발행일을 알아야 "시작 전"과 "빈 날"을 가른다 — 창보다 넉넉히 거슬러 읽는다
    since = (as_of - timedelta(days=LEDGER_WINDOW_DAYS * 4)).date()
    return [
        *check_jobs(states, as_of),
        check_weekly_ledger(ops.weekly_recorded(engine, as_of), as_of, LIVE_START),
        check_daily_ledger(ops.judgment_ledger_dates(engine, since, as_of), as_of),
    ]
