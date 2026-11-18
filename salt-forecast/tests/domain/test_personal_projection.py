"""개인 재무 구간 판정 — 경계 표(FC-REQ-024 수용 기준 2: 구간 끝 값 포함 · 기록 없음)."""

from __future__ import annotations

from datetime import UTC, date, datetime

import pytest

from salt_forecast.domain.personal_projection import (
    MIN_INTERVALS_FOR_CHECK,
    Coverage,
    LandingState,
    SavingsState,
    Verdict,
    counted_ids,
    coverage,
    coverage_checks,
    judge_landing,
    judge_savings,
    landing_issuance,
    savings_issuance,
    verdicts,
)

T0 = datetime(2026, 1, 10, 3, tzinfo=UTC)


def _sav(early: date | None = date(2026, 6, 1), late: date | None = date(2026, 9, 1), *, pid: str = "p1",
         goal: str = "g1", at: datetime = T0, method: str = "empirical_quantile"):  # fmt: skip
    return savings_issuance(pid, "h1", goal, at, method, early, late, None, 4, False)


@pytest.mark.parametrize(
    ("reached", "archived", "as_of", "want"),
    [
        (date(2026, 6, 1), None, date(2026, 6, 20), ("hit", date(2026, 6, 1))),  # 빠른 끝 달 — 포함
        (date(2026, 9, 1), None, date(2026, 9, 2), ("hit", date(2026, 9, 1))),  # 늦은 끝 달 — 포함
        (date(2026, 5, 1), None, date(2026, 5, 31), ("miss_early", date(2026, 5, 1))),
        (date(2026, 10, 1), None, date(2026, 10, 5), ("miss_late", date(2026, 10, 1))),
        (None, None, date(2026, 9, 30), None),  # 늦은 끝 달 안 — 아직
        (None, None, date(2026, 10, 1), ("miss_late", date(2026, 10, 1))),  # 늦은 끝 달이 지났다
        (None, date(2026, 8, 1), date(2026, 10, 1), ("excluded", date(2026, 8, 1))),  # 늦은 끝 전에 그만둠
        (None, date(2026, 9, 1), date(2026, 10, 1), ("excluded", date(2026, 9, 1))),  # 늦은 끝 달에 그만둠
        (None, date(2026, 11, 1), date(2026, 11, 2), ("miss_late", date(2026, 10, 1))),  # 이미 빗나간 뒤 보관
        (None, None, date(2026, 3, 1), None),
        (date(2026, 7, 1), None, date(2026, 6, 30), None),  # as_of 뒤의 도달은 모른다(재실행 재현)
    ],
)
def test_savings_boundaries(
    reached: date | None, archived: date | None, as_of: date, want: tuple[str, date] | None
) -> None:
    assert judge_savings(_sav(), SavingsState(reached, archived), as_of) == want


def test_open_late_side_judges_early_only() -> None:
    issue = _sav(late=None)
    assert judge_savings(issue, SavingsState(date(2030, 1, 1), None), date(2030, 1, 1)) == ("hit", date(2030, 1, 1))
    assert judge_savings(issue, SavingsState(date(2026, 2, 1), None), date(2026, 2, 1)) == (
        "miss_early",
        date(2026, 2, 1),
    )
    assert judge_savings(issue, SavingsState(None, None), date(2099, 1, 1)) is None


def test_plan_only_and_unreachable_are_not_scored() -> None:
    assert not _sav(method="plan_only").has_interval
    assert not _sav(early=None, late=None).has_interval  # not_reachable — 빠른 끝도 없음
    assert judge_savings(_sav(method="plan_only"), SavingsState(date(2026, 6, 1), None), date(2026, 7, 1)) is None


def _land(position: str | None, *, reason: str | None = None, final_on: date = date(2026, 2, 8)):
    issue = landing_issuance("l1", "h1", date(2026, 1, 1), T0, "empirical_window", reason, 30, 22)
    return issue, LandingState(final_on, position)  # pyright: ignore[reportArgumentType]


@pytest.mark.parametrize(
    ("position", "want"), [("inside", "hit"), ("below", "miss_below"), ("above", "miss_above"), (None, None)]
)
def test_landing_position_maps(position: str | None, want: str | None) -> None:
    issue, state = _land(position)
    got = judge_landing(issue, state, date(2026, 2, 8))
    assert (got[0] if got else None) == want
    if got:
        assert got[1] == date(2026, 2, 8)


