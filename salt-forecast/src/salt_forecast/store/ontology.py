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
    AliasRow,
    CandidateRow,
    CryptoName,
    EntityRow,
    EvidenceRow,
    FactRow,
    MasterRow,
    OpenRelation,
    OutcomeRow,
    Predicate,
    RelationRow,
    Snapshot,
    asset_id,
)
from salt_forecast.domain.ontology_sources import (
    SRC_STATUS,
    SRC_WARNING,
    BetaRow,
    DartRow,
    FlowRow,
    SchedRow,
    SeriesRow,
    SignalRow,
    StateRow,
    StatRow,
    TitleRow,
    XfRow,
)
from salt_forecast.store.bulk import bulk_upsert
from salt_forecast.store.jsonb import dumps
from salt_forecast.store.tables import cause_candidate, entity, entity_alias, evidence, fact, outcome, relation


def _utc(t: datetime) -> datetime:
    return t if t.tzinfo else t.replace(tzinfo=UTC)


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
        "WHERE source_kind = 'kr_stock_master' AND valid_to IS NULL"
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
    names = ("entity", "entity_alias", "relation", "fact", "cause_candidate", "evidence", "outcome")
    with engine.connect() as conn:
        return {n: int(conn.execute(text(f"SELECT count(*) FROM forecast.{n}")).scalar_one()) for n in names}


# ---- 원천 확대(F017 v4 순서 5b-2 · FC-REQ-022 FR-5 · 16) — 전부 as_of 필수(그 시각에 알 수 있던 행만) ----

_MACRO_SOURCES = ("fred", "ecb", "alternative_me", "defillama", "deribit", "coinmetrics", "coingecko")


def _strs(x: object) -> tuple[str, ...]:
    """DB 배열 → 문자열 튜플(없으면 빈)."""
    return tuple(str(v) for v in cast("list[object]", x)) if isinstance(x, list) else ()


def _opt(x: object) -> str | None:
    return None if x is None else str(x)


def _rows(engine: Engine, sql: str, params: dict[str, Any]) -> Sequence[Any]:
    with engine.connect() as conn:
        return conn.execute(text(sql), params).all()


def _naive_utc(t: datetime) -> datetime:
    """export 뷰의 tz 없는 열(Prisma 기본 — UTC 값)과 비교할 때."""
    return t.astimezone(UTC).replace(tzinfo=None)


def load_master(engine: Engine) -> list[MasterRow]:
    rows = _rows(
        engine,
        "SELECT code, name, sector_mid_code, synced_at, market FROM public.kr_stock_master WHERE delisted_at IS NULL",
        {},
    )
    return [MasterRow(str(c), str(n), None if s is None else str(s), _utc(t), str(m)) for c, n, s, t, m in rows]


def load_crypto_names(engine: Engine) -> list[CryptoName]:
    rows = _rows(
        engine, "SELECT symbol, korean_name, english_name FROM public.v_crypto_name_export ORDER BY symbol", {}
    )
    return [CryptoName(str(s), None if k is None else str(k), None if e is None else str(e)) for s, k, e in rows]


def load_dart(engine: Engine, *, as_of: datetime) -> list[DartRow]:
    rows = _rows(
        engine,
        "SELECT rcept_no, stock_code, report_name, first_seen_at FROM public.v_dart_filing_export "
        "WHERE first_seen_at <= :t",
        {"t": as_of},
    )
    return [DartRow(str(r), str(c or ""), str(n), _utc(t)) for r, c, n, t in rows]


def load_titles(engine: Engine, *, as_of: datetime) -> list[TitleRow]:
    """국내 시황 · 공시 제목(홍보 제외) + 코인 기사 — 게시 시각 ≤ as_of."""
    t = _naive_utc(as_of)
    kr = _rows(
        engine,
        "SELECT serial, origin, title, codes, published_at FROM public.v_kr_news_title_export "
        "WHERE NOT promo AND published_at <= :t",
        {"t": t},
    )
    coin = _rows(
        engine,
        "SELECT id, title, symbols, published_at FROM public.v_news_article_export WHERE published_at <= :t",
        {"t": t},
    )
    out = [TitleRow(str(k), str(o), str(ti), _strs(cs), _utc(p)) for k, o, ti, cs, p in kr]
    out += [TitleRow(str(k), "crypto", str(ti), _strs(cs), _utc(p)) for k, ti, cs, p in coin]
    return out


