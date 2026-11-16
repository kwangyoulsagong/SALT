"""온톨로지 적재 — 원천 → ① 엔티티 · 관계 · 사실 · 별칭 · ② 근거 · ③ 원인 후보 · ④ 결과.

FC-REQ-022 FR-5 · 6 · 13 · 14 · 16. 이미 있는 데이터만(`ontology.md` §5): 종목 마스터 · 코인 이름 · 서버 원인 스냅샷 ·
공시 목록 · 국내 시황 · 공시 제목 · 코인 기사 · 본문 추출 사실 · 거시 · 국내 일정과 반응 통계 · 쏠림 신호 ·
거시 · 시장 시계열 · 등락 분해 β · σ · 거래소 경보 · 국내 종목 상태 · 일봉.
멱등 — 두 번 돌려도 행 수 같음. 전부 as_of 에 알 수 있던 행만 읽는다.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import Engine

from salt_forecast.domain.cause_explain import REGISTERED_AT
from salt_forecast.domain.ontology import (
    SOURCE_MASTER,
    Bars,
    Graph,
    OutcomeRow,
    build_graph,
    latest_per_day,
    outcomes,
    reconcile_membership,
)
from salt_forecast.domain.ontology_sources import (
    add_betas,
    add_documents,
    add_extracted_facts,
    add_schedule,
    add_series,
    add_signals,
    changed_states,
    ensure_entities,
)
from salt_forecast.store.ontology import (
    close_relations,
    latest_states,
    load_betas,
    load_crypto_names,
    load_dart,
    load_extracted,
    load_macro_series,
    load_master,
    load_open_memberships,
    load_schedule,
    load_signals,
    load_snapshots,
    load_states,
    load_titles,
    save_aliases,
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
    aliases: int
    relations: int
    closed: int
    facts: int
    candidates: int
    evidence: int
    outcomes: int
    snapshots: int
    days: int
    missing_bars: dict[str, int]
    unresolved: int = 0
    series_skipped: int = 0
    by_source: dict[str, int] = field(default_factory=dict[str, int])


def _by_source(g: Graph) -> dict[str, int]:
    out: dict[str, int] = {}
    for r in g.relations:
        out[f"rel:{r.source_kind}"] = out.get(f"rel:{r.source_kind}", 0) + 1
    for f in g.facts:
        out[f"fact:{f.source_kind}"] = out.get(f"fact:{f.source_kind}", 0) + 1
    return out


def build_ontology(engine: Engine, as_of: datetime, *, dry_run: bool) -> tuple[BuildResult, Graph, list[OutcomeRow]]:
    snaps = load_snapshots(engine, as_of=as_of, since=REGISTERED_AT)
    graph = build_graph(load_master(engine), load_crypto_names(engine), snaps)
    add_documents(graph, load_dart(engine, as_of=as_of), load_titles(engine, as_of=as_of))
    add_extracted_facts(graph, load_extracted(engine, as_of=as_of))
    sched, stats = load_schedule(engine, as_of=as_of)
    add_schedule(graph, sched, stats)
    add_signals(graph, load_signals(engine, as_of=as_of))
    skipped = add_series(graph, load_macro_series(engine, as_of=as_of))
    add_betas(graph, load_betas(engine, as_of=as_of))
    graph.facts.extend(changed_states(load_states(engine, as_of=as_of), latest_states(engine)))
    unresolved = ensure_entities(graph)

    member_rows = [r for r in graph.relations if r.source_kind == SOURCE_MASTER]
    inserts, closes = reconcile_membership(load_open_memberships(engine), member_rows)
    rels = inserts + [r for r in graph.relations if r.source_kind != SOURCE_MASTER]

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

    by_src = _by_source(graph)
    if dry_run:
        g = graph
        n = (len(g.entities), len(g.aliases), len(rels), len(closes), len(g.facts), len(g.candidates), len(g.evidence))
        res = BuildResult(*n, len(outs), len(snaps), len(days), missing, unresolved, skipped, by_src)
        return res, graph, outs
    n_e = save_entities(engine, list(graph.entities.values()))
    n_a = save_aliases(engine, graph.aliases)
    n_r = save_relations(engine, rels)
    n_c = close_relations(engine, closes)
    n_f = save_facts(engine, graph.facts)
    n_cc = save_candidates(engine, graph.candidates)
    n_ev = save_evidence(engine, graph.evidence)
    n_o = save_outcomes(engine, outs)
    res = BuildResult(
        n_e, n_a, n_r, n_c, n_f, n_cc, n_ev, n_o, len(snaps), len(days), missing, unresolved, skipped, by_src
    )
    return res, graph, outs
