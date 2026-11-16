"""온톨로지 네 층 — 사실 → 근거 → 원인 후보 → 결과 (FC-REQ-022 FR-1~3 · 5 · 6 · 13 · 14, F017 v4 순서 5b).

순수 계산, I/O 없음. 원천 행(종목 마스터 · 업비트 일봉 심볼 · 서버 원인 스냅샷 · 일봉)을 받아 적재할 행을 만든다.

## 불변식

1. **id 는 원천 키에서 결정된다** — `asset:kr:<코드>` · `asset:crypto:<심볼>` · `sector:kr:<업종 중분류>` ·
   `event:<서버 사실 id>`.
   같은 원천을 두 번 적재해도 행이 늘지 않는다(FR-6 — upsert 키 = id · 관계 PK · 사실 PK)
2. **시각 둘** — `available_at` = 우리가 알 수 있게 된 시각
   (스냅샷은 서버가 찍은 시각 · 마스터는 동기화 시각 · 결과는 t+h 봉).
   `ingested_at` 은 DB 기본값(감사용) — as-of 는 available_at 하나(`ontology.md` §3)
3. **닫힌 목록 밖 kind · predicate 를 만들지 않는다** — 아래 상수만(DB CHECK 가 같은 목록)
4. 결과(④)는 **라벨이 닫힌 행만** — t+h 봉이 아직 없으면 만들지 않는다.
   시장 평균은 같은 날 · 같은 h 의 스냅샷 종목 동일가중
5. 사실 행에 파생값 0 — 등락 · 몫은 서버가 화면에 보인 값 그대로(%)
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Literal, cast

import numpy as np
from numpy.typing import NDArray

EntityKind = Literal["asset", "company", "person", "institution", "wallet", "event", "document", "sector", "policy"]
Predicate = Literal["issued", "listed_as", "holds", "traded", "mentions", "affects", "belongs_to", "regulates"]
ENTITY_KINDS: tuple[EntityKind, ...] = (
    "asset",
    "company",
    "person",
    "institution",
    "wallet",
    "event",
    "document",
    "sector",
    "policy",
)
PREDICATES: tuple[Predicate, ...] = (
    "issued",
    "listed_as",
    "holds",
    "traded",
    "mentions",
    "affects",
    "belongs_to",
    "regulates",
)
HORIZONS = (1, 5)
SOURCE_SNAPSHOT = "cause_snapshot"
SOURCE_MASTER = "kr_stock_master"
_KST = timedelta(hours=9)


def asset_id(market: str, symbol: str) -> str:
    return f"asset:{market}:{symbol}"


def sector_id(code: str) -> str:
    return f"sector:kr:{code}"


def event_id(fact_id: str) -> str:
    return f"event:{fact_id}"


@dataclass(frozen=True, slots=True)
class EntityRow:
    id: str
    kind: EntityKind
    canonical_name: str
    external_ids: dict[str, str]


@dataclass(frozen=True, slots=True)
class RelationRow:
    subject: str
    predicate: Predicate
    object: str
    valid_from: datetime
    observed_at: datetime
    available_at: datetime
    source_kind: str
    confidence: float = 1.0


@dataclass(frozen=True, slots=True)
class FactRow:
    entity: str
    attribute: str
    value_num: float | None
    value_text: str | None
    unit: str | None
    valid_from: datetime
    valid_to: datetime | None
    observed_at: datetime
    available_at: datetime
    source_kind: str


@dataclass(frozen=True, slots=True)
class CandidateRow:
    entity: str
    trade_date: date
    fingerprint: str
    rank: int
    kind: str
    strength: str
    headline: str
    event_entity: str | None
    supports: int
    available_at: datetime


@dataclass(frozen=True, slots=True)
class EvidenceRow:
    entity: str
    trade_date: date
    fingerprint: str
    rank: int
    ord: int
    kind: str
    value_text: str
    compare_text: str | None
    supports: bool
    source_name: str
    observed_at: datetime | None
    available_at: datetime


@dataclass(frozen=True, slots=True)
class OutcomeRow:
    entity: str
    trade_date: date
    horizon: int
    r: float
    r_market: float
    excess: float
    available_at: datetime


@dataclass(frozen=True, slots=True)
class MasterRow:
    code: str
    name: str
    sector_mid_code: str | None
    synced_at: datetime


@dataclass(frozen=True, slots=True)
class Snapshot:
    """서버 원인 스냅샷 한 행(`v_cause_snapshot_export`)."""

    market: str
    symbol: str
    trade_date: date
    fingerprint: str
    top_kind: str
    top_strength: str
    change_rate: float
    split: Mapping[str, object] | None
    candidates: Sequence[Mapping[str, object]]
    captured_at: datetime


@dataclass(slots=True)
class Graph:
    entities: dict[str, EntityRow]
    relations: list[RelationRow]
    facts: list[FactRow]
    candidates: list[CandidateRow]
    evidence: list[EvidenceRow]


def _ts(x: object) -> datetime | None:
    if not isinstance(x, str) or not x:
        return None
    t = datetime.fromisoformat(x.replace("Z", "+00:00"))
    return t if t.tzinfo else t.replace(tzinfo=UTC)


def _num(x: object) -> float | None:
    return float(x) if isinstance(x, int | float) and math.isfinite(float(x)) else None


def _mappings(x: object) -> list[Mapping[str, object]]:
    """JSON 배열 중 객체만(서버 모양이 바뀌어도 죽지 않고 그 항목만 빠진다)."""
    if not isinstance(x, list):
        return []
    return [cast("Mapping[str, object]", e) for e in cast("list[object]", x) if isinstance(e, Mapping)]


def day_start(market: str, d: date) -> datetime:
    """그 거래일의 시작(국내 09:00 · 코인 09:00 KST) — 등락 사실의 valid_from."""
    return datetime(d.year, d.month, d.day, 9, tzinfo=UTC) - _KST


def latest_per_day(snaps: Sequence[Snapshot]) -> list[Snapshot]:
    """(시장, 종목, 거래일)마다 가장 늦게 찍은 행 — 그날 마지막 원인(사전등록 cause-explain@1 source)."""
    best: dict[tuple[str, str, date], Snapshot] = {}
    for s in snaps:
        k = (s.market, s.symbol, s.trade_date)
        if k not in best or s.captured_at > best[k].captured_at:
            best[k] = s
    return sorted(best.values(), key=lambda s: (s.market, s.symbol, s.trade_date))


def build_graph(master: Sequence[MasterRow], crypto_symbols: Sequence[str], snaps: Sequence[Snapshot]) -> Graph:
    """① 엔티티 · 관계 · 사실 + ② 근거 + ③ 원인 후보. 스냅샷은 지문마다 전부(그날 중간 기록도 — 근거의 이력)."""
    ents: dict[str, EntityRow] = {}
    rels: list[RelationRow] = []
    facts: list[FactRow] = []
    cands: list[CandidateRow] = []
    evs: list[EvidenceRow] = []

    for m in master:
        a = asset_id("kr", m.code)
        ents[a] = EntityRow(a, "asset", m.name, {"kr_code": m.code})
        if m.sector_mid_code:
            s = sector_id(m.sector_mid_code)
            ents.setdefault(
                s, EntityRow(s, "sector", f"업종 {m.sector_mid_code}", {"kis_sector_mid": m.sector_mid_code})
            )
            # 마스터는 지금 값만 준다 — 관계는 우리가 처음 안 동기화 시각부터(소급 0)
            rels.append(RelationRow(a, "belongs_to", s, m.synced_at, m.synced_at, m.synced_at, SOURCE_MASTER))
    for sym in crypto_symbols:
        a = asset_id("crypto", sym)
        ents.setdefault(a, EntityRow(a, "asset", sym, {"upbit_market": f"KRW-{sym}"}))

    for s in snaps:
        a = asset_id(s.market, s.symbol)
        ents.setdefault(
            a,
            EntityRow(
                a,
                "asset",
                s.symbol,
                {
                    "kr_code" if s.market == "kr" else "upbit_market": s.symbol
                    if s.market == "kr"
                    else f"KRW-{s.symbol}"
                },
            ),
        )
        start = day_start(s.market, s.trade_date)
        end = start + timedelta(days=1)
        at = s.captured_at
        facts.append(FactRow(a, "change_pct", s.change_rate, None, "%", start, end, start, at, SOURCE_SNAPSHOT))
        if s.split:
            for part in ("market", "sector", "idio"):
                v = _num(s.split.get(part))
                if v is not None:
                    facts.append(FactRow(a, f"move_{part}_pct", v, None, "%p", start, end, start, at, SOURCE_SNAPSHOT))
        for rank, c in enumerate(s.candidates):
            fact_id = c.get("factId")
            ev_ent: str | None = None
            when = _ts(c.get("at"))
            if isinstance(fact_id, str) and fact_id:
                ev_ent = event_id(fact_id)
                ents.setdefault(
                    ev_ent,
                    EntityRow(
                        ev_ent,
                        "event",
                        str(c.get("headline", "")),
                        {"server_fact_id": fact_id, "cause_kind": str(c.get("kind"))},
                    ),
                )
                # 사건 → 종목(FR-14 사건 ↔ 종목 ↔ 업종). 사건 시각부터 · 알게 된 시각 = 서버가 찍은 시각
                rels.append(RelationRow(ev_ent, "affects", a, when or start, when or start, at, SOURCE_SNAPSHOT))
            ev_list = _mappings(c.get("evidence"))
            cands.append(
                CandidateRow(
                    a, s.trade_date, s.fingerprint, rank, str(c.get("kind")), str(c.get("strength")),
                    str(c.get("headline", "")), ev_ent, sum(1 for e in ev_list if e.get("supports") is True), at,
                )
            )  # fmt: skip
            for i, e in enumerate(ev_list):
                cmp_ = e.get("compare")
                evs.append(
                    EvidenceRow(
                        a, s.trade_date, s.fingerprint, rank, i, str(e.get("kind")), str(e.get("value", "")),
                        cmp_ if isinstance(cmp_, str) else None, e.get("supports") is True, str(e.get("source", "")),
                        _ts(e.get("at")), at,
                    )
                )  # fmt: skip
    return Graph(ents, rels, facts, cands, evs)


def bar_trade_dates(market: str, available_at: NDArray[np.int64]) -> list[date]:
    """봉 available_at → 거래일. 국내 = KST 날짜(16:00 마감 봉) · 코인 = KST 날짜 − 1일(09:00 ~ 다음 날 09:00 하루)."""
    shift = _KST - (timedelta(days=1) if market == "crypto" else timedelta(0))
    return [(datetime.fromtimestamp(int(t), UTC) + shift).date() for t in available_at]


@dataclass(frozen=True, slots=True)
class Bars:
    """한 종목 일봉(available_at 오름차순)."""

    available_at: NDArray[np.int64]
    close: NDArray[np.float64]


def outcomes(
    market: str, days: Sequence[Snapshot], bars: Mapping[str, Bars], as_of: datetime
) -> tuple[list[OutcomeRow], int]:
    """④ 결과 — 그날 마지막 스냅샷 종목마다 h 봉 뒤 로그수익 · 같은 날 시장 평균 대비(불변식 4).

    반환: (행, 그날 봉이 없어 뺀 수). t+h 봉 available_at > as_of 면 아직 안 닫힌 라벨이라 만들지 않는다."""
    cut = int(as_of.timestamp())
    raw: dict[tuple[date, int], list[tuple[str, float, int]]] = {}
    missing = 0
    index: dict[str, dict[date, int]] = {}
    for sym, b in bars.items():
        index[sym] = {d: i for i, d in enumerate(bar_trade_dates(market, b.available_at))}
    for s in days:
        if s.market != market:
            continue
        i = index.get(s.symbol, {}).get(s.trade_date)
        b = bars.get(s.symbol)
        if i is None or b is None:
            missing += 1
            continue
        for h in HORIZONS:
            j = i + h
            if j >= b.close.size or int(b.available_at[j]) > cut:
                continue
            c0, c1 = float(b.close[i]), float(b.close[j])
            if c0 > 0 and c1 > 0:
                raw.setdefault((s.trade_date, h), []).append((s.symbol, math.log(c1 / c0), int(b.available_at[j])))
    out: list[OutcomeRow] = []
    for (d, h), rows in raw.items():
        mkt = float(np.mean([r for _, r, _ in rows]))
        for sym, r, t in rows:
            out.append(OutcomeRow(asset_id(market, sym), d, h, r, mkt, r - mkt, datetime.fromtimestamp(t, UTC)))
    out.sort(key=lambda o: (o.entity, o.trade_date, o.horizon))
    return out, missing


@dataclass(frozen=True, slots=True)
class OpenRelation:
    subject: str
    predicate: Predicate
    object: str
    valid_from: datetime


def reconcile_membership(
    open_now: Sequence[OpenRelation], seen: Sequence[RelationRow]
) -> tuple[list[RelationRow], list[tuple[OpenRelation, datetime]]]:
    """마스터 소속(belongs_to)은 지금 값만 온다 — 이미 열린 같은 관계면 그대로(새 행 0),
    업종이 바뀌면 옛 관계를 닫고 새로 연다.

    마스터에서 사라진 종목(상장폐지)은 닫지 않는다 — 폐지 이력은 `delisted_at` 이 따로 말하고,
    소속이 끝난 것은 아니다."""
    by_subject = {(o.subject, o.predicate): o for o in open_now}
    inserts: list[RelationRow] = []
    closes: list[tuple[OpenRelation, datetime]] = []
    for r in seen:
        cur = by_subject.get((r.subject, r.predicate))
        if cur is not None and cur.object == r.object:
            continue
        if cur is not None:
            closes.append((cur, r.valid_from))
        inserts.append(r)
    return inserts, closes
