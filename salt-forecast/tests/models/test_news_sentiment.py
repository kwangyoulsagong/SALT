"""감성 점수 조립(FC-REQ-016) — 모델은 가짜, 연결 · 가리기 · 태그 · 버전을 본다. torch 없이 돈다."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from salt_forecast.domain.news_text import build_aliases
from salt_forecast.models.news_sentiment import SPECS, Sentiment, SentimentModel, score_items
from salt_forecast.store.news import Unscored

NOW = datetime(2026, 10, 6, tzinfo=UTC)
ALIASES = build_aliases([("KRW-BTC", "비트코인", "Bitcoin")])


class _Fake(SentimentModel):
    def __init__(self, lang: str) -> None:
        super().__init__(SPECS[lang], None, None)
        self.seen: list[str] = []

    def classify(self, texts: Sequence[str]) -> list[Sentiment]:
        self.seen.extend(texts)
        return [Sentiment(0.7, 0.2, 0.1) for _ in texts]


def test_masks_before_model_and_links_from_original() -> None:
    ko, en = _Fake("ko"), _Fake("en")
    items = [Unscored("a", "ko", "비트코인 현물 ETF 승인 불발"), Unscored("b", "en", "Bitcoin hacked")]
    rows = score_items(items, ALIASES, {"ko": ko, "en": en}, NOW)
    assert ko.seen == ["[자산] 현물 ETF 승인 불발"]
    assert en.seen == ["[ASSET] hacked"]
    a, b = rows
    assert (a.symbols, a.event_kinds, a.negated) == (("KRW-BTC",), ("etf",), True)
    assert (b.symbols, b.event_kinds, b.negated) == (("KRW-BTC",), ("hack",), False)
    assert abs(a.score - 0.6) < 1e-12
    assert a.model_version.startswith("news-sentiment@1:kr-finbert-sc@")


def test_language_without_model_is_skipped() -> None:
    rows = score_items([Unscored("b", "en", "Bitcoin")], ALIASES, {"ko": _Fake("ko")}, NOW)
    assert rows == []


def test_versions_differ_by_language_and_are_pinned() -> None:
    assert SPECS["ko"].version != SPECS["en"].version
    assert all(len(s.sha256) == 64 and len(s.revision) == 40 for s in SPECS.values())
