"""온톨로지 네 층 읽기 · 쓰기(FC-REQ-022 FR-1~6 · 13 · 14 · F017 v4 순서 5b). 서버는 아직 읽지 않는다.

읽기 원천: `public.kr_stock_master`(직접 읽기 목록 — `DB-REQ-036` FR-3 그대로) · `forecast.price_bar` ·
서버 원인 스냅샷 export 뷰 `public.v_cause_snapshot_export`(DB-REQ-043 FR-8).
"""

from __future__ import annotations

import json
import math
from collections.abc import Sequence
from datetime import UTC, date, datetime
from typing import Any, cast

from sqlalchemy import Engine, text

from salt_forecast.domain.ontology import (
    CandidateRow,
    EntityRow,
    EvidenceRow,
    FactRow,
    MasterRow,
    OpenRelation,
    OutcomeRow,
    Predicate,
    RelationRow,
    Snapshot,
)
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.jsonb import dumps
from salt_forecast.store.tables import cause_candidate, entity, evidence, fact, outcome, relation


def _utc(t: datetime) -> datetime:
    return t if t.tzinfo else t.replace(tzinfo=UTC)


def load_master(engine: Engine) -> list[MasterRow]:
    """살아 있는 국내 종목 — synced_at 은 Prisma 기본(UTC 값 · tz 없음)."""
    sql = text("SELECT code, name, sector_mid_code, synced_at FROM public.kr_stock_master WHERE delisted_at IS NULL")
    with engine.connect() as conn:
        rows = conn.execute(sql).all()
    return [MasterRow(str(c), str(n), None if s is None else str(s), _utc(t)) for c, n, s, t in rows]


def load_crypto_symbols(engine: Engine) -> list[str]:
    sql = text(
        "SELECT DISTINCT symbol FROM forecast.price_bar WHERE source = 'upbit' AND interval = '1d' ORDER BY symbol"
    )
    with engine.connect() as conn:
        return [str(r[0]) for r in conn.execute(sql).all()]


