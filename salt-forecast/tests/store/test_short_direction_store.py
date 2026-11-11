"""단타 방향 확률 저장 — 시험 행 · 통과 칸 읽기 · 예측 · 채점 한 줄 · 뷰 renderable.

FC-REQ-028 FR-1 · FR-4 · DB-REQ-043 FR-2.

실제 Postgres 가 필요하다. 테스트 전용 키 · 심볼 · 2000년 시각으로 쓰고 끝에 지운다(서버 뷰의 '최신'을 가로채지 않게).
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import Engine, create_engine, text

from salt_forecast.config import Settings
from salt_forecast.store.short_direction import (
    CellTestRow,
    PredictionRow,
    active_cells,
    live_outcomes,
    save_predictions,
    save_test,
    score_due,
)

pytestmark = pytest.mark.db
KEY = "test-short-direction@0"
SYM = "KRW-TESTSD"
MV = "test-short-direction@0+abc"
T0 = datetime(2000, 1, 3, 1, tzinfo=UTC)


@pytest.fixture
def eng() -> Iterator[Engine]:
    e = create_engine(Settings().sqlalchemy_url())  # pyright: ignore[reportCallIssue]
    yield e
    with e.begin() as conn:
        conn.execute(text("DELETE FROM forecast.short_horizon_outcome WHERE symbol = :s"), {"s": SYM})
        conn.execute(text("DELETE FROM forecast.short_horizon_prediction WHERE symbol = :s"), {"s": SYM})
        conn.execute(text("DELETE FROM forecast.short_horizon_test WHERE prereg_key = :k"), {"k": KEY})
        conn.execute(text("DELETE FROM forecast.price_bar WHERE symbol = :s"), {"s": SYM})


def _row(status: str, reason: str | None) -> CellTestRow:
    return CellTestRow(
        "crypto", "1h", status, reason, (int(T0.timestamp()), int(T0.timestamp())), 10, 0.01, 0.001, 0.02, 0.01,
        0.005, 0.02, "backtest", 400, 230, 200, 0.01, 0.1, 0.0001, -0.01, 0.01, [[1, 0.5, 0.5]],
        [{"asOf": T0.isoformat(), "symbol": SYM, "pUp": 0.6, "realized": -0.01}], {"high": [-1.0, 0.1, 1.2]},
        {"median": [0.0], "mean": [0.0], "std": [1.0], "coef": [0.1], "base": 0.5, "beta": None},
    )  # fmt: skip


@pytest.mark.skipif(not os.environ.get("FORECAST_DATABASE_URL"), reason="FORECAST_DATABASE_URL 없음")
def test_active_cells_reads_latest_only(eng: Engine) -> None:
    save_test(eng, KEY, MV, T0, [_row("pass", None)], T0)
    save_test(eng, KEY, MV, T0, [_row("pass", None)], T0)  # 같은 as_of 재실행 = 행 수 같음
    assert len(active_cells(eng, KEY, T0)) == 1
    save_test(eng, KEY, MV, T0 + timedelta(days=1), [_row("fail", "no_skill")], T0)
    assert active_cells(eng, KEY, T0 + timedelta(days=1)) == []  # 최신이 fail 이면 예측 입력 0
    assert len(active_cells(eng, KEY, T0)) == 1  # 과거 as_of 로 돌리면 그때 결과(재현)
    with eng.connect() as conn:
        n = conn.execute(text("SELECT count(*) FROM forecast.short_horizon_test WHERE prereg_key = :k"), {"k": KEY})
        assert n.scalar_one() == 2


@pytest.mark.skipif(not os.environ.get("FORECAST_DATABASE_URL"), reason="FORECAST_DATABASE_URL 없음")
def test_prediction_scored_once_at_expiry_bar(eng: Engine) -> None:
    exp = T0 + timedelta(hours=1)
    p = PredictionRow(SYM, "1h", T0, MV, "crypto", 0.61, -0.008, 0.002, 0.019, 100.0, 99.2, exp, 0.43)
    save_predictions(eng, KEY, [p], T0)
    assert score_due(eng, exp + timedelta(minutes=5)) == 0  # 끝 봉이 아직 없다 — 다음 실행에
    with eng.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO forecast.price_bar (source, symbol, interval, open_time, close_time, available_at,"
                " open, high, low, close) VALUES ('upbit', :s, '1h', :o, :a, :a, 100, 103, 99, 102)"
            ),
            {"s": SYM, "o": T0, "a": exp},
        )
    assert score_due(eng, exp + timedelta(minutes=5)) == 1
    assert score_due(eng, exp + timedelta(minutes=6)) == 0  # 한 줄 = 결과 한 줄
    out = live_outcomes(eng, "crypto", "1h", KEY)
    assert len(out) == 1 and out[0].realized > 0 and out[0].p_ref == pytest.approx(0.43)
    with eng.connect() as conn:
        r = conn.execute(
            text("SELECT renderable, blocked_reason FROM forecast.v_short_horizon_card WHERE symbol = :s"), {"s": SYM}
        ).one()
    assert r[0] is False  # 만료된 예측(2000년)은 화면에 내지 않는다
