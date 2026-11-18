"""개인 재무 채점 저장 · 물가 통째 교체 — 실제 Postgres(FC-REQ-024 수용 기준 1 · 2).

forecast 표에 원 사용자 id · 금액 열이 없다 · 같은 실행 두 번 = 행 수 같음 · 원천에서 사라진 사본 지움(판정도) ·
판정은 처음 값을 지킨다 · 물가 시리즈는 기준이 바뀌면 통째로 바뀐다. 시험 행은 끝에 지운다.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import UTC, date, datetime

import pytest
from sqlalchemy import Engine, create_engine, text

from salt_forecast.config import Settings
from salt_forecast.domain.personal_projection import Verdict, landing_issuance, savings_issuance
from salt_forecast.store.personal_projection import load_verdicts, prune_missing, save_copies, save_verdicts
from salt_forecast.store.series import SeriesPoint, replace_series

pytestmark = [
    pytest.mark.db,
    pytest.mark.skipif(not os.environ.get("FORECAST_DATABASE_URL"), reason="FORECAST_DATABASE_URL 없음"),
]
NOW = datetime(2026, 11, 18, 3, tzinfo=UTC)
IDS = [
    "00000000-0000-4000-8000-0000000000a1",
    "00000000-0000-4000-8000-0000000000a2",
    "00000000-0000-4000-8000-0000000000b1",
]
SERIES = "test_cpi"


@pytest.fixture
def eng() -> Iterator[Engine]:
    e = create_engine(Settings().sqlalchemy_url())  # pyright: ignore[reportCallIssue]
    yield e
    with e.begin() as conn:
        drop = "DELETE FROM forecast.personal_projection WHERE issuance_id = ANY(CAST(:i AS uuid[]))"
        conn.execute(text(drop), {"i": IDS})
        conn.execute(text("DELETE FROM forecast.series_point WHERE source = 'ecos' AND series_id = :s"), {"s": SERIES})


def _issues():
    t = datetime(2026, 1, 5, tzinfo=UTC)
    return [
        savings_issuance(
            IDS[0], "h1", "g1", t, "empirical_quantile", date(2026, 6, 1), date(2026, 9, 1), None, 4, False
        ),
        savings_issuance(IDS[1], "h1", "g1", t, "plan_only", None, None, "history_short", 1, False),
        landing_issuance(IDS[2], "h2", date(2026, 1, 1), t, "empirical_window", None, 30, 27),
    ]


def _count(eng: Engine, table: str) -> int:
    with eng.connect() as conn:
        sql = f"SELECT count(*) FROM forecast.{table} WHERE issuance_id = ANY(CAST(:i AS uuid[]))"
        return int(conn.execute(text(sql), {"i": IDS}).scalar_one())


def test_no_raw_user_or_amount_columns(eng: Engine) -> None:
    with eng.connect() as conn:
        cols = {str(r[0]) for r in conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'forecast' "
            "AND table_name IN ('personal_projection', 'personal_projection_score')"))}  # fmt: skip
    assert not cols & {"user_id", "goal_id", "amount", "p_low", "p_high", "spent_so_far", "total", "actual"}
    assert "subject_hash" in cols


def test_idempotent_prune_and_first_verdict_kept(eng: Engine) -> None:
    issues = _issues()
    save_copies(eng, issues, NOW)
    save_copies(eng, issues, NOW)
    assert _count(eng, "personal_projection") == 3
    v = [Verdict(IDS[0], "hit", date(2026, 7, 1), True), Verdict(IDS[2], "miss_above", date(2026, 2, 8), True)]
    save_verdicts(eng, v, NOW)
    # 다시 판정이 와도 결과 · 판정일은 처음 값 — counted 만 바뀐다
    save_verdicts(eng, [Verdict(IDS[0], "miss_late", date(2026, 10, 1), False)], NOW)
    got = {x.issuance_id: x for x in load_verdicts(eng, date(2026, 12, 31)) if x.issuance_id in IDS}
    assert got[IDS[0]] == Verdict(IDS[0], "hit", date(2026, 7, 1), False)
    # as_of 앞의 판정만
    assert IDS[0] not in {x.issuance_id for x in load_verdicts(eng, date(2026, 6, 30))}
    # 원천에서 저축 발행 하나가 사라짐(계정 삭제) — 그 사본과 판정이 같이 지워지고 가계부는 그대로
    prune_missing(eng, "savings_reach", [IDS[1]])
    assert _count(eng, "personal_projection") == 2
    assert _count(eng, "personal_projection_score") == 1
    # 원천을 읽었는데 비었다(그 종류 계정이 전부 지워짐) — 그 종류 사본 전부, 다른 종류는 그대로
    prune_missing(eng, "savings_reach", [])
    assert _count(eng, "personal_projection") == 1


def test_coverage_view_counts_counted_recent(eng: Engine) -> None:
    save_copies(eng, _issues(), NOW)
    with eng.begin() as conn:
        conn.execute(text("SET LOCAL TIME ZONE 'UTC'"))
        save = (
            "INSERT INTO forecast.personal_projection_score VALUES (CAST(:i AS uuid), :o, current_date - 5, :c, now())"
        )
        conn.execute(text(save), {"i": IDS[2], "o": "hit", "c": True})
    with eng.connect() as conn:
        rows = conn.execute(text(
            "SELECT window_months, intervals >= 1, people >= 1, nominal FROM forecast.v_personal_coverage "
            "WHERE kind = 'household_landing' ORDER BY window_months")).all()  # fmt: skip
    assert [(r[0], r[1], r[2], r[3]) for r in rows] == [(3, True, True, 0.8), (6, True, True, 0.8)]


def test_replace_series_swaps_whole_base(eng: Engine) -> None:
    def pts(base: str, value: float) -> list[SeriesPoint]:
        return [SeriesPoint("ecos", SERIES, datetime(2020 + n, 1, 1, tzinfo=UTC), datetime(2020 + n, 2, 5, tzinfo=UTC),
                            value + n, base) for n in range(3)]  # fmt: skip

    replace_series(eng, "ecos", SERIES, pts("2020=100", 100.0), NOW)
    replace_series(eng, "ecos", SERIES, pts("2020=100", 100.0), NOW)
    replace_series(eng, "ecos", SERIES, pts("2025=100", 90.0)[:2], NOW)  # 기준 개편 — 옛 기준 3행이 남지 않는다
    with eng.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT unit, value FROM forecast.series_point WHERE source = 'ecos' AND series_id = :s "
                "ORDER BY observed_at"
            ),
            {"s": SERIES},
        ).all()
    assert [(r[0], r[1]) for r in rows] == [("2025=100", 90.0), ("2025=100", 91.0)]
    assert replace_series(eng, "ecos", SERIES, [], NOW) == 0  # 빈 목록은 아무것도 지우지 않는다
    with pytest.raises(ValueError):
        replace_series(eng, "ecos", SERIES, [SeriesPoint("ecos", "other", NOW, NOW, 1.0, "x")], NOW)
