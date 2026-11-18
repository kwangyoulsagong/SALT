"""개인 재무 구간 채점 O4 — 저축 도달 · 가계부 착지 구간이 맞았나 (FC-REQ-024 FR-1~5 · 7).

계산은 도메인 서비스(savings · household)가 했고, 여기는 **판정 · 집계만** 한다(`ADR-007` §3). I/O · 지금 시각 0.
원천은 서비스 export 뷰 — 사람은 해시뿐, 금액 0(가계부 실제 값은 뷰가 below · inside · above 로만 준다).

판정이 닫히는 때(루트 `MONEY-O4-personal-projection-scoring-slice.md` 판단 4):
- 저축: 도달 달 R 이 생기면 R 로 판정(빠른 끝 전이면 miss_early · 늦은 끝 뒤면 miss_late). 도달 없이 늦은 끝 달이 지나면
  miss_late(판정일 = 늦은 끝 다음 달 1일). 도달 없이 보관되면 excluded. 늦은 끝이 없으면(열림) 빠른 끝만 본다
- 가계부: 뷰가 그 달 말일 + 7일 뒤 낸 outcome 그대로. 판정일 = 뷰의 final_on

커버리지는 판정이 닫힌 날 기준 최근 N개월, 명목 80%(10~90% 분위 구간). 저축은 목표 · 달마다 마지막 발행만 센다 —
적립마다 발행해 같은 말을 여러 번 세면 한 사람이 표본을 부풀린다(판단 5).
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")
NOMINAL_PCT = 80
NOMINAL = NOMINAL_PCT / 100
WINDOWS = (3, 6)
# FR-7 — 커버리지가 명목보다 이만큼(%p) 낮으면 운영 점검에 남긴다. 표본이 이보다 적으면 판정하지 않는다(우연 폭이 크다).
# 정수 비교 — 0.8 − 0.1 은 0.7000…01 이라 정확히 70% 가 미달로 잡혔다(경계 시험)
UNDER_NOMINAL_MARGIN_PCT = 10
MIN_INTERVALS_FOR_CHECK = 20

Kind = Literal["savings_reach", "household_landing"]
Outcome = Literal["hit", "miss_early", "miss_late", "miss_below", "miss_above", "excluded"]
LandingPosition = Literal["below", "inside", "above"]


def _first(d: date) -> date:
    return d.replace(day=1)


def _next_month(d: date) -> date:
    return date(d.year + d.month // 12, d.month % 12 + 1, 1)


def _months_ago(d: date, months: int) -> date:
    y, m = divmod(d.year * 12 + d.month - 1 - months, 12)
    m += 1
    last = (_next_month(date(y, m, 1)) - date(y, m, 1)).days
    return date(y, m, min(d.day, last))


def kst_date(t: datetime) -> date:
    if t.tzinfo is None:
        raise ValueError("naive datetime")
    return t.astimezone(KST).date()


@dataclass(frozen=True, slots=True)
class Issuance:
    """발행 사본 한 줄(`forecast.personal_projection`) — 원천 뷰 한 행에서 판정에 필요한 것만."""

    issuance_id: str
    kind: Kind
    subject_hash: str
    series_key: str
    issued_at: datetime
    method: str
    reason: str | None
    history_n: int
    has_interval: bool
    early_month: date | None = None
    late_month: date | None = None
    include_interest: bool | None = None
    target_month: date | None = None
    days_left: int | None = None

    def __post_init__(self) -> None:
        if self.issued_at.tzinfo is None:
            raise ValueError("naive issued_at")
        if self.has_interval and self.kind == "savings_reach" and self.early_month is None:
            raise ValueError("저축 구간에 빠른 끝이 없다")
        if self.early_month and self.late_month and self.late_month < self.early_month:
            raise ValueError("늦은 끝이 빠른 끝보다 앞")


@dataclass(frozen=True, slots=True)
class SavingsState:
    """목표가 지금까지 한 일 — 도달 달 · 보관 달(그 달 1일, KST)."""

    reached_month: date | None
    archived_month: date | None


@dataclass(frozen=True, slots=True)
class LandingState:
    """가계부 뷰의 판정 — position 은 final_on 이 지났을 때만 있다."""

    final_on: date
    position: LandingPosition | None


@dataclass(frozen=True, slots=True)
class Verdict:
    issuance_id: str
    outcome: Outcome
    decided_on: date
    counted: bool


def savings_issuance(
    projection_id: str,
    subject_hash: str,
    goal_key: str,
    issued_at: datetime,
    method: str,
    early_month: date | None,
    late_month: date | None,
    reason: str | None,
    months_of_history: int,
    include_interest: bool,
) -> Issuance:
    """구간 = 경험 분위수 + 빠른 끝. 계획만(plan_only) · 빠른 끝도 없음(not_reachable)은 채점 대상이 아니다."""
    has = method == "empirical_quantile" and early_month is not None
    return Issuance(
        projection_id, "savings_reach", subject_hash, goal_key, issued_at, method, reason, months_of_history, has,
        early_month=_first(early_month) if early_month else None,
        late_month=_first(late_month) if late_month else None,
        include_interest=include_interest,
    )  # fmt: skip


def landing_issuance(
    landing_id: str,
    subject_hash: str,
    target_month: date,
    issued_at: datetime,
    method: str,
    reason: str | None,
    days_of_history: int,
    days_left: int,
) -> Issuance:
    """구간이 없으면 reason(history_short)이 있다 — `LandingEngine.project` 와 같은 규칙."""
    has = method == "empirical_window" and reason is None
    month = _first(target_month)
    return Issuance(
        landing_id, "household_landing", subject_hash, f"{subject_hash}:{month.isoformat()}", issued_at, method, reason,
        days_of_history, has, target_month=month, days_left=days_left,
    )  # fmt: skip


def judge_savings(issue: Issuance, state: SavingsState, as_of: date) -> tuple[Outcome, date] | None:
    """닫혔으면 (결과, 판정일), 아직이면 None. as_of 보다 뒤에 생긴 일은 보지 않는다(재실행 재현)."""
    if not issue.has_interval or issue.early_month is None:
        return None
    month_now = _first(as_of)
    reached = state.reached_month if state.reached_month and state.reached_month <= month_now else None
    if reached is not None:
        if reached < issue.early_month:
            return "miss_early", reached
        if issue.late_month is not None and reached > issue.late_month:
            return "miss_late", reached
        return "hit", reached
    archived = state.archived_month if state.archived_month and state.archived_month <= month_now else None
    # 늦은 끝 달 안에(또는 전에) 보관 = 그만둔 목표 — 구간이 틀린 게 아니라 질문이 없어졌다.
    # 늦은 끝이 지난 뒤 보관이면 이미 빗나갔다
    if (
        issue.late_month is not None
        and month_now > issue.late_month
        and (archived is None or archived > issue.late_month)
    ):
        return "miss_late", _next_month(issue.late_month)
    if archived is not None:
        return "excluded", archived
    return None


def judge_landing(issue: Issuance, state: LandingState, as_of: date) -> tuple[Outcome, date] | None:
    if not issue.has_interval or state.position is None or state.final_on > as_of:
        return None
    outcome: Outcome = {"below": "miss_below", "inside": "hit", "above": "miss_above"}[state.position]  # pyright: ignore[reportAssignmentType]
    return outcome, state.final_on


def counted_ids(issues: Iterable[Issuance]) -> set[str]:
    """커버리지에 세는 발행 — 저축은 (목표, 발행 달)마다 구간 있는 마지막 하나, 가계부는 구간 있는 전부."""
    last: dict[tuple[str, date], Issuance] = {}
    out: set[str] = set()
    for i in issues:
        if not i.has_interval:
            continue
        if i.kind == "household_landing":
            out.add(i.issuance_id)
            continue
        key = (i.series_key, _first(kst_date(i.issued_at)))
        prev = last.get(key)
        if prev is None or (i.issued_at, i.issuance_id) > (prev.issued_at, prev.issuance_id):
            last[key] = i
    out.update(i.issuance_id for i in last.values())
    return out


def verdicts(
    issues: Sequence[Issuance],
    savings: dict[str, SavingsState],
    landings: dict[str, LandingState],
    as_of: date,
) -> list[Verdict]:
    """닫힌 판정만. 원천 상태가 없는 발행(뷰에서 사라짐)은 판정하지 않는다 — 지우기는 store 몫."""
    counted = counted_ids(issues)
    out: list[Verdict] = []
    for i in issues:
        if i.kind == "savings_reach":
            s = savings.get(i.issuance_id)
            judged = judge_savings(i, s, as_of) if s else None
        else:
            ls = landings.get(i.issuance_id)
            judged = judge_landing(i, ls, as_of) if ls else None
        if judged is None:
            continue
        outcome, decided = judged
        out.append(Verdict(i.issuance_id, outcome, decided, i.issuance_id in counted and outcome != "excluded"))
    return out


@dataclass(frozen=True, slots=True)
class Coverage:
    kind: Kind
    window_months: int
    intervals: int
    hits: int
    people: int

    @property
    def rate(self) -> float | None:
        return self.hits / self.intervals if self.intervals else None


def coverage(issues: Sequence[Issuance], scored: Sequence[Verdict], as_of: date) -> list[Coverage]:
    """`forecast.v_personal_coverage` 와 같은 식 — 판정일이 (as_of − N개월, as_of] 안, counted 만. 리포트 · 점검용."""
    by_id = {i.issuance_id: i for i in issues}
    out: list[Coverage] = []
    for kind in ("savings_reach", "household_landing"):
        for months in WINDOWS:
            since = _months_ago(as_of, months)
            rows = [
                (v, by_id[v.issuance_id])
                for v in scored
                if v.counted and v.issuance_id in by_id and by_id[v.issuance_id].kind == kind
                and since < v.decided_on <= as_of
            ]  # fmt: skip
            out.append(
                Coverage(
                    kind,  # pyright: ignore[reportArgumentType]
                    months,
                    len(rows),
                    sum(1 for v, _ in rows if v.outcome == "hit"),
                    len({i.subject_hash for _, i in rows}),
                )
            )
    return out


@dataclass(frozen=True, slots=True)
class CoverageCheck:
    subject: str
    under_nominal: bool
    detail: str


def coverage_checks(covs: Sequence[Coverage]) -> list[CoverageCheck]:
    """FR-7 — 6개월 창에서 표본이 충분한데 명목보다 10%p 넘게 낮으면 구간 방법 개선 신호. 집계만(사람별 0)."""
    out: list[CoverageCheck] = []
    for c in covs:
        if c.window_months != max(WINDOWS):
            continue
        rate = c.rate
        floor = NOMINAL_PCT - UNDER_NOMINAL_MARGIN_PCT
        under = c.intervals >= MIN_INTERVALS_FOR_CHECK and c.hits * 100 < floor * c.intervals
        shown = "—" if rate is None else f"{rate:.0%}"
        out.append(
            CoverageCheck(
                f"personal_coverage:{c.kind}",
                under,
                f"{c.window_months}개월 {c.hits}/{c.intervals}({shown}) · 사람 {c.people} · 명목 {NOMINAL:.0%}",
            )
        )
    return out
