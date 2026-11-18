"""개인 재무 구간 채점 읽기 · 쓰기 (FC-REQ-024 FR-1~5).

원천은 서비스 export 뷰 둘 — `savings.v_projection_outcome_export` ·
`household.v_landing_outcome_export`(Flyway, 서비스가 주인).
쓰기는 `forecast.personal_projection` · `personal_projection_score` 만. 사람 칸은 뷰가 준 해시 그대로, 금액 열 0.
원천에서 사라진 발행(계정 삭제)은 사본도 지운다 —
그 종류의 원천을 **읽는 데 성공했을 때만**(못 읽었다고 전부 지우지 않는다).
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from datetime import date, datetime

from sqlalchemy import Engine, delete, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from salt_forecast.domain.personal_projection import (
    Issuance,
    Kind,
    LandingPosition,
    LandingState,
    SavingsState,
    Verdict,
    landing_issuance,
    savings_issuance,
)
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.tables import personal_projection, personal_projection_score, scheduled_event

SAVINGS_SQL = text(
    "SELECT projection_id::text, subject_hash, goal_key, issued_at, method, early_month, late_month, reason, "
    "months_of_history, include_interest, reached_month, archived_month FROM savings.v_projection_outcome_export"
)
LANDING_SQL = text(
    "SELECT landing_id::text, subject_hash, target_month, issued_at, method, reason, days_of_history, days_left, "
    "final_on, outcome FROM household.v_landing_outcome_export"
)
_POSITIONS: dict[str, LandingPosition] = {"below": "below", "inside": "inside", "above": "above"}


def read_savings(engine: Engine) -> list[tuple[Issuance, SavingsState]]:
    with engine.connect() as conn:
        rows = conn.execute(SAVINGS_SQL).all()
    return [
        (
            savings_issuance(str(r[0]), str(r[1]), str(r[2]), r[3], str(r[4]), r[5], r[6], r[7], int(r[8]), bool(r[9])),
            SavingsState(r[10], r[11]),
        )
        for r in rows
    ]


def read_landings(engine: Engine) -> list[tuple[Issuance, LandingState]]:
    with engine.connect() as conn:
        rows = conn.execute(LANDING_SQL).all()
    out: list[tuple[Issuance, LandingState]] = []
    for r in rows:
        position = None if r[9] is None else _POSITIONS[str(r[9])]  # 모르는 값이면 KeyError — 뷰 계약이 바뀐 것
        out.append(
            (
                landing_issuance(str(r[0]), str(r[1]), r[2], r[3], str(r[4]), r[5], int(r[6]), int(r[7])),
                LandingState(r[8], position),
            )
        )
    return out


_COPY_COLS = (
    "issuance_id", "kind", "subject_hash", "series_key", "issued_at", "method", "reason", "history_n", "has_interval",
    "early_month", "late_month", "include_interest", "target_month", "days_left", "first_seen_at",
)  # fmt: skip


def save_copies(engine: Engine, issues: Iterable[Issuance], now: datetime) -> int:
    """발행은 불변이라 처음 본 행을 지킨다(first_seen_at 이 그대로). 반환: 넘긴 행 수."""
    rows = [
        (i.issuance_id, i.kind, i.subject_hash, i.series_key, i.issued_at, i.method, i.reason, i.history_n,
         i.has_interval, i.early_month, i.late_month, i.include_interest, i.target_month, i.days_left, now)
        for i in issues
    ]  # fmt: skip
    return bulk_upsert(engine, personal_projection, _COPY_COLS, rows, ("issuance_id",), keep_existing=True)


def prune_missing(engine: Engine, kind: Kind, live_ids: Sequence[str]) -> int:
    """원천 뷰에 없는 사본을 지운다(판정은 FK CASCADE). 원천을 읽은 뒤에만 부른다."""
    stmt = delete(personal_projection).where(personal_projection.c.kind == kind)
    if live_ids:
        stmt = stmt.where(personal_projection.c.issuance_id.not_in(list(live_ids)))
    with engine.begin() as conn:
        return conn.execute(stmt).rowcount


def save_verdicts(engine: Engine, verdicts: Sequence[Verdict], now: datetime) -> int:
    """닫힌 판정은 바뀌지 않는다 — 결과 · 판정일은 처음 값을 지킨다.

    counted 만 다시 쓴다(같은 달 늦은 발행이 생긴 경우).
    """
    if not verdicts:
        return 0
    rows = [
        {"issuance_id": v.issuance_id, "outcome": v.outcome, "decided_on": v.decided_on, "counted": v.counted,
         "scored_at": now}
        for v in verdicts
    ]  # fmt: skip
    stmt = pg_insert(personal_projection_score).values(rows)
    stmt = stmt.on_conflict_do_update(index_elements=["issuance_id"], set_={"counted": stmt.excluded.counted})
    with engine.begin() as conn:
        conn.execute(stmt)
    return len(rows)


def load_verdicts(engine: Engine, as_of: date) -> list[Verdict]:
    """as_of 까지 닫힌 판정 — 리포트 · 점검 집계용."""
    t = personal_projection_score
    stmt = select(t.c.issuance_id, t.c.outcome, t.c.decided_on, t.c.counted).where(t.c.decided_on <= as_of)
    with engine.connect() as conn:
        return [Verdict(str(r[0]), r[1], r[2], bool(r[3])) for r in conn.execute(stmt)]


def kr_cpi_releases(engine: Engine) -> list[datetime]:
    """국가데이터처 소비자물가동향 보도 시각(오름차순) — 물가 available_at 의 근거(domain/price_index)."""
    t = scheduled_event
    stmt = select(t.c.event_at).where(t.c.kind == "kr_cpi", t.c.symbol == "").order_by(t.c.event_at)
    with engine.connect() as conn:
        return [r[0] for r in conn.execute(stmt)]
