"""뉴스 텍스트 → 구조(FC-REQ-016). 종목 연결 · 가리기 · 사건 태그 · 부정어 · 제목 정규화."""

from __future__ import annotations

from salt_forecast.domain.news_text import (
    MASK_EN,
    MASK_KO,
    build_aliases,
    detect_lang,
    event_tags,
    item_id,
    link_symbols,
    mask_assets,
    title_key,
)

MARKETS = [
    ("KRW-BTC", "비트코인", "Bitcoin"),
    ("KRW-ETH", "이더리움", "Ethereum"),
    ("KRW-ETC", "이더리움클래식", "Ethereum Classic"),
    ("KRW-XRP", "리플", "XRP"),
    ("KRW-SAFE", "세이프", "Safe"),
    ("KRW-GAS", "가스", "Gas"),
    ("KRW-ONE", "하모니", "Harmony"),
]
ALIASES = build_aliases(MARKETS)


def test_link_symbols_longest_name_wins() -> None:
    assert link_symbols("이더리움클래식 급등", ALIASES) == ("KRW-ETC",)
    assert link_symbols("이더리움·비트코인이 함께 올랐다", ALIASES) == ("KRW-BTC", "KRW-ETH")
    assert link_symbols("Ethereum Classic and BTC", ALIASES) == ("KRW-BTC", "KRW-ETC")


def test_ambiguous_names_are_not_linked() -> None:
    assert link_symbols("가스 요금 인상, 세이프 존 확대", ALIASES) == ()
    assert link_symbols("Safe investor asks watchdog; ONE more thing", ALIASES) == ()


def test_ticker_needs_word_boundary() -> None:
    assert link_symbols("BTCUSDT 선물", ALIASES) == ()
    assert link_symbols("XRP 공급 쇼크", ALIASES) == ("KRW-XRP",)


def test_mask_replaces_every_alias() -> None:
    assert mask_assets("비트코인, 리플 동반 상승", ALIASES, MASK_KO) == "[자산], [자산] 동반 상승"
    assert mask_assets("Bitcoin ETF inflows", ALIASES, MASK_EN) == "[ASSET] ETF inflows"


def test_event_tags_and_negation() -> None:
    assert event_tags("현물 ETF 승인 불발") == (("etf",), True)
    assert event_tags("SEC rejects spot ETF") == (("etf", "regulation"), True)
    assert event_tags("거래소 해킹으로 400억 탈취") == (("hack",), False)
    assert event_tags("업비트 원화마켓 신규 상장") == (("listing",), False)
    assert event_tags("빗썸, 거래지원 종료 안내") == (("delisting",), False)
    assert event_tags("비트코인 8만 달러 회복") == ((), False)


def test_listing_is_exchange_listing_only() -> None:
    for text in (
        "우군없는 빗썸, 비상장 주가 -60%",
        "나스닥 상장사 BGIN 사업 소개",
        "나스닥서 텍사스증권거래소로 상장 이전",
    ):
        assert "listing" not in event_tags(text)[0], text
    assert "listing" in event_tags("Token lists on Binance today")[0]


def test_title_key_ignores_publisher_suffix_and_punctuation() -> None:
    assert title_key("비트코인 8만 달러 회복 - 매일경제") == title_key("비트코인, 8만 달러 회복! - 한국경제")
    assert title_key("비트코인 8만 달러 회복") != title_key("비트코인 9만 달러 회복")


def test_item_id_drops_tracking_params() -> None:
    a = item_id("https://Example.com/a?id=1&utm_source=rss#top")
    assert a == item_id("https://example.com/a?id=1")
    assert a != item_id("https://example.com/a?id=2")


def test_detect_lang() -> None:
    assert detect_lang("비트코인 ETF 순유입") == "ko"
    assert detect_lang("Bitcoin ETF inflows 3일째") == "en"
