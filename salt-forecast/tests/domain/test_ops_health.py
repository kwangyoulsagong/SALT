"""운영 점검 판정(FC-REQ-018) — 고정 시각 · DB 없음."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pytest

from salt_forecast.domain.ops_health import (
    EXPECTATIONS,
    JUDGMENT_LEDGER,
    WEEKLY_LEDGER,
    JobExpectation,
    JobState,
    check_daily_ledger,
    check_job,
    check_jobs,
    check_weekly_ledger,
    error_kind,
    is_healthy,
    last_monday,
)

NOW = datetime(2026, 10, 7, 2, 0, tzinfo=UTC)  # 수요일
DAILY = JobExpectation("volatility", "daily", timedelta(hours=26))
LIVE_START = datetime(2026, 10, 5, tzinfo=UTC)


def state(
    *,
    ok_h: float | None,
    last_h: float | None = None,
    last_ok: bool | None = True,
    error: str | None = None,
) -> JobState:
    """ok_h · last_h — 몇 시간 전(None 이면 없음). last_h 를 안 주면 마지막 실행 = 마지막 성공."""
    ok_at = NOW - timedelta(hours=ok_h) if ok_h is not None else None
    last_at = NOW - timedelta(hours=last_h) if last_h is not None else ok_at
    return JobState("volatility", ok_at, last_at, last_ok if last_h is not None else (True if ok_at else None), error)


def test_ok_overdue_never() -> None:
    assert check_job(DAILY, state(ok_h=20), NOW).status == "ok"
    overdue = check_job(DAILY, state(ok_h=30), NOW)
    assert overdue.status == "overdue"
    assert overdue.detail == "30.0h 전 성공 · 기준 26h"
    assert check_job(DAILY, None, NOW).status == "never"


def test_failure_after_last_success_wins_over_lateness() -> None:
    failed = check_job(DAILY, state(ok_h=30, last_h=1, last_ok=False, error="CheckViolation: row (secret)"), NOW)
    assert failed.status == "failed"
    # 오류 원문은 남기지 않는다 — 타입만
    assert failed.detail == "CheckViolation · 마지막 성공 30.0h 전"
    # 실패 뒤 다시 성공했으면 실패가 아니다
    recovered = JobState("volatility", NOW - timedelta(hours=1), NOW - timedelta(hours=1), True, None)
    assert check_job(DAILY, recovered, NOW).status == "ok"


def test_error_kind_keeps_type_only() -> None:
    assert error_kind("TypeError: Object of type date") == "TypeError"
    assert error_kind("interrupted") == "interrupted"
    assert error_kind(None) is None


def test_expectations_cover_daily_steps_once() -> None:
    jobs = [e.job for e in EXPECTATIONS]
    assert len(jobs) == len(set(jobs))
    assert {"news", "daily", "target_weight_live", "rule_ic"} <= set(jobs)
    findings = check_jobs({}, NOW)
    assert [f.status for f in findings] == ["never"] * len(EXPECTATIONS)
    assert not is_healthy(findings)


def test_last_monday_is_utc_midnight() -> None:
    assert last_monday(NOW) == datetime(2026, 10, 5, tzinfo=UTC)
    assert last_monday(datetime(2026, 10, 5, 0, 0, tzinfo=UTC)) == datetime(2026, 10, 5, tzinfo=UTC)
    assert last_monday(datetime(2026, 10, 4, 23, 59, tzinfo=UTC)) == datetime(2026, 9, 28, tzinfo=UTC)


@pytest.mark.parametrize(
    ("as_of", "recorded_after_h", "status"),
    [
        (datetime(2026, 10, 5, 12, tzinfo=UTC), None, "due"),  # 마감 전 — 지금 돌면 늦지 않는다
        (datetime(2026, 10, 6, 1, tzinfo=UTC), None, "missing"),
        (NOW, 26.5, "late"),  # 2026-10-05 실제 사건(t+26.5h)
        (NOW, 3.0, "ok"),
        (datetime(2026, 10, 4, tzinfo=UTC), None, "ok"),  # 라이브 시작 전
    ],
)
def test_weekly_ledger(as_of: datetime, recorded_after_h: float | None, status: str) -> None:
    monday = last_monday(as_of)
    recorded = {} if recorded_after_h is None else {monday: monday + timedelta(hours=recorded_after_h)}
    finding = check_weekly_ledger(recorded, as_of, LIVE_START)
    assert finding.subject == WEEKLY_LEDGER
    assert finding.status == status


def test_due_counts_as_healthy() -> None:
    due = check_weekly_ledger({}, datetime(2026, 10, 5, 12, tzinfo=UTC), LIVE_START)
    assert is_healthy([due])


def test_daily_ledger_gaps_since_first_publish() -> None:
    # 2026-10-07 실제 상태 — 09-27 시작, 10-01~10-05 서버가 꺼져 빈 날
    real = {date(2026, 9, d) for d in range(27, 31)} | {date(2026, 10, 6), date(2026, 10, 7)}
    finding = check_daily_ledger(real, NOW)
    assert finding.subject == JUDGMENT_LEDGER
    assert finding.status == "missing"
    assert finding.detail == "최근 7일 중 5일 없음(10-01, 10-02, 10-03, 10-04, 10-05)"
    # 오늘 몫은 아직 안 나왔어도 빈 날이 아니다 · 첫 발행 전은 세지 않는다
    assert check_daily_ledger({date(2026, 10, 5), date(2026, 10, 6)}, NOW).status == "ok"
    assert check_daily_ledger(set(), NOW).status == "never"