def load_snapshots(engine: Engine, *, as_of: datetime, since: datetime) -> list[Snapshot]:
    """찍은 시각 ≤ as_of 인 원인 스냅샷(as-of 기준 = 서버가 찍은 시각 — 우리가 알 수 있게 된 시각)."""
    sql = text(
        """
        SELECT market, symbol, trade_date, fingerprint, top_kind, top_strength, change_rate, split,
        candidates, captured_at
        FROM public.v_cause_snapshot_export
        WHERE captured_at <= :as_of AND captured_at >= :since
        ORDER BY market, symbol, trade_date, captured_at
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"as_of": as_of, "since": since}).all()
    out: list[Snapshot] = []
    for m, s, d, fp, tk, ts, cr, split, cands, at in rows:
        sp = json.loads(split) if isinstance(split, str) else split
        cs = json.loads(cands) if isinstance(cands, str) else cands
        out.append(
            Snapshot(
                str(m), str(s), cast(date, d), str(fp), str(tk), str(ts), float(cr),
                cast("dict[str, object] | None", sp), cast("list[dict[str, object]]", cs), _utc(at),
            )
        )  # fmt: skip
    return out


def load_open_memberships(engine: Engine) -> list[OpenRelation]:
    sql = text(
        "SELECT subject, predicate, object, valid_from FROM forecast.relation "
        "WHERE predicate = 'belongs_to' AND source_kind = 'kr_stock_master' AND valid_to IS NULL"
    )
    with engine.connect() as conn:
        rows = conn.execute(sql).all()
    return [OpenRelation(str(s), cast(Predicate, str(p)), str(o), _utc(v)) for s, p, o, v in rows]


def _f(x: float | None) -> float | None:
    return x if x is not None and math.isfinite(x) else None


def save_entities(engine: Engine, rows: Sequence[EntityRow]) -> int:
    values: list[Sequence[Any]] = [(r.id, r.kind, r.canonical_name, dumps(r.external_ids)) for r in rows]
    return bulk_upsert(
        engine, entity, ("id", "kind", "canonical_name", "external_ids"), values, ("id",), keep_existing=True
    )


_REL_COLS = ("subject", "predicate", "object", "valid_from", "observed_at", "available_at", "source_kind", "confidence")


def save_relations(engine: Engine, rows: Sequence[RelationRow]) -> int:
    """처음 안 관계를 지킨다(keep_existing) — 같은 사건을 나중에 다시 봐도 available_at 이 늦춰지지 않는다."""
    values: list[Sequence[Any]] = [
        (r.subject, r.predicate, r.object, r.valid_from, r.observed_at, r.available_at, r.source_kind, r.confidence)
        for r in rows
    ]
    return bulk_upsert(
        engine, relation, _REL_COLS, values, ("subject", "predicate", "object", "valid_from"), keep_existing=True
    )


def close_relations(engine: Engine, closes: Sequence[tuple[OpenRelation, datetime]]) -> int:
    """끝난 관계는 valid_to 를 채운다(지우지 않는다 — ontology.md §2). 한 문장."""
    if not closes:
        return 0
    sql = text(
        """
        UPDATE forecast.relation r SET valid_to = c.valid_to
        FROM (SELECT * FROM jsonb_to_recordset(CAST(:rows AS jsonb))
              AS x(subject text, predicate text, object text, valid_from timestamptz, valid_to timestamptz)) c
        WHERE r.subject = c.subject AND r.predicate = c.predicate AND r.object = c.object AND r.valid_from =
        c.valid_from
          AND r.valid_to IS NULL
        """
    )
    payload = [
        {
            "subject": o.subject,
            "predicate": o.predicate,
            "object": o.object,
            "valid_from": o.valid_from.isoformat(),
            "valid_to": t.isoformat(),
        }
        for o, t in closes
    ]
    with engine.begin() as conn:
        return conn.execute(sql, {"rows": json.dumps(payload)}).rowcount


_FACT_COLS = (
    "entity", "attribute", "value_num", "value_text", "unit", "valid_from", "valid_to", "observed_at",
    "available_at", "source_kind",
)  # fmt: skip


def save_facts(engine: Engine, rows: Sequence[FactRow]) -> int:
    values: list[Sequence[Any]] = [
        (
            r.entity,
            r.attribute,
            _f(r.value_num),
            r.value_text,
            r.unit,
            r.valid_from,
            r.valid_to,
            r.observed_at,
            r.available_at,
            r.source_kind,
        )
        for r in rows
    ]
    return bulk_upsert(
        engine, fact, _FACT_COLS, values, ("entity", "attribute", "valid_from", "available_at"), keep_existing=True
    )


_CAND_COLS = (
    "entity",
    "trade_date",
    "fingerprint",
    "rank",
    "kind",
    "strength",
    "headline",
    "event_entity",
    "supports",
    "available_at",
)


def save_candidates(engine: Engine, rows: Sequence[CandidateRow]) -> int:
    values: list[Sequence[Any]] = [
        (
            r.entity,
            r.trade_date,
            r.fingerprint,
            r.rank,
            r.kind,
            r.strength,
            r.headline,
            r.event_entity,
            r.supports,
            r.available_at,
        )
        for r in rows
    ]
    return bulk_upsert(
        engine, cause_candidate, _CAND_COLS, values, ("entity", "trade_date", "fingerprint", "rank"), keep_existing=True
    )


_EV_COLS = (
    "entity", "trade_date", "fingerprint", "rank", "ord", "kind", "value_text", "compare_text", "supports",
    "source_name",
    "observed_at", "available_at",
)  # fmt: skip


def save_evidence(engine: Engine, rows: Sequence[EvidenceRow]) -> int:
    values: list[Sequence[Any]] = [
        (r.entity, r.trade_date, r.fingerprint, r.rank, r.ord, r.kind, r.value_text, r.compare_text,
        r.supports, r.source_name,
         r.observed_at, r.available_at)
        for r in rows
    ]  # fmt: skip
    pk = ("entity", "trade_date", "fingerprint", "rank", "ord")
    return bulk_upsert(engine, evidence, _EV_COLS, values, pk, keep_existing=True)


def save_outcomes(engine: Engine, rows: Sequence[OutcomeRow]) -> int:
    """결과는 닫힌 라벨이라 한 번 쓰면 같다 — 다시 써도(시장 평균이 같은 날 늦게 찍힌 종목으로 바뀌면) 새 값으로."""
    values: list[Sequence[Any]] = [
        (r.entity, r.trade_date, r.horizon, r.r, r.r_market, r.excess, r.available_at) for r in rows
    ]
    cols = ("entity", "trade_date", "horizon", "r", "r_market", "excess", "available_at")
    return bulk_upsert(engine, outcome, cols, values, ("entity", "trade_date", "horizon"))


def counts(engine: Engine) -> dict[str, int]:
    names = ("entity", "relation", "fact", "cause_candidate", "evidence", "outcome")
    with engine.connect() as conn:
        return {n: int(conn.execute(text(f"SELECT count(*) FROM forecast.{n}")).scalar_one()) for n in names}
