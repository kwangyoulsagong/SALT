"""온톨로지 네 층 — id 결정성 · 소속 이력 · 결과는 닫힌 라벨만 · 시장 평균 · 코인 거래일.

FC-REQ-022 FR-5 · 6 · 13 · 14.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

import numpy as np

from salt_forecast.domain.ontology import (
    ENTITY_KINDS,
    PREDICATES,
    Bars,
    MasterRow,
    OpenRelation,
    RelationRow,
    Snapshot,
    bar_trade_dates,
    build_graph,
    latest_per_day,
    outcomes,
    reconcile_membership,
)

T = datetime(2026, 11, 16, 7, 40, tzinfo=UTC)  # 16:40 KST


def snap(
    sym: str = "005930", d: date = date(2026, 11, 16), at: datetime = T, fp: str = "f1", kind: str = "news"
) -> Snapshot:
    cand = {
        "kind": kind,
        "strength": "likely",
        "headline": "자사주 소각 결정",
        "factId": "dart:1",
        "at": "2026-11-16T00:42:00Z",
        "evidence": [
            {
                "kind": "post_move",
                "value": "공시 뒤 30분 +2.1%",
                "compare": "평소의 3배",
                "source": "DART",
                "at": None,
                "supports": True,
            },
            {
                "kind": "news_count",
                "value": "소식 4건",
                "compare": None,
                "source": "시세",
                "at": None,
                "supports": False,
            },
            "깨진 항목",
        ],
    }
    split = {"market": 0.5, "sector": 1.0, "idio": 1.6, "method": "regression"}
    return Snapshot("kr", sym, d, fp, kind, "likely", 3.1, split, [cand], at)


MASTER = [
    MasterRow("005930", "삼성전자", "0013", T),
    MasterRow("000660", "SK하이닉스", "0013", T),
    MasterRow("999999", "업종없음", None, T),
]


def test_ids_are_deterministic_and_closed_lists() -> None:
    g1 = build_graph(MASTER, ["BTC"], [snap()])
    g2 = build_graph(MASTER, ["BTC"], [snap()])
    assert g1.entities == g2.entities
    assert {"asset:kr:005930", "asset:crypto:BTC", "sector:kr:0013", "event:dart:1"} <= set(g1.entities)
    assert all(e.kind in ENTITY_KINDS for e in g1.entities.values())
    assert all(r.predicate in PREDICATES for r in g1.relations)
    # 소속은 업종 있는 종목만 · 사건 → 종목 affects
    preds = {(r.subject, r.predicate, r.object) for r in g1.relations}
    assert ("asset:kr:005930", "belongs_to", "sector:kr:0013") in preds
    assert ("event:dart:1", "affects", "asset:kr:005930") in preds
    assert not any(r.subject == "asset:kr:999999" for r in g1.relations)


def test_layers_from_snapshot() -> None:
    g = build_graph([], [], [snap()])
    assert {f.attribute for f in g.facts} == {"change_pct", "move_market_pct", "move_sector_pct", "move_idio_pct"}
    assert all(f.available_at == T for f in g.facts)  # 알 수 있게 된 시각 = 서버가 찍은 시각
    (c,) = g.candidates
    assert c.supports == 1 and c.event_entity == "event:dart:1"
    assert len(g.evidence) == 2  # 깨진 항목은 빠진다(죽지 않는다)
    affects = next(r for r in g.relations if r.predicate == "affects")
    assert affects.valid_from == datetime(2026, 11, 16, 0, 42, tzinfo=UTC) and affects.available_at == T


def test_reconcile_membership() -> None:
    later = datetime(2026, 11, 20, tzinfo=UTC)
    open_now = [OpenRelation("asset:kr:005930", "belongs_to", "sector:kr:0013", T)]
    same = RelationRow("asset:kr:005930", "belongs_to", "sector:kr:0013", later, later, later, "kr_stock_master")
    moved = RelationRow("asset:kr:005930", "belongs_to", "sector:kr:0099", later, later, later, "kr_stock_master")
    fresh = RelationRow("asset:kr:000660", "belongs_to", "sector:kr:0013", later, later, later, "kr_stock_master")
    assert reconcile_membership(open_now, [same]) == ([], [])  # 매일 동기화가 새 행을 만들지 않는다
    ins, closes = reconcile_membership(open_now, [moved, fresh])
    assert ins == [moved, fresh]
    assert closes == [(open_now[0], later)]  # 지우지 않고 valid_to


def test_latest_per_day() -> None:
    a = snap(at=T, fp="a")
    b = snap(at=datetime(2026, 11, 16, 9, tzinfo=UTC), fp="b")
    assert [s.fingerprint for s in latest_per_day([b, a])] == ["b"]


def _kr_bars(n: int, start_close: float = 100.0, step: float = 0.01) -> Bars:
    # 2026-11-16 부터 매일 16:00 KST(07:00 UTC)
    t0 = int(datetime(2026, 11, 16, 7, tzinfo=UTC).timestamp())
    at = np.array([t0 + 86_400 * i for i in range(n)], dtype=np.int64)
    return Bars(at, np.array([start_close * (1 + step) ** i for i in range(n)]))


def test_outcomes_only_closed_labels_and_market_relative() -> None:
    days = [snap("005930"), snap("000660")]
    bars = {"005930": _kr_bars(7, step=0.02), "000660": _kr_bars(7, step=0.0)}
    # as_of = t+1 봉 직후 — h=1 만 닫힘
    as_of = datetime(2026, 11, 17, 7, 0, 1, tzinfo=UTC)
    rows, missing = outcomes("kr", days, bars, as_of)
    assert missing == 0
    assert {r.horizon for r in rows} == {1}
    by = {r.entity: r for r in rows}
    assert abs(by["asset:kr:005930"].r - np.log(1.02)) < 1e-12
    assert abs(by["asset:kr:005930"].excess + by["asset:kr:000660"].excess) < 1e-12  # 두 종목 평균 대비 = 부호 반대
    rows5, _ = outcomes("kr", days, bars, datetime(2026, 11, 30, tzinfo=UTC))
    assert {r.horizon for r in rows5} == {1, 5}


def test_outcomes_missing_bar_counted() -> None:
    rows, missing = outcomes(
        "kr", [snap(d=date(2026, 11, 15))], {"005930": _kr_bars(3)}, datetime(2026, 12, 1, tzinfo=UTC)
    )
    assert rows == [] and missing == 1  # 휴장일 스냅샷은 버린다


def test_crypto_trade_date_is_previous_kst_day() -> None:
    at = np.array([int(datetime(2026, 11, 17, 0, tzinfo=UTC).timestamp())], dtype=np.int64)  # 11-17 09:00 KST 마감
    assert bar_trade_dates("crypto", at) == [date(2026, 11, 16)]
    at_kr = np.array([int(datetime(2026, 11, 16, 7, tzinfo=UTC).timestamp())], dtype=np.int64)
    assert bar_trade_dates("kr", at_kr) == [date(2026, 11, 16)]