def test_landing_not_before_final_and_not_without_interval() -> None:
    issue, state = _land("inside")
    assert judge_landing(issue, state, date(2026, 2, 7)) is None
    issue, state = _land("inside", reason="history_short")
    assert not issue.has_interval
    assert judge_landing(issue, state, date(2026, 3, 1)) is None


def test_counted_keeps_last_interval_per_goal_month() -> None:
    a = _sav(pid="a", at=datetime(2026, 1, 3, tzinfo=UTC))
    b = _sav(pid="b", at=datetime(2026, 1, 20, tzinfo=UTC))
    c = _sav(pid="c", at=datetime(2026, 1, 25, tzinfo=UTC), method="plan_only")  # 구간 없는 마지막은 고르지 않는다
    d = _sav(pid="d", at=datetime(2026, 2, 1, tzinfo=UTC))
    e = _sav(pid="e", goal="g2", at=datetime(2026, 1, 3, tzinfo=UTC))
    # KST 달 경계: 1월 31일 16:00 UTC = 2월 1일 01:00 KST — 2월 몫
    f = _sav(pid="f", goal="g3", at=datetime(2026, 1, 31, 16, tzinfo=UTC))
    g = _sav(pid="g", goal="g3", at=datetime(2026, 2, 2, tzinfo=UTC))
    assert counted_ids([a, b, c, d, e, f, g]) == {"b", "d", "e", "g"}


def test_verdicts_skip_missing_source_and_excluded_not_counted() -> None:
    a, b = _sav(pid="a", goal="g1"), _sav(pid="b", goal="g2")
    out = verdicts([a, b], {"a": SavingsState(None, date(2026, 3, 1))}, {}, date(2026, 4, 1))
    assert out == [Verdict("a", "excluded", date(2026, 3, 1), False)]


def test_coverage_window_and_people() -> None:
    issues = [_sav(pid=str(n), goal=f"g{n}") for n in range(4)]
    scored = [
        Verdict("0", "hit", date(2026, 6, 1), True),
        Verdict("1", "miss_late", date(2026, 5, 2), True),  # 6개월 안 · 3개월 경계 밖 — (as_of − 3개월, as_of]
        Verdict("2", "hit", date(2026, 5, 1), True),  # 정확히 3개월 전 — 3개월 창에서 빠진다
        Verdict("3", "hit", date(2026, 6, 1), False),  # counted 아님
    ]
    covs = {(c.kind, c.window_months): c for c in coverage(issues, scored, date(2026, 8, 1))}
    assert covs[("savings_reach", 3)] == Coverage("savings_reach", 3, 2, 1, 1)
    assert covs[("savings_reach", 6)] == Coverage("savings_reach", 6, 3, 2, 1)
    assert covs[("household_landing", 6)].intervals == 0


@pytest.mark.parametrize(
    ("intervals", "hits", "under"),
    [
        (MIN_INTERVALS_FOR_CHECK, 13, True),  # 65% < 70%
        (MIN_INTERVALS_FOR_CHECK, 14, False),  # 70% — 경계는 미달 아님
        (MIN_INTERVALS_FOR_CHECK - 1, 0, False),  # 표본 부족 — 판정하지 않는다
        (0, 0, False),
    ],
)
def test_under_nominal_check(intervals: int, hits: int, under: bool) -> None:
    checks = coverage_checks(
        [Coverage("household_landing", 6, intervals, hits, 3), Coverage("household_landing", 3, 1, 0, 1)]
    )
    assert [c.under_nominal for c in checks] == [under]
    assert checks[0].subject == "personal_coverage:household_landing"


def test_naive_and_inverted_inputs_rejected() -> None:
    with pytest.raises(ValueError):
        savings_issuance(
            "x",
            "h",
            "g",
            datetime(2026, 1, 1),  # noqa: DTZ001 — naive 를 거절하는지
            "empirical_quantile",
            date(2026, 1, 1),
            None,
            None,
            3,
            False,
        )
    with pytest.raises(ValueError):
        _sav(early=date(2026, 9, 1), late=date(2026, 6, 1))