def load_extracted(engine: Engine, *, as_of: datetime) -> list[XfRow]:
    rows = _rows(
        engine,
        """
        SELECT source_kind, source_key, symbols, who, what, amount, unit, compared_to, event_kind, published_at,
               available_at, source_url, source_name
        FROM public.v_extracted_fact_export WHERE available_at <= :t
        """,
        {"t": as_of},
    )
    return [
        XfRow(str(sk), str(key), _strs(sy), _opt(w), str(wh), None if a is None else float(a), _opt(u), _opt(c),
              str(ek),
              None if p is None else _utc(p), _utc(av), _opt(url), _opt(sn))
        for sk, key, sy, w, wh, a, u, c, ek, p, av, url, sn in rows
    ]  # fmt: skip


def load_schedule(engine: Engine, *, as_of: datetime) -> tuple[list[SchedRow], list[StatRow]]:
    sched = _rows(
        engine,
        "SELECT kind, event_at, announced_at, symbol FROM forecast.scheduled_event WHERE announced_at <= :t",
        {"t": as_of},
    )
    stats = _rows(
        engine,
        "SELECT kind, symbol, horizon_days, as_of, sample, up_rate, q50, baseline_q50 "
        "FROM forecast.event_reaction_stats "
        "WHERE as_of <= :t",
        {"t": as_of},
    )
    return (
        [SchedRow(str(k), _utc(e), _utc(a), str(s or "")) for k, e, a, s in sched],
        [StatRow(str(k), str(s or ""), int(h), _utc(a), int(n), u, q, b) for k, s, h, a, n, u, q, b in stats],
    )


def load_signals(engine: Engine, *, as_of: datetime) -> list[SignalRow]:
    rows = _rows(
        engine, "SELECT kind, symbol, event_at, value FROM forecast.signal_event WHERE event_at <= :t", {"t": as_of}
    )
    return [SignalRow(str(k), str(s), _utc(e), None if v is None else float(v)) for k, s, e, v in rows]


def load_macro_series(engine: Engine, *, as_of: datetime) -> list[SeriesRow]:
    rows = _rows(
        engine,
        "SELECT source, series_id, observed_at, available_at, value, unit FROM forecast.series_point "
        "WHERE source = ANY(:s) AND available_at <= :t",
        {"s": list(_MACRO_SOURCES), "t": as_of},
    )
    return [
        SeriesRow(str(s), str(i), _utc(o), _utc(a), float(v), None if u is None else str(u))
        for s, i, o, a, v, u in rows
    ]


def load_betas(engine: Engine, *, as_of: datetime) -> list[BetaRow]:
    rows = _rows(
        engine,
        "SELECT symbol, asset_class, as_of, beta_market, beta_sector, sigma_daily FROM forecast.move_beta "
        "WHERE as_of <= :t",
        {"t": as_of},
    )
    return [BetaRow(str(s), str(c), _utc(a), bm, bs, sd) for s, c, a, bm, bs, sd in rows]


