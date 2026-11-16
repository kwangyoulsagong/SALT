"""온톨로지 적재 — 원천 → ① 엔티티 · 관계 · 사실 · ② 근거 · ③ 원인 후보 · ④ 결과(FC-REQ-022 FR-5 · 6 · 13 · 14).

이미 있는 데이터만(`ontology.md` §5): 종목 마스터 · 업비트 일봉 심볼 · 서버 원인 스냅샷 · 일봉.
멱등 — 두 번 돌려도 행 수 같음.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import Engine

from salt_forecast.domain.cause_explain import REGISTERED_AT
from salt_forecast.domain.ontology import (
    Bars,
    Graph,
    OutcomeRow,
    build_graph,
    latest_per_day,
    outcomes,
    reconcile_membership,
)
from salt_forecast.store.ontology import (
    close_relations,
    load_crypto_symbols,
    load_master,
    load_open_memberships,
    load_snapshots,
    save_candidates,
    save_entities,
    save_evidence,
    save_facts,
    save_outcomes,
    save_relations,
)
from salt_forecast.store.prices import load_ohlcv_series

_SOURCE = {"kr": "kis", "crypto": "upbit"}


@dataclass(frozen=True, slots=True)
class BuildResult:
    entities: int
    relations: int
    closed: int
    facts: int
    candidates: int
    evidence: int
    outcomes: int
    snapshots: int
    days: int
    missing_bars: dict[str, int]


def build_ontology(engine: Engine, as_of: datetime, *, dry_run: bool) -> tuple[BuildResult, Graph, list[OutcomeRow]]:
    snaps = load_snapshots(engine, as_of=as_of, since=REGISTERED_AT)
    master = load_master(engine)
    graph = build_graph(master, load_crypto_symbols(engine), snaps)
    member_rows = [r for r in graph.relations if r.predicate == "belongs_to"]
    inserts, closes = reconcile_membership(load_open_memberships(engine), member_rows)
    rels = inserts + [r for r in graph.relations if r.predicate != "belongs_to"]

    days = latest_per_day(snaps)
    outs: list[OutcomeRow] = []
    missing: dict[str, int] = {}
    for market, source in _SOURCE.items():
        symbols = sorted({s.symbol for s in days if s.market == market})
        if not symbols:
            continue
        series = load_ohlcv_series(engine, source, "1d", symbols)
        bars = {k: Bars(v.available_at, v.close) for k, v in series.items()}
        rows, miss = outcomes(market, days, bars, as_of)
        outs.extend(rows)
        missing[market] = miss

    if dry_run:
        res = BuildResult(len(graph.entities), len(rels), len(closes), len(graph.facts), len(graph.candidates),
                          len(graph.evidence), len(outs), len(snaps), len(days), missing)  # fmt: skip
        return res, graph, outs
    n_e = save_entities(engine, list(graph.entities.values()))
    n_r = save_relations(engine, rels)
    n_c = close_relations(engine, closes)
    n_f = save_facts(engine, graph.facts)
    n_cc = save_candidates(engine, graph.candidates)
    n_ev = save_evidence(engine, graph.evidence)
    n_o = save_outcomes(engine, outs)
    return BuildResult(n_e, n_r, n_c, n_f, n_cc, n_ev, n_o, len(snaps), len(days), missing), graph, outs
