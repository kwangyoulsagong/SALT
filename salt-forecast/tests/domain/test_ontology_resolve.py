"""식별자 해소 — 제목 → 종목(FC-REQ-022 FR-10~12). 경계 표: 표본에서 실제로 틀렸던 모양 그대로."""

from __future__ import annotations

import pytest

from salt_forecast.domain.ontology_sources import (
    LINK_CONFIDENT,
    LINK_WEAK,
    coin_name_index,
    kr_name_index,
    mine_cooccurring_words,
    names_in_title,
    resolve_mentions,
    with_ambiguous,
)

KR = kr_name_index(
    [("005930", "삼성전자"), ("000660", "SK하이닉스"), ("005380", "현대차"), ("373220", "LG에너지솔루션"),
     ("003550", "LG"), ("352820", "하이브"), ("039490", "키움증권"), ("004170", "신세계"), ("036570", "NC")],
    {"036570": frozenset({"엔씨"}), "005380": frozenset({"제네시스"})},
)  # fmt: skip
COIN = coin_name_index(
    [("KRW-BTC", "비트코인", "Bitcoin"), ("ETH", "이더리움", "Ethereum"), ("XRP", "엑스알피(리플)", "XRP"),
     ("MMT", "모멘텀", "Momentum"), ("USDT", "테더", "Tether")]
)  # fmt: skip


@pytest.mark.parametrize(
    ("title", "want"),
    [
        ("삼성전자,현대차, 미래산업 '원팀'", {"005930", "005380"}),  # 쉼표 경계 · 둘 다
        ("삼성,현대차 '원팀'", {"005380"}),  # '삼성' 은 종목명이 아니다(약칭 손 별칭 0)
        ("LG는 3분기", {"003550"}),  # 라틴 이름 뒤 조사
        ("현대차는 쏘카와", {"005380"}),  # 뒤 조사 허용
        ("하이브리드 차량용 부품", set[str]()),  # 단어 속 '하이브' 아님
        ("LG엔솔 버테크", set[str]()),  # 'LG엔솔' 의 'LG' 는 LG(지주) 아님 — 뒤가 조사 아닌 한글
        ("[리포트 브리핑]신세계, '자산효과 둔화' 목표가 - 키움증권", {"004170"}),  # 끝 출처 꼬리는 뗀다
        ("엔씨 매출 주요기둥으로", set[str]()),  # 같이 나온 말은 이름이 아니다(새 종목 더하지 않음)
    ],
)
def test_kr_names_in_title(title: str, want: set[str]) -> None:
    assert names_in_title(title, KR) == want


@pytest.mark.parametrize(
    ("title", "want"),
    [
        ("Bitcoin plunges to $68,000", {"BTC"}),
        ("momentum gauge is turning red", set[str]()),  # 영문명은 대소문자 그대로 — 일반어 아님
        ("리플(XRP) 6% 급등", {"XRP"}),  # 괄호 속 별칭 · 심볼
        ("이더리움과 알트코인", {"ETH"}),
        ("테더코인으로 자금세탁", set[str]()),  # 한글 이름 뒤 한글(조사 아님) — 놓친다(재현율 손해를 받아들임)
    ],
)
def test_coin_names_in_title(title: str, want: set[str]) -> None:
    assert names_in_title(title, COIN) == want


def test_kr_source_link_confirmed_by_name_or_cooccurring_word() -> None:
    assert resolve_mentions("엔씨 매출 주요기둥으로", ["036570"], KR, market="kr") == {"036570": LINK_CONFIDENT}
    assert resolve_mentions("제네시스 GV90 출시", ["005380"], KR, market="kr") == {"005380": LINK_CONFIDENT}
    # 제목이 받치지 않는 KIS 연결은 약하게(지우지 않음)
    assert resolve_mentions("日, 엔화 방어에 하루 68조", ["005930"], KR, market="kr") == {"005930": LINK_WEAK}
    # 제목에 나온 다른 상장사는 더한다(재현율)
    got = resolve_mentions("삼성전자·현대차 동맹", ["005930"], KR, market="kr")
    assert got == {"005930": LINK_CONFIDENT, "005380": LINK_CONFIDENT}


def test_list_titles_are_weak_and_add_nothing() -> None:
    got = resolve_mentions("코스닥 상승률 상위 20종목(직전 30분 기준)", ["005930"], KR, market="kr")
    assert got == {"005930": LINK_WEAK}
    # 이름이 나와도 목록이면 약하게 · 목록 속 다른 이름을 더하지 않는다
    got = resolve_mentions("코스피 상승률 상위 50종목 — 삼성전자 · 현대차", ["005930"], KR, market="kr")
    assert got == {"005930": LINK_WEAK}


def test_coin_unknown_symbols_dropped_and_names_added() -> None:
    # 서버 키워드가 붙인 약어(MBC · BIT)는 업비트 목록에 없어 버리고, 영문명 Bitcoin 으로 BTC 를 더한다
    got = resolve_mentions("Bitcoin heads for sixth weekly loss - MBC", ["BIT", "MBC"], COIN, market="crypto")
    assert got == {"BTC": LINK_CONFIDENT}
    # 업비트 목록에 있어도 제목이 받치지 않으면 약하게
    assert resolve_mentions("거래소 해킹 정황", ["KRW-ETH"], COIN, market="crypto") == {"ETH": LINK_WEAK}


def test_mine_cooccurring_words_threshold() -> None:
    titles = [(f"엔씨 소식{i}", ["036570"]) for i in "가나다라마"] + [("엔씨 잡담", [])]
    titles += [(f"안경 출시{i}", ["005930"]) for i in "가나다라"]
    cooc = mine_cooccurring_words(titles)
    assert cooc.get("036570") == frozenset({"엔씨"})  # 6번 중 5번(83%) ≥ 80% · 5번 이상
    assert "005930" not in cooc  # 4번뿐(COOC_MIN 5 미만)


def test_ambiguous_names_confirm_but_never_add() -> None:
    """'대상'(회사명 = 일반어) — 원천이 붙였을 때만. 제목에 나왔다고 새로 더하지 않는다(FR-12)."""
    idx = kr_name_index([("001680", "대상"), ("005930", "삼성전자")])
    titles: list[tuple[str, list[str]]] = [(f"수출 대상 확대{i}", []) for i in range(12)]
    titles.append(("대상 3분기 실적", ["001680"]))
    amb = with_ambiguous(idx, titles)
    assert amb.ambiguous == frozenset({"001680"})
    assert resolve_mentions("지원 대상 확대", [], amb, market="kr") == {}
    assert resolve_mentions("대상, 3분기 영업익", ["001680"], amb, market="kr") == {"001680": LINK_CONFIDENT}
