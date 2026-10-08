"""운영 점검 — 정기 작업이 제때 성공했나, 주간 원장 행이 제때 쓰였나(F010 슬라이스 7 · FC-REQ-018).

순수 함수만. 시각은 인자로 받는다(architecture.md §5). 읽기 · 쓰기는 `store.ops`, 조립은 `scoring.ops_monitor`.

왜 필요한가: 정기 작업은 서버 워커 · LaunchAgent 가 매시 `ops/daily.sh` 를 부를 때만 돈다. 맥이 꺼져 있거나 단계 하나가
실패하면 아무도 모른다 — 2026-10-05 월요일엔 아무것도 안 돌아 목표 비중 첫 주가 `late`(t+26.5h)가 됐고 `rule_ic` 는
월요일 조건 때문에 그 주를 건너뛰었다. 이 점검은 그런 상태를 `forecast.ops_check` 와 로그에 남긴다. 막지는 않는다.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Literal

Cadence = Literal["hourly", "daily", "weekly"]
Status = Literal["ok", "overdue", "failed", "never", "late", "missing", "due"]

HOUR = timedelta(hours=1)
DAY = timedelta(days=1)


@dataclass(frozen=True, slots=True)
class JobExpectation:
    job: str
    cadence: Cadence
    # 마지막 성공이 이보다 오래되면 `overdue` — 주기 + 여유(트리거가 매시라 한 시간 + 실행 시간)
    max_age: timedelta


# ops/daily.sh 가 부르는 정기 작업. 수동 작업(백테스트 · 사전등록 실행)은 주기가 없어 넣지 않는다.
# 일 작업은 20시간 게이트 + 매시 트리거 → 정상이면 마지막 성공이 21시간 안이다. 26시간 = 하루 + 여유
EXPECTATIONS: tuple[JobExpectation, ...] = (
    JobExpectation("news", "hourly", 3 * HOUR),
    *(
        JobExpectation(job, "daily", 26 * HOUR)
        for job in (
            "ingest_prices",
            "ingest_market",
            "backfill_whale",
            "daily",
            "ingest_kr_stock",
            "kr_daily",
            "events",
            "signals",
            "volatility",
            "market_regime",
            "target_weight_live",
        )
    ),
    # 주 1회 — 6.5일이 지나면 다음 실행이 돈다(daily.sh). 8일 넘게 성공이 없으면 한 주를 건너뛴 것이다
    JobExpectation("rule_ic", "weekly", 8 * DAY),
)


@dataclass(frozen=True, slots=True)
class JobState:
    """작업 하나의 최근 기록 — `forecast.job_run` 에서 읽는다."""

    job: str
    last_ok_at: datetime | None
    # 마지막으로 **끝난** 실행. 도는 중인 것은 보지 않는다
    last_finished_at: datetime | None
    last_finished_ok: bool | None
    last_error: str | None


@dataclass(frozen=True, slots=True)
class Finding:
    subject: str
    status: Status
    last_ok_at: datetime | None
    detail: str | None


def error_kind(error: str | None) -> str | None:
    """`"{Type}: {msg}"` 에서 타입만 — 메시지에는 응답 원문이 섞일 수 있다(security-sources.md)."""
    if not error:
        return None
    return error.split(":", 1)[0].strip()[:80] or None


def _age_hours(as_of: datetime, at: datetime) -> float:
    return round((as_of - at).total_seconds() / 3600, 1)


def check_job(expect: JobExpectation, state: JobState | None, as_of: datetime) -> Finding:
    """실패가 지연보다 먼저다 — 실패한 작업은 원인을 봐야 하고, 지연은 트리거를 봐야 한다."""
    if state is None:
        return Finding(expect.job, "never", None, None)
    last_ok = state.last_ok_at
    failed_last = (
        state.last_finished_ok is False
        and state.last_finished_at is not None
        and (last_ok is None or state.last_finished_at > last_ok)
    )
    if failed_last:
        kind = error_kind(state.last_error) or "error"
        age = f" · 마지막 성공 {_age_hours(as_of, last_ok)}h 전" if last_ok else ""
        return Finding(expect.job, "failed", last_ok, f"{kind}{age}")
    if last_ok is None:
        return Finding(expect.job, "never", None, None)
    if as_of - last_ok > expect.max_age:
        return Finding(
            expect.job,
            "overdue",
            last_ok,
            f"{_age_hours(as_of, last_ok)}h 전 성공 · 기준 {expect.max_age.total_seconds() / 3600:g}h",
        )
    return Finding(expect.job, "ok", last_ok, None)


def check_jobs(
    states: Mapping[str, JobState], as_of: datetime, expectations: Iterable[JobExpectation] = EXPECTATIONS
) -> list[Finding]:
    return [check_job(e, states.get(e.job), as_of) for e in expectations]


# ── 주간 원장 ─────────────────────────────────────────────

WEEKLY_LEDGER = "ledger:target_weight_live"
# store 와 같은 값 — scoring.target_weight_live.LATE_AFTER(24h) · LIVE_START. domain 은 scoring 을 import 하지 않는다
WEEKLY_LATE_AFTER = 24 * HOUR


def last_monday(as_of: datetime) -> datetime:
    """as_of 이전(같거나) 마지막 월요일 00:00 UTC — 리밸런스 봉 마감 시각."""
    d = as_of.astimezone(UTC)
    start = datetime(d.year, d.month, d.day, tzinfo=UTC)
    return start - timedelta(days=start.weekday())


def check_weekly_ledger(recorded: Mapping[datetime, datetime], as_of: datetime, live_start: datetime) -> Finding:
    """가장 최근 월요일 리밸런스 비중이 마감(+24h) 안에 쓰였나.

    `recorded` — rebalance_at → 가장 이른 recorded_at. `late` 는 원장 정의(t+24h 뒤 기록 = 성적 제외)와 같다.
    마감 전인데 아직 없으면 `due` — 지금 돌면 늦지 않는다.
    """
    rebalance = last_monday(as_of)
    if rebalance < live_start:
        return Finding(WEEKLY_LEDGER, "ok", None, "라이브 시작 전")
    deadline = rebalance + WEEKLY_LATE_AFTER
    at = recorded.get(rebalance)
    label = rebalance.date().isoformat()
    if at is None:
        if as_of <= deadline:
            return Finding(WEEKLY_LEDGER, "due", None, f"{label} 비중 아직 없음 · 마감 {deadline.isoformat()}")
        return Finding(WEEKLY_LEDGER, "missing", None, f"{label} 비중 없음 · 마감 {_age_hours(as_of, deadline)}h 지남")
    if at > deadline:
        return Finding(WEEKLY_LEDGER, "late", at, f"{label} 비중 t+{_age_hours(at, rebalance)}h 기록 — 성적 제외")
    return Finding(WEEKLY_LEDGER, "ok", at, None)


# ── 매일 원장(서버 발행) ──────────────────────────────────

JUDGMENT_LEDGER = "ledger:judgment_ledger"
LEDGER_WINDOW_DAYS = 7


def check_daily_ledger(dates: Iterable[date], as_of: datetime, window_days: int = LEDGER_WINDOW_DAYS) -> Finding:
    """서버가 매일 발행하는 판단 원장(`public.judgment_ledger`, 라이브 IC 2026-11-23 의 표본)에 빈 날이 있나.

    어제까지 최근 `window_days` 일만 본다(오늘 몫은 아직 안 나왔을 수 있다). 첫 발행일 전은 세지 않는다.
    빈 날은 되살릴 수 없다 — 원장은 그날 재료로만 쓴다. 남기는 이유는 표본이 몇 주 모자라는지 알기 위해서다.
    """
    have = set(dates)
    if not have:
        return Finding(JUDGMENT_LEDGER, "never", None, None)
    first = min(have)
    today = as_of.astimezone(UTC).date()
    expected = [today - timedelta(days=k) for k in range(1, window_days + 1)]
    missing = sorted(d for d in expected if d >= first and d not in have)
    latest = max(have)
    last_at = datetime(latest.year, latest.month, latest.day, tzinfo=UTC)
    if missing:
        days = ", ".join(d.isoformat()[5:] for d in missing)
        return Finding(JUDGMENT_LEDGER, "missing", last_at, f"최근 {window_days}일 중 {len(missing)}일 없음({days})")
    return Finding(JUDGMENT_LEDGER, "ok", last_at, None)


def is_healthy(findings: Iterable[Finding]) -> bool:
    return all(f.status in ("ok", "due") for f in findings)
