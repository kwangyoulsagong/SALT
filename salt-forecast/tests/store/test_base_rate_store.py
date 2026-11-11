"""기저율 저장 — 같은 as_of 재실행은 행 수가 같고, 이번에 성립 안 하는 옛 문턱은 남지 않는다. 뷰는 최신 실행만.

실제 Postgres 가 필요하다. 테스트 전용 사전등록 키로 쓰고 끝에 지운다.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import UTC, date, datetime

import pytest
from sqlalchemy import Engine, create_engine, text

from salt_forecast.config import Settings
from salt_forecast.domain.base_rate import Stat, StatRow, Trigger, Verdict
from salt_forecast.store.base_rate import save_run

pytestmark = pytest.mark.db
KEY = "test-base-rate@0"


@pytest.fixture
def eng() -> Iterator[Engine]:
    e = create_engine(Settings().sqlalchemy_url())  # pyright: ignore[reportCallIssue]
    yield e
    with e.begin() as conn:
        conn.execute(text("DELETE FROM forecast.base_rate_trigger WHERE prereg_key = :k"), {"k": KEY})
        conn.execute(text("DELETE FROM forecast.base_rate_stat WHERE prereg_key = :k"), {"k": KEY})


def _stat() -> StatRow:
    s = Stat("ok", 500, 300.0, 120, 0.55, 0.5, 0.6, 0.001, -0.03, 0.0, 0.04, 0.57, -0.03, 0.0, 0.04, False)
    return StatRow("crypto", "C1", 1, "test", s, Verdict(0.54, 0.2, None))


def _count(eng: Engine, sql: str) -> int:
    with eng.connect() as conn:
        return int(conn.execute(text(sql), {"k": KEY}).scalar_one())


@pytest.mark.skipif(not os.environ.get("FORECAST_DATABASE_URL"), reason="FORECAST_DATABASE_URL 없음")
def test_rerun_same_as_of_replaces_triggers(eng: Engine) -> None:
    as_of = datetime(2026, 11, 11, tzinfo=UTC)
    win = (date(2020, 1, 1), date(2026, 11, 10))
    ref = int(datetime(2026, 11, 10, tzinfo=UTC).timestamp())
    two = [Trigger("crypto", "KRW-AAA", "C1", 100.0, ref, price_at_least=105.5),
           Trigger("crypto", "KRW-BBB", "C1", 0.00012345, ref, price_at_least=0.000130001)]  # fmt: skip
    save_run(eng, KEY, as_of, as_of, "crypto", win, [_stat()], two)
    save_run(eng, KEY, as_of, as_of, "crypto", win, [_stat()], two)
    assert _count(eng, "SELECT count(*) FROM forecast.base_rate_trigger WHERE prereg_key = :k") == 2
    assert _count(eng, "SELECT count(*) FROM forecast.base_rate_stat WHERE prereg_key = :k") == 1
    # 다음 실행에선 BBB 조건이 끝났다 — 같은 as_of 다시 쓰면 BBB 문턱이 없어야 한다
    save_run(eng, KEY, as_of, as_of, "crypto", win, [_stat()], two[:1])
    assert _count(eng, "SELECT count(*) FROM forecast.base_rate_trigger WHERE prereg_key = :k") == 1
    # 소수 가격이 잘리지 않는다
    with eng.connect() as conn:
        v = conn.execute(
            text("SELECT price_at_least FROM forecast.base_rate_trigger WHERE prereg_key = :k AND symbol = 'KRW-AAA'"),
            {"k": KEY},
        ).scalar_one()
    assert float(v) == pytest.approx(105.5)


@pytest.mark.skipif(not os.environ.get("FORECAST_DATABASE_URL"), reason="FORECAST_DATABASE_URL 없음")
def test_view_returns_only_latest_run_triggers(eng: Engine) -> None:
    win = (date(2020, 1, 1), date(2026, 11, 10))
    old, new = datetime(2026, 11, 10, tzinfo=UTC), datetime(2026, 11, 11, tzinfo=UTC)
    ref = int(old.timestamp())
    save_run(
        eng, KEY, old, old, "crypto", win, [_stat()], [Trigger("crypto", "KRW-OLD", "C1", 1.0, ref, price_at_least=2.0)]
    )
    save_run(
        eng, KEY, new, new, "crypto", win, [_stat()], [Trigger("crypto", "KRW-NEW", "C1", 1.0, ref, price_at_least=2.0)]
    )
    with eng.connect() as conn:
        syms = {str(r[0]) for r in conn.execute(
            text("SELECT symbol FROM forecast.v_base_rate_trigger WHERE prereg_key = :k"), {"k": KEY})}  # fmt: skip
    assert syms == {"KRW-NEW"}  # 종목별 최신으로 고르면 KRW-OLD 가 끌려온다
