"""소식 사건 종류 분류 — 사전등록 `news-reaction@1` [classify](FC-REQ-028 FR-3 · F017 단계 6). I/O 없음.

부분 문자열 대조만(정규식 아님) — 서버(`salt-server` market `newsKind`)가 같은 사전을
`forecast.v_news_kind_rule` 로 읽어 같은 답을 내야 한다.
공용 사례 `contracts/news-kind/cases.json` 을 양쪽 테스트가 읽는다.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

OTHER = "other"
MARKETS = ("kr", "crypto")
ORIGINS = ("disclosure", "news")


@dataclass(frozen=True, slots=True)
class KindRule:
    id: str
    text: str
    markets: tuple[str, ...]
    include: tuple[str, ...]
    exclude: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class Dictionary:
    rules: tuple[KindRule, ...]  # 순서가 우선순위 — 위에서부터 첫 맞음
    exclude: Mapping[str, tuple[str, ...]]  # 시장 → 먼저 거르는 낱말
    news_max_codes: int


def _words(v: object) -> tuple[str, ...]:
    if not isinstance(v, list):
        raise ValueError("낱말 목록이 아니다")
    items: list[object] = list(v)  # pyright: ignore[reportUnknownArgumentType]
    return tuple(str(w).lower() for w in items)


def _table(v: object) -> Mapping[str, object]:
    if not isinstance(v, Mapping):
        raise ValueError("표가 아니다")
    pairs: list[tuple[object, object]] = list(v.items())  # pyright: ignore[reportUnknownArgumentType, reportUnknownMemberType]
    return {str(k): x for k, x in pairs}


def from_prereg(spec: Mapping[str, object]) -> Dictionary:
    """사전등록 TOML(파싱된 dict) → 사전. 낱말은 소문자로."""
    classify_ = _table(spec["classify"])
    kinds = spec["kind"]
    if not isinstance(kinds, list):
        raise ValueError("사전등록에 [[kind]] 가 없다")
    rules: list[KindRule] = []
    entries: list[object] = list(kinds)  # pyright: ignore[reportUnknownArgumentType]
    for raw in entries:
        k = _table(raw)
        markets = _words(k["markets"])
        if not set(markets) <= set(MARKETS):
            raise ValueError(f"모르는 시장: {markets}")
        rules.append(KindRule(str(k["id"]), str(k["text"]), markets, _words(k["include"]), _words(k["exclude"])))
    ids = [r.id for r in rules]
    if len(set(ids)) != len(ids) or OTHER in ids:
        raise ValueError("종류 id 가 겹치거나 other 를 쓴다")
    exclude = {m: _words(classify_[f"exclude_{m}"]) for m in MARKETS}
    max_codes = classify_["news_max_codes"]
    if not isinstance(max_codes, int):
        raise ValueError("news_max_codes 가 정수가 아니다")
    return Dictionary(tuple(rules), exclude, max_codes)


def classify(d: Dictionary, market: str, origin: str, codes: int, title: str) -> str:
    """제목 → 종류 id. 못 맞히면 `other`. 뉴스 제목은 관련 종목이 `news_max_codes` 를 넘으면 `other`."""
    if market not in MARKETS or origin not in ORIGINS:
        raise ValueError(f"모르는 시장 · 출처: {market} · {origin}")
    if origin == "news" and codes > d.news_max_codes:
        return OTHER
    t = title.lower()
    if any(w in t for w in d.exclude[market]):
        return OTHER
    for r in d.rules:
        if market in r.markets and any(w in t for w in r.include) and not any(w in t for w in r.exclude):
            return r.id
    return OTHER