def load_states(engine: Engine, *, as_of: datetime) -> list[StateRow]:
    """지금 값 원천 — 업비트 경보 스냅샷(받을 때마다) + 국내 종목 상태(마스터 동기화 시각의 지금 값)."""
    warn = _rows(
        engine,
        "SELECT symbol, fetched_at, warning, cautions FROM forecast.market_warning_snapshot WHERE fetched_at <= :t",
        {"t": as_of},
    )
    out: list[StateRow] = []
    for s, f, w, cs in warn:
        cautions = sorted(_strs(cs))
        value = ("warning" if w else "none") + ("|" + ",".join(cautions) if cautions else "")
        sym = str(s).removeprefix("KRW-").upper()
        out.append(StateRow(asset_id("crypto", sym), "exchange_warning", value, _utc(f), SRC_WARNING))
    st = _rows(
        engine,
        "SELECT code, synced_at, is_halted, is_administrative, warn_code, overheat_code, is_liquidation "
        "FROM public.kr_stock_master WHERE delisted_at IS NULL AND synced_at <= :t",
        {"t": _naive_utc(as_of)},
    )
    for code, t, halted, admin, warn_code, overheat, liq in st:
        a = asset_id("kr", str(code))
        for attr, v in (
            ("halted", halted),
            ("administrative", admin),
            ("warn_code", warn_code),
            ("overheat_code", overheat),
            ("liquidation", liq),
        ):
            out.append(StateRow(a, f"kr_status.{attr}", str(v).lower(), _utc(t), SRC_STATUS))
    return out


def latest_states(engine: Engine) -> dict[tuple[str, str], str]:
    rows = _rows(
        engine,
        """
        SELECT DISTINCT ON (entity, attribute) entity, attribute, value_text FROM forecast.fact
        WHERE source_kind IN ('market_warning_snapshot', 'kr_stock_master')
        ORDER BY entity, attribute, available_at DESC
        """,
        {},
    )
    return {(str(e), str(a)): str(v) for e, a, v in rows}


def save_aliases(engine: Engine, rows: Sequence[AliasRow]) -> int:
    values: list[Sequence[Any]] = [(r.entity, r.alias, r.alias_kind, r.source_kind, r.available_at) for r in rows]
    cols = ("entity", "alias", "alias_kind", "source_kind", "available_at")
    return bulk_upsert(engine, entity_alias, cols, values, ("entity", "alias"), keep_existing=True)


def load_label_titles(engine: Engine, doc_ids: Sequence[str]) -> dict[str, tuple[str, tuple[str, ...]]]:
    """O2 라벨 문서 → (제목, 원천 연결). 국내 `kr-news` · 코인 `crypto-news` 만."""
    kr = [d.split(":", 2)[2] for d in doc_ids if d.startswith("document:kr-news:")]
    coin = [d.split(":", 2)[2] for d in doc_ids if d.startswith("document:crypto-news:")]
    out: dict[str, tuple[str, tuple[str, ...]]] = {}
    for serial, title, codes in _rows(
        engine, "SELECT serial, title, codes FROM public.v_kr_news_title_export WHERE serial = ANY(:k)", {"k": kr}
    ):
        out[f"document:kr-news:{serial}"] = (str(title), _strs(codes))
    for i, title, syms in _rows(
        engine, "SELECT id, title, symbols FROM public.v_news_article_export WHERE id = ANY(:k)", {"k": coin}
    ):
        out[f"document:crypto-news:{i}"] = (str(title), _strs(syms))
    return out


def load_flows(engine: Engine, *, as_of: datetime) -> list[FlowRow]:
    """투자자 확정(거래일 · 받은 시각) + 프로그램 장중 누적(시각) — 받은 시각 ≤ as_of."""
    t = _naive_utc(as_of)
    out: list[FlowRow] = []
    inv = _rows(
        engine,
        "SELECT code, trade_date, individual_value, foreign_value, institution_value, collected_at "
        "FROM public.v_kr_investor_flow_export WHERE collected_at <= :t",
        {"t": t},
    )
    for code, d, ind, fo, ins, col in inv:
        day = datetime(d.year, d.month, d.day, 6, 30, tzinfo=UTC)  # 15:30 KST 마감
        for attr, v in (("flow.individual_value", ind), ("flow.foreign_value", fo), ("flow.institution_value", ins)):
            if v is not None:
                out.append(FlowRow(str(code), attr, float(v), day, _utc(col)))
    prog = _rows(
        engine,
        "SELECT code, at, program_net_value, collected_at FROM public.v_kr_program_flow_export "
        "WHERE collected_at <= :t",
        {"t": t},
    )
    out += [
        FlowRow(str(c), "flow.program_net_value", float(v), _utc(a), _utc(col))
        for c, a, v, col in prog
        if v is not None
    ]
    return out
