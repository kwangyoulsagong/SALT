"""종목마다 한 값(목록 · 최초 · 최신)은 표를 훑지 않는다 — 2026-11-17 장중 504 의 원인.

`latest_open` 이 `GROUP BY symbol` 로 업비트 5분봉(10GB) 을 통째로 읽어(한 번에 디스크 4.5GB · 붐빌 때 189초)
6분마다 DB 전체를 느리게 했다.
실 DB 에서 실행 계획에 `price_bar` 전체 스캔이 없는지, 결과가 GROUP BY 와 같은지 본다.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import pytest
from sqlalchemy import Engine, create_engine, event, text

from salt_forecast.config import Settings
from salt_forecast.store.prices import earliest_open, latest_open, symbols

pytestmark = pytest.mark.db


@pytest.fixture(scope="module")
def engine() -> Iterator[Engine]:
    e = create_engine(Settings().sqlalchemy_url())  # pyright: ignore[reportCallIssue]
    yield e
    e.dispose()


def _pairs(engine: Engine) -> list[tuple[str, str]]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT DISTINCT source, interval FROM forecast.price_bar"
                # 작은 출처만 — 큰 출처의 옛 쿼리는 이 시험이 막으려는 그 쿼리다
                " WHERE source IN ('kis', 'binance') LIMIT 4"
            )
        ).all()
    return [(str(r[0]), str(r[1])) for r in rows]


def test_same_as_group_by(engine: Engine) -> None:
    pairs = _pairs(engine)
    if not pairs:
        pytest.skip("price_bar 비어 있음")
    for source, interval in pairs:
        with engine.connect() as conn:
            old = conn.execute(
                text(
                    "SELECT symbol, min(open_time), max(open_time) FROM forecast.price_bar"
                    " WHERE source = :s AND interval = :i GROUP BY symbol"
                ),
                {"s": source, "i": interval},
            ).all()
        assert latest_open(engine, source, interval) == {str(r[0]): r[2] for r in old}
        assert earliest_open(engine, source, interval) == {str(r[0]): r[1] for r in old}
        assert symbols(engine, source, interval) == sorted(str(r[0]) for r in old)


def test_functions_send_no_full_scan_on_biggest_source(engine: Engine) -> None:
    """가장 큰 출처(업비트 5분봉)에서 세 함수가 **실제로 보낸 SQL** 의 실행 계획.
    옛 GROUP BY · DISTINCT 는 병렬 전체 스캔이었다"""
    sent: list[tuple[str, Any]] = []

    def capture(_conn: Any, _cursor: Any, statement: str, parameters: Any, _context: Any, _many: bool) -> None:
        if "price_bar" in statement and not statement.lstrip().upper().startswith("EXPLAIN"):
            sent.append((statement, parameters))

    event.listen(engine, "before_cursor_execute", capture)
    try:
        latest_open(engine, "upbit", "5m")
        earliest_open(engine, "upbit", "5m")
        symbols(engine, "upbit", "5m")
    finally:
        event.remove(engine, "before_cursor_execute", capture)
    assert len(sent) == 3
    with engine.connect() as conn:
        for statement, parameters in sent:
            plan = "\n".join(str(r[0]) for r in conn.exec_driver_sql("EXPLAIN " + statement, parameters).all())
            assert "Seq Scan on price_bar" not in plan, plan
