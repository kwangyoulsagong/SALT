"""advisory_lock 이 연결을 트랜잭션에 묶어 두지 않는다.

2026-11-10 — 8시간 idle in transaction 이 VACUUM 을 막았다. 실제 Postgres 가 필요하다.
"""

from __future__ import annotations

import os
import zlib

import pytest
from sqlalchemy import create_engine, text

from salt_forecast.config import Settings
from salt_forecast.store.runs import advisory_lock

pytestmark = pytest.mark.db


@pytest.mark.skipif(not os.environ.get("FORECAST_DATABASE_URL"), reason="FORECAST_DATABASE_URL 없음")
def test_lock_held_without_open_transaction() -> None:
    eng = create_engine(Settings().sqlalchemy_url())  # pyright: ignore[reportCallIssue]
    with advisory_lock(eng, "test_advisory_lock_txn") as got:
        assert got
        with eng.connect() as probe:
            rows = probe.execute(
                text(
                    "SELECT a.state FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid "
                    "WHERE l.locktype = 'advisory' AND l.objid = :k AND a.pid <> pg_backend_pid()"
                ),
                {"k": zlib.crc32(b"salt_forecast:test_advisory_lock_txn")},
            ).all()
        states = {str(r[0]) for r in rows}
        # 락은 잡혀 있고(행 있음), 그 연결은 트랜잭션 밖이다(idle in transaction 아님)
        assert states, "advisory lock 이 보이지 않는다"
        assert "idle in transaction" not in states, states
    # 끝나면 풀린다 — 다시 잡을 수 있다
    with advisory_lock(eng, "test_advisory_lock_txn") as again:
        assert again
