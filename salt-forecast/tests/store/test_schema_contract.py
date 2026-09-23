"""DB 컬럼 ↔ Python 선언 대조(db-contract.md §2). 실제 Postgres 가 필요하다."""

from __future__ import annotations

import os

import pytest
from sqlalchemy import create_engine, text

from salt_forecast.config import Settings
from salt_forecast.store.tables import metadata

pytestmark = pytest.mark.db


@pytest.mark.skipif(not os.environ.get("FORECAST_DATABASE_URL"), reason="FORECAST_DATABASE_URL 없음")
def test_declared_columns_exist_in_db() -> None:
    eng = create_engine(Settings().sqlalchemy_url())  # pyright: ignore[reportCallIssue]
    with eng.connect() as conn:
        rows = conn.execute(
            text("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'forecast'")
        ).all()
    db = {(str(t), str(c)) for t, c in rows}
    declared = {(t.name, c.name) for t in metadata.tables.values() for c in t.columns}
    assert declared <= db, sorted(declared - db)
    for table in {t for t, _ in declared}:
        assert {c for t, c in db if t == table} == {c for t, c in declared if t == table}, table
