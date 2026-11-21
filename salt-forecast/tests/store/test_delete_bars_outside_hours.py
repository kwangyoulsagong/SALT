"""장 시간이 평상일과 다른 날의 장 밖 5분봉 정리(2026-11-21 수능일 동시호가 예상가 봉) — 실 DB.

시험 종목(`TEST-SHIFTED`)만 넣고 지운다. 실행 계획에 `price_bar` 전체 스캔이 없는지도 본다(10GB 표).
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import Engine, create_engine, text

from salt_forecast.config import Settings
from salt_forecast.store.prices import delete_bars_outside_hours

pytestmark = pytest.mark.db

SYM = "TEST-SHIFTED"
_KST = timedelta(hours=9)


@pytest.fixture
def engine() -> Iterator[Engine]:
    e = create_engine(Settings().sqlalchemy_url())  # pyright: ignore[reportCallIssue]

    def clean() -> None:
        with e.begin() as conn:
            conn.execute(text("DELETE FROM forecast.price_bar WHERE symbol = :s"), {"s": SYM})

    clean()
    yield e
    clean()
    e.dispose()


def _put(engine: Engine, d: date, hhmm: list[str]) -> None:
    with engine.begin() as conn:
        for t in hhmm:
            start = datetime(d.year, d.month, d.day, int(t[:2]), int(t[3:]), tzinfo=UTC) - _KST
            conn.execute(
                text(
                    "INSERT INTO forecast.price_bar (source, symbol, interval, open_time, close_time, available_at,"
                    " open, high, low, close, volume) VALUES ('kis', :s, '5m', :o, :c, :c, 1, 1, 1, 1, 1)"
                ),
                {"s": SYM, "o": start, "c": start + timedelta(minutes=5)},
            )


def _left(engine: Engine) -> list[str]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT to_char(open_time AT TIME ZONE 'Asia/Seoul', 'MM-DD HH24:MI') FROM forecast.price_bar"
                " WHERE symbol = :s ORDER BY open_time"
            ),
            {"s": SYM},
        ).all()
    return [str(r[0]) for r in rows]


def test_deletes_only_outside_that_days_hours(engine: Engine) -> None:
    csat, normal = date(2026, 11, 19), date(2026, 11, 18)
    _put(engine, csat, ["09:30", "09:35", "10:00", "16:25", "16:30"])
    _put(engine, normal, ["09:30", "15:25"])
    n = delete_bars_outside_hours(engine, "kis", "5m", [SYM], [(csat, 600, 990)])
    assert n == 3
    # 평상일은 넘기지 않았으니 그대로 · 수능일은 [10:00, 16:30) 만
    assert _left(engine) == ["11-18 09:30", "11-18 15:25", "11-19 10:00", "11-19 16:25"]


def test_no_days_is_noop(engine: Engine) -> None:
    _put(engine, date(2026, 11, 19), ["09:30"])
    assert delete_bars_outside_hours(engine, "kis", "5m", [SYM], []) == 0
    assert _left(engine) == ["11-19 09:30"]


def test_plan_has_no_full_scan(engine: Engine) -> None:
    sql = (
        "EXPLAIN DELETE FROM forecast.price_bar pb USING unnest(ARRAY['005930','000660']::text[],"
        " ARRAY['2026-11-19','2026-11-19']::date[], ARRAY[600,600], ARRAY[990,990])"
        " AS k(symbol, day, open_min, close_min)"
        " WHERE pb.source = 'kis' AND pb.interval = '5m' AND pb.symbol = k.symbol"
        " AND pb.open_time >= (k.day::timestamp AT TIME ZONE 'Asia/Seoul')"
        " AND pb.open_time < ((k.day + 1)::timestamp AT TIME ZONE 'Asia/Seoul')"
    )
    with engine.connect() as conn:
        plan = "\n".join(str(r[0]) for r in conn.execute(text(sql)).all())
    assert "Seq Scan on price_bar" not in plan, plan
