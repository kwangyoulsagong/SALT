"""온톨로지 원천 확대 — 이미 DB 에 있는 데이터 전부를 네 층의 ① 사실 · 엔티티 · 관계로(FC-REQ-022 FR-5 ·
16, F017 v4 순서 5b-2).

순수 계산, I/O 없음. 원천마다 함수 하나 — 입력은 store 가 읽은 행, 출력은 `Graph` 에 더할 행.

원천마다 (엔티티 · 관계 · 사실 · available_at):

- DART 공시 목록 — 문서 `document:dart:<접수번호>` · 회사 `issued` · 문서 `mentions` 종목 · 처음 본 시각
- 국내 시황 · 공시 제목(KIS) — 문서 `document:kr-news:<번호>` · `mentions`(관련 종목 1/n 확신) · 게시 시각
- 코인 기사 — 문서 `document:crypto-news:<id>` · `mentions` · 게시 시각
- 본문 추출 사실(서버 LLM 읽기) — 그 문서 · `mentions` · 종목에 `xf.<종류>.<무엇>` 숫자 · 단위 · 추출 시각
- 거시 · 국내 일정 — 사건 `event:sched:<종류>:<시각>` · `affects` 시장 · 종목 · 예고 시각(`announced_at`)
- 일정 반응 통계 — 종목에 `event.<종류>.h<n>.*` · 통계 as_of
- 쏠림 신호 — 사건 `event:signal:<종류>:<종목>:<시각>` · `affects` 종목 · 사건에 `value` · 신호 봉 마감
- 거시 · 시장 시계열 — 지수 · 환율 · 금리 · 시장 엔티티에 값 · 시계열 `available_at`
- 등락 분해 — 종목에 `beta_market` · `beta_sector` · `sigma_daily` · 계산 as_of
- 거래소 경보 · 국내 종목 상태 — 종목에 `exchange_warning` · `kr_status.*` — **바뀔 때만 새 행** · 받은 · 동기화 시각

## 불변식

1. 문서 id 는 서버 사실 id 와 같은 규칙(`ontology.cause_entity_id`) — 같은 공시 · 기사는 원인 후보 · 소식 ·
   추출 사실에서 한 점
2. 사실 행 = 원천 값 그대로 · 단위 그대로. 환산 · 비율 0(`ontology.md` §2)
3. 지금 값만 주는 원천(경보 · 상태)은 직전 값과 같으면 행을 만들지 않는다 — 매일 같은 값이 버전으로 쌓이지 않게
4. 코인 종목별 고빈도 시계열(펀딩비 · 미결제약정 · 체결 비율 · 고래 ·
   검색 관심 — 240만 행)은 싣지 않는다. 시계열은 `series_point` 가
   주인이고 온톨로지는 **설명에 쓰는 거시 · 시장 값**만 사실로 잇는다(복제 0)
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta

from salt_forecast.domain.ontology import (
    EntityKind,
    EntityRow,
    FactRow,
    Graph,
    RelationRow,
    asset_id,
    document_id,
    market_id,
)

SRC_DART = "dart_filing"
SRC_KR_NEWS = "kr_news_title"
SRC_CRYPTO_NEWS = "news_article"
SRC_XF = "extracted_fact"
SRC_SCHED = "scheduled_event"
SRC_EVENT_STAT = "event_reaction_stats"
SRC_SIGNAL = "signal_event"
SRC_SERIES = "series_point"
SRC_BETA = "move_beta"
SRC_WARNING = "market_warning_snapshot"
SRC_STATUS = "kr_stock_master"

# 일정 종류 → 닿는 시장(국내 일정은 국내 시장 · 미국 거시는 둘 다). 종목 지정 일정(`symbol`)은 그 종목에도
SCHED_MARKETS: Mapping[str, tuple[str, ...]] = {
    "cpi": ("kr:KOSPI", "kr:KOSDAQ", "crypto"),
    "jobs": ("kr:KOSPI", "kr:KOSDAQ", "crypto"),
    "fomc": ("kr:KOSPI", "kr:KOSDAQ", "crypto"),
    "kr_bok_rate": ("kr:KOSPI", "kr:KOSDAQ"),
    "kr_cpi": ("kr:KOSPI", "kr:KOSDAQ"),
    "kr_trade": ("kr:KOSPI", "kr:KOSDAQ"),
    "kr_quad_expiry": ("kr:KOSPI", "kr:KOSDAQ"),
}
SCHED_NAMES: Mapping[str, str] = {
    "cpi": "미국 소비자물가 발표",
    "jobs": "미국 고용보고서 발표",
    "fomc": "미국 FOMC 결정",
    "kr_bok_rate": "한국은행 금통위",
    "kr_cpi": "국내 소비자물가 발표",
    "kr_trade": "국내 수출입 동향",
    "kr_quad_expiry": "국내 동시만기",
}

# 거시 · 시장 시계열 → (엔티티 id, kind, 이름, 속성). 이 표 밖 시계열은 싣지 않는다(불변식 4)
SERIES_MAP: Mapping[str, tuple[str, EntityKind, str, str]] = {
    "fred|DEXKOUS": ("asset:fx:USDKRW", "asset", "원/달러 환율", "close_fred"),
    "ecb|USDKRW": ("asset:fx:USDKRW", "asset", "원/달러 환율", "close_ecb"),
    "fred|DTWEXBGS": ("asset:fx:DXY_BROAD", "asset", "달러 지수(광의)", "close"),
    "fred|DFF": ("policy:us:fed_funds", "policy", "미국 기준금리(실효)", "rate_pct"),
    "fred|DGS10": ("asset:rate:US10Y", "asset", "미국 10년 국채 금리", "yield_pct"),
    "fred|DGS2": ("asset:rate:US2Y", "asset", "미국 2년 국채 금리", "yield_pct"),
    "fred|NASDAQCOM": ("asset:index:NASDAQ", "asset", "나스닥 종합", "close"),
    "fred|VIXCLS": ("asset:index:VIX", "asset", "VIX 변동성 지수", "close"),
    "fred|CPIAUCSL": ("institution:us:bls", "institution", "미국 노동통계국", "cpi_index"),
    "alternative_me|fear_greed": (market_id("crypto"), "asset", "코인 시장(업비트 원화)", "fear_greed"),
    "defillama|stablecoins_total_usd": (market_id("crypto"), "asset", "코인 시장(업비트 원화)", "stablecoin_total_usd"),
}


def series_target(source: str, series_id: str) -> tuple[str, EntityKind, str, str] | None:
    """표 + 접두 규칙(코인메트릭스 `cm:btc:*` · 데리빗 `dvol:*` · 코인게코 `cg:*`)."""
    hit = SERIES_MAP.get(f"{source}|{series_id}")
    if hit:
        return hit
    if source == "coinmetrics" and series_id.startswith("cm:"):
        if "FlowInEx" in series_id or "FlowOutEx" in series_id:
            return None  # 거래소 입출금 — 원천의 주소 라벨 소급(security-sources.md: 판정 금지) → 사실로 잇지 않는다
        _, coin, metric = [*series_id.split(":"), "", ""][:3]
        return asset_id("crypto", coin.upper()), "asset", coin.upper(), f"onchain.{metric}"
    if source == "deribit" and series_id.startswith("dvol"):
        coin = series_id.split(":")[-1].upper() if ":" in series_id else "BTC"
        return asset_id("crypto", coin), "asset", coin, "dvol"
    if source == "coingecko" and series_id.startswith("cg:"):
        return market_id("crypto"), "asset", "코인 시장(업비트 원화)", f"global.{series_id[3:]}"
    return None


@dataclass(frozen=True, slots=True)
class DartRow:
    rcept_no: str
    stock_code: str
    report_name: str
    first_seen_at: datetime


@dataclass(frozen=True, slots=True)
class TitleRow:
    """국내 시황 · 공시 제목(serial) 또는 코인 기사(id)."""

    key: str
    origin: str  # news · disclosure · crypto
    title: str
    codes: tuple[str, ...]
    published_at: datetime


@dataclass(frozen=True, slots=True)
class XfRow:
    source_kind: str
    source_key: str
    symbols: tuple[str, ...]
    who: str | None
    what: str
    amount: float | None
    unit: str | None
    compared_to: str | None
    event_kind: str
    published_at: datetime | None
    available_at: datetime
    source_url: str | None
    source_name: str | None


@dataclass(frozen=True, slots=True)
class SchedRow:
    kind: str
    event_at: datetime
    announced_at: datetime
    symbol: str


@dataclass(frozen=True, slots=True)
class StatRow:
    kind: str
    symbol: str
    horizon_days: int
    as_of: datetime
    sample: int
    up_rate: float | None
    q50: float | None
    baseline_q50: float | None


@dataclass(frozen=True, slots=True)
class SignalRow:
    kind: str
    symbol: str
    event_at: datetime
    value: float | None


@dataclass(frozen=True, slots=True)
class SeriesRow:
    source: str
    series_id: str
    observed_at: datetime
    available_at: datetime
    value: float
    unit: str | None


@dataclass(frozen=True, slots=True)
class BetaRow:
    symbol: str
    asset_class: str
    as_of: datetime
    beta_market: float | None
    beta_sector: float | None
    sigma_daily: float | None


@dataclass(frozen=True, slots=True)
class StateRow:
    """지금 값만 주는 원천 한 행 — 종목 · 속성 · 값 · 받은 시각."""

    entity: str
    attribute: str
    value_text: str
    at: datetime
    source_kind: str


def _finite(x: float | None) -> float | None:
    return x if x is not None and math.isfinite(x) else None


def _kr_or_crypto(symbol: str) -> str:
    """원천 종목 표기 → 자산 id. 국내 6자리 · 업비트 `KRW-XXX` · 맨 심볼."""
    if symbol.isdigit() and len(symbol) == 6:
        return asset_id("kr", symbol)
    return asset_id("crypto", symbol.removeprefix("KRW-").upper())


def add_documents(g: Graph, dart: Sequence[DartRow], titles: Sequence[TitleRow]) -> None:
    for d in dart:
        doc = document_id("dart", d.rcept_no)
        g.entities.setdefault(doc, EntityRow(doc, "document", d.report_name, {"dart_rcept_no": d.rcept_no}))
        t = d.first_seen_at
        if d.stock_code:
            co = f"company:kr:{d.stock_code}"
            if co in g.entities:
                g.relations.append(RelationRow(co, "issued", doc, t, t, t, SRC_DART))
            g.relations.append(RelationRow(doc, "mentions", asset_id("kr", d.stock_code), t, t, t, SRC_DART))
    for n in titles:
        prefix = "crypto-news" if n.origin == "crypto" else "kr-news"
        doc = document_id(prefix, n.key)
        g.entities.setdefault(doc, EntityRow(doc, "document", n.title[:200], {prefix: n.key, "origin": n.origin}))
        codes = [c for c in n.codes if c]
        conf = 1.0 / len(codes) if codes else 0.0
        src = SRC_CRYPTO_NEWS if n.origin == "crypto" else SRC_KR_NEWS
        for c in codes:
            a = asset_id("crypto", c.upper()) if n.origin == "crypto" else asset_id("kr", c)
            t = n.published_at
            g.relations.append(RelationRow(doc, "mentions", a, t, t, t, src, conf))


def _xf_doc(r: XfRow) -> tuple[str, str]:
    prefix, _, key = r.source_key.partition(":")
    return {"dart": ("dart", key), "coin": ("crypto-news", key), "kr": ("kr-article", key)}.get(
        prefix, ("other", r.source_key)
    )


def add_extracted_facts(g: Graph, rows: Sequence[XfRow]) -> None:
    """본문 추출 사실 — 종목마다 숫자 사실(숫자가 없으면 문자열 사실은 '누가'만).

    문서 엔티티 · 언급으로 출처를 잇는다."""
    for r in rows:
        prefix, key = _xf_doc(r)
        doc = document_id(prefix, key)
        g.entities.setdefault(
            doc, EntityRow(doc, "document", r.source_name or r.source_key, {"source_key": r.source_key})
        )
        when = r.published_at or r.available_at
        attr = f"xf.{r.event_kind}.{r.what.strip()[:80]}"
        for sym in r.symbols:
            a = _kr_or_crypto(sym)
            g.relations.append(RelationRow(doc, "mentions", a, when, when, r.available_at, SRC_XF))
            text_v = r.compared_to or r.who
            g.facts.append(
                FactRow(a, attr, _finite(r.amount), text_v, r.unit, when, None, when, r.available_at, SRC_XF)
            )


def _sched_id(kind: str, at: datetime, symbol: str) -> str:
    return f"event:sched:{kind}:{at.isoformat()}" + (f":{symbol}" if symbol else "")


def add_schedule(g: Graph, sched: Sequence[SchedRow], stats: Sequence[StatRow]) -> None:
    for e in sched:
        ev = _sched_id(e.kind, e.event_at, e.symbol)
        name = f"{SCHED_NAMES.get(e.kind, e.kind)} {e.event_at.date().isoformat()}"
        g.entities.setdefault(ev, EntityRow(ev, "event", name, {"kind": e.kind, "event_at": e.event_at.isoformat()}))
        t = e.announced_at
        for m in SCHED_MARKETS.get(e.kind, ()):
            mk = market_id(m)
            if mk in g.entities:
                g.relations.append(RelationRow(ev, "affects", mk, e.event_at, e.event_at, t, SRC_SCHED))
        if e.symbol:
            g.relations.append(
                RelationRow(ev, "affects", _kr_or_crypto(e.symbol), e.event_at, e.event_at, t, SRC_SCHED)
            )
    for s in stats:
        a = _kr_or_crypto(s.symbol) if s.symbol else None
        if a is None:
            continue
        base = f"event.{s.kind}.h{s.horizon_days}"
        for attr, v in (
            ("up_rate", s.up_rate),
            ("q50", s.q50),
            ("baseline_q50", s.baseline_q50),
            ("sample", float(s.sample)),
        ):
            fv = _finite(v)
            if fv is not None:
                g.facts.append(
                    FactRow(a, f"{base}.{attr}", fv, None, None, s.as_of, None, s.as_of, s.as_of, SRC_EVENT_STAT)
                )


def add_signals(g: Graph, rows: Sequence[SignalRow]) -> None:
    for r in rows:
        a = _kr_or_crypto(r.symbol)
        ev = f"event:signal:{r.kind}:{r.symbol}:{r.event_at.isoformat()}"
        g.entities.setdefault(ev, EntityRow(ev, "event", f"{r.kind} {r.symbol}", {"kind": r.kind, "symbol": r.symbol}))
        t = r.event_at  # 신호는 마감 봉에서 정해진다(signals.py — 봉 available_at)
        g.relations.append(RelationRow(ev, "affects", a, t, t, t, SRC_SIGNAL))
        v = _finite(r.value)
        if v is not None:
            g.facts.append(FactRow(ev, "value", v, None, None, t, None, t, t, SRC_SIGNAL))


def add_series(g: Graph, rows: Sequence[SeriesRow]) -> int:
    """거시 · 시장 값. 반환: 표 밖이라 뺀 행 수."""
    skipped = 0
    for r in rows:
        tgt = series_target(r.source, r.series_id)
        if tgt is None:
            skipped += 1
            continue
        ent, kind, name, attr = tgt
        g.entities.setdefault(ent, EntityRow(ent, kind, name, {"series": f"{r.source}:{r.series_id}"}))
        day = timedelta(days=1)
        g.facts.append(FactRow(ent, attr, r.value, None, r.unit, r.observed_at, r.observed_at + day, r.observed_at,
                               r.available_at, SRC_SERIES))  # fmt: skip
    return skipped


def add_betas(g: Graph, rows: Sequence[BetaRow]) -> None:
    for r in rows:
        a = asset_id("kr", r.symbol) if r.asset_class == "kr" else _kr_or_crypto(r.symbol)
        for attr, v in (("beta_market", r.beta_market), ("beta_sector", r.beta_sector), ("sigma_daily", r.sigma_daily)):
            fv = _finite(v)
            if fv is not None:
                g.facts.append(FactRow(a, attr, fv, None, None, r.as_of, None, r.as_of, r.as_of, SRC_BETA))


def changed_states(rows: Sequence[StateRow], latest: Mapping[tuple[str, str], str]) -> list[FactRow]:
    """지금 값 원천 — 시각 순으로 직전 값(이미 저장된 마지막 값 포함)과 다를 때만 새 사실(불변식 3)."""
    last = dict(latest)
    out: list[FactRow] = []
    for r in sorted(rows, key=lambda x: x.at):
        k = (r.entity, r.attribute)
        if last.get(k) == r.value_text:
            continue
        last[k] = r.value_text
        out.append(FactRow(r.entity, r.attribute, None, r.value_text, None, r.at, None, r.at, r.at, r.source_kind))
    return out


def ensure_entities(g: Graph) -> int:
    """관계 · 사실이 가리키는데 엔티티가 없는 id(상장폐지 종목 코드 ·
    마스터 밖 심볼) — 버리지 않고 `unresolved` 로 남긴다
    (`ontology.md` §4). 반환: 만든 수(해소율 지표)."""
    made = 0
    refs = [r.subject for r in g.relations] + [r.object for r in g.relations] + [f.entity for f in g.facts]
    kinds: Mapping[str, EntityKind] = {
        k: k for k in ("asset", "company", "sector", "document", "event", "policy", "institution")
    }
    for ref in refs:
        if ref in g.entities:
            continue
        kind = kinds.get(ref.split(":", 1)[0], "asset")
        g.entities[ref] = EntityRow(ref, kind, ref.rsplit(":", 1)[-1], {"unresolved": "true"})
        made += 1
    return made
