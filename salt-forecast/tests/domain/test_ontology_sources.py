"""온톨로지 원천 확대(FC-REQ-022 FR-5 · 16).

한 점 id · 언급 확신 · 일정 → 시장 · 시계열 표 · 바뀔 때만 · 미해소 · 끝점 무결성.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

from salt_forecast.domain.ontology import CryptoName, MasterRow, Snapshot, build_graph, cause_entity_id
from salt_forecast.domain.ontology_sources import (
    DartRow,
    SchedRow,
    SeriesRow,
    SignalRow,
    StateRow,
    TitleRow,
    XfRow,
    add_documents,
    add_extracted_facts,
    add_schedule,
    add_series,
    add_signals,
    changed_states,
    ensure_entities,
    series_target,
)

T = datetime(2026, 11, 16, 0, 42, tzinfo=UTC)
MASTER = [MasterRow("005930", "삼성전자", "0013", T, "KOSPI")]


def _snap(fact_id: str) -> Snapshot:
    cand: dict[str, object] = {
        "kind": "news",
        "strength": "likely",
        "headline": "h",
        "factId": fact_id,
        "at": None,
        "evidence": [],
    }
    return Snapshot("kr", "005930", date(2026, 11, 16), "f", "news", "likely", 1.0, None, [cand], T)


def test_crypto_ids_strip_market_prefix() -> None:
    """첫 판 결함(2026-11-16) — 업비트 마켓 표기 `KRW-BTC` 로 id 를 만들었다."""
    g = build_graph([], ["KRW-BTC", CryptoName("KRW-ETH", "이더리움", "Ethereum")], [])
    assert "asset:crypto:BTC" in g.entities and "asset:crypto:ETH" in g.entities
    assert not any(e.startswith("asset:crypto:KRW-") for e in g.entities)
    assert {a.alias for a in g.aliases if a.entity == "asset:crypto:ETH"} == {"ETH", "KRW-ETH", "이더리움", "Ethereum"}


def test_master_company_market_aliases() -> None:
    g = build_graph(MASTER, [], [])
    rels = {(r.subject, r.predicate, r.object) for r in g.relations}
    assert ("company:kr:005930", "listed_as", "asset:kr:005930") in rels
    assert ("asset:kr:005930", "belongs_to", "asset:market:kr:KOSPI") in rels
    assert ("asset:kr:005930", "belongs_to", "sector:kr:0013") in rels
    assert {a.alias for a in g.aliases if a.entity == "asset:kr:005930"} == {"005930", "삼성전자"}


def test_cause_document_is_same_point_as_title_document() -> None:
    """원인 후보의 소식 = 소식 적재의 문서 — 같은 id 한 점."""
    assert cause_entity_id("kr-news:123") == ("document:kr-news:123", "document")
    assert cause_entity_id("kr-vi:005930:1") == ("event:kr-vi:005930:1", "event")
    g = build_graph(MASTER, [], [_snap("kr-news:123")])
    add_documents(g, [], [TitleRow("123", "news", "삼성전자 자사주", ("005930",), T)])
    assert g.entities["document:kr-news:123"].kind == "document"
    preds = {(r.subject, r.predicate) for r in g.relations if r.subject == "document:kr-news:123"}
    assert preds == {("document:kr-news:123", "affects"), ("document:kr-news:123", "mentions")}


def test_mentions_confidence_and_dart_issued() -> None:
    g = build_graph(MASTER, [], [])
    add_documents(
        g,
        [DartRow("2026111680001", "005930", "자기주식취득결정", T)],
        [TitleRow("9", "news", "두 종목", ("005930", "000660"), T)],
    )
    m = [r for r in g.relations if r.subject == "document:kr-news:9"]
    assert {r.confidence for r in m} == {0.5}
    assert any(r.subject == "company:kr:005930" and r.predicate == "issued" for r in g.relations)


def test_extracted_fact_links_document_and_value() -> None:
    g = build_graph(MASTER, [], [])
    x = XfRow("disclosure", "dart:2026111680001", ("005930",), "삼성전자", "자기주식 취득 금액", 1e11, "원", None,
              "buyback", T, T, None, "DART")  # fmt: skip
    add_extracted_facts(g, [x])
    (f,) = g.facts
    assert f.entity == "asset:kr:005930" and f.value_num == 1e11 and f.unit == "원" and f.available_at == T
    assert any(r.subject == "document:dart:2026111680001" and r.predicate == "mentions" for r in g.relations)


def test_schedule_affects_markets_and_signal() -> None:
    g = build_graph(MASTER, ["BTC"], [])
    ev_at, ann = datetime(2026, 12, 10, 13, tzinfo=UTC), datetime(2026, 12, 3, tzinfo=UTC)
    add_schedule(g, [SchedRow("cpi", ev_at, ann, ""), SchedRow("kr_cpi", ev_at, ann, "")], [])
    cpi = {r.object for r in g.relations if r.subject.startswith("event:sched:cpi")}
    kr = {r.object for r in g.relations if r.subject.startswith("event:sched:kr_cpi")}
    assert cpi == {"asset:market:kr:KOSPI", "asset:market:crypto"}  # 코스닥 엔티티는 마스터에 없어 안 잇는다
    assert kr == {"asset:market:kr:KOSPI"}
    assert all(r.available_at == ann for r in g.relations if r.subject.startswith("event:sched"))  # 예고 시각에 안다
    add_signals(g, [SignalRow("kimchi_cross_up", "KRW-BTC", T, 3.2)])
    assert any(r.object == "asset:crypto:BTC" and r.predicate == "affects" for r in g.relations)


def test_series_table_and_exclusions() -> None:
    assert series_target("fred", "DEXKOUS") == ("asset:fx:USDKRW", "asset", "원/달러 환율", "close_fred")
    assert series_target("coinmetrics", "cm:btc:CapMVRVCur") == (
        "asset:crypto:BTC",
        "asset",
        "BTC",
        "onchain.CapMVRVCur",
    )
    assert series_target("coinmetrics", "cm:btc:FlowInExNtv") is None  # 주소 라벨 소급 — 판정 금지 원천
    assert series_target("binance", "funding:BTC") is None  # 종목 고빈도 시계열은 복제하지 않는다
    assert series_target("deribit", "dvol:ETH")[0] == "asset:crypto:ETH"  # type: ignore[index]
    g = build_graph([], [], [])
    rows = [SeriesRow("fred", "DGS10", T, T, 4.1, "percent"), SeriesRow("binance", "funding:BTC", T, T, 0.01, None)]
    assert add_series(g, rows) == 1
    assert g.facts[0].entity == "asset:rate:US10Y" and g.facts[0].available_at == T


def test_changed_states_only_on_change() -> None:
    t1, t2, t3 = (datetime(2026, 11, d, tzinfo=UTC) for d in (14, 15, 16))
    rows = [StateRow("asset:crypto:X", "exchange_warning", "none", t, "w") for t in (t1, t2)]
    rows.append(StateRow("asset:crypto:X", "exchange_warning", "warning", t3, "w"))
    out = changed_states(rows, {})
    assert [f.value_text for f in out] == ["none", "warning"]
    again = changed_states(rows[2:], {("asset:crypto:X", "exchange_warning"): "warning"})
    assert again == []  # 저장된 마지막 값과 같으면 0


def test_unresolved_and_endpoint_integrity() -> None:
    g = build_graph(MASTER, [], [])
    add_documents(g, [], [TitleRow("1", "news", "상폐 종목", ("999998",), T)])
    made = ensure_entities(g)
    assert made == 1 and g.entities["asset:kr:999998"].external_ids == {"unresolved": "true"}
    ids = set(g.entities)
    assert all(r.subject in ids and r.object in ids for r in g.relations)
    assert all(f.entity in ids for f in g.facts)
