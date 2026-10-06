"""뉴스 텍스트 → 구조(F010 슬라이스 6 3차 · FC-REQ-016 · 사전등록 news-sentiment@1). 순수 함수, I/O 없음.

## 왜 규칙 태그와 모델 점수를 둘 다 두나

리서치 §2-3: 서버의 키워드 감성은 부정문("ETF 승인 **불발**" → 강세) · 부분 문자열 · 중복("ETF 승인"+"ETF"+"승인") ·
이중 계산 문제가 있다. 그 자리를 금융 특화 분류 모델(로컬 FinBERT, `data-pipeline.md` §5)이 맡는다. 그런데 모델을
시험해 보니(2026-10-06) "거래소 해킹으로 400억 탈취"를 중립으로 읽었다 — 암호화폐 악재 어휘를 모른다. 그래서
**사건 종류는 규칙으로 따로** 붙이고(부정어 표시 포함), 둘을 사전등록에서 각각 채점한다.

## 종목명을 가린다

리서치 §6-2 · 근거 [강]: 회사명을 익명화하면 원문보다 성능이 좋았다(모델이 아는 이름의 인상이 섞인다).
모델 입력에서는 별칭을 `[자산]` / `[ASSET]` 로 바꾼다. 종목 연결은 가리기 전 원문으로 한다.
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

MASK_KO = "[자산]"
MASK_EN = "[ASSET]"
SUMMARY_MAX = 500

# 추적 매개변수 — 같은 기사가 다른 URL 로 두 번 들어오지 않게 지운다
_TRACKING = re.compile(r"^(utm_|fbclid$|gclid$|ref$|ocid$)")


def normalize_url(url: str) -> str:
    parts = urlsplit(url.strip())
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query) if not _TRACKING.match(k)])
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path, query, ""))


def item_id(url: str) -> str:
    return hashlib.sha256(normalize_url(url).encode()).hexdigest()[:32]


# Google News 제목은 "제목 - 매체명" 으로 끝난다. 같은 기사가 매체 표기만 달리 여러 피드로 온다
_PUBLISHER_SUFFIX = re.compile(r"\s+[-–|]\s+[^-–|]{1,40}$")
_NON_WORD = re.compile(r"[^0-9a-z가-힣]+")


def normalize_title(title: str) -> str:
    return _NON_WORD.sub("", _PUBLISHER_SUFFIX.sub("", title.strip()).lower())


def title_key(title: str) -> str:
    return hashlib.sha256(normalize_title(title).encode()).hexdigest()[:32]


def detect_lang(text: str) -> str:
    """글자 중 한글이 30% 이상이면 ko. 영어 피드에 한국어 사전을 대던 서버 문제(§2-3)를 여기서 가른다."""
    hangul = sum(1 for c in text if "가" <= c <= "힣")
    latin = sum(1 for c in text if c.isascii() and c.isalpha())
    return "ko" if hangul + latin and hangul / (hangul + latin) >= 0.3 else "en"


# ---------------------------------------------------------------- 별칭


@dataclass(frozen=True, slots=True)
class AssetAlias:
    symbol: str  # KRW-BTC
    name: str  # 비트코인 · Bitcoin · BTC
    kind: str  # ko · en · ticker


# 영문 이름 · 티커가 흔한 낱말과 같으면 잇지 않는다 — "ONE"(하모니) · "SAND" · "Flow" 가 기사마다 걸린다
_AMBIGUOUS = frozenset(
    [
        "ONE",
        "SUN",
        "FLOW",
        "SAND",
        "GAS",
        "MASK",
        "STORJ",
        "POWER",
        "WAVES",
        "HUNT",
        "META",
        "BORA",
        "ANKR",
        "MOVE",
        "ME",
        "BLUR",
        "PUNDIX",
        "ID",
        "GO",
        "AUCTION",
        "BOUNTY",
        "ORCA",
        "BIGTIME",
        "UNI",
        "ARK",
        "OM",
        "COMP",
        "CHZ",
        "RAY",
        "BEAM",
        "BLAST",
        "ZETA",
        "PYTH",
        "JUP",
        "AERGO",
        "IOST",
        "CARV",
        "MOCA",
        "ATH",
        "SOON",
        "DRIFT",
        "LAYER",
        "WALK",
        "ALT",
        "NEAR",
        "APT",
        "SEI",
        "SUI",
        "ICX",
        "XEC",
        "IQ",
        "T",
        "W",
        "G",
    ]
)
_COMMON_EN = frozenset(
    [
        "flow",
        "sand",
        "gas",
        "mask",
        "power",
        "waves",
        "hunt",
        "near",
        "move",
        "blur",
        "beam",
        "blast",
        "layer",
        "walk",
        "drift",
        "soon",
        "orca",
        "bounty",
        "auction",
        "status",
        "civic",
        "loom",
        "theta",
        "kava",
        "polygon",
        "safe",
        "edge",
        "open",
        "act",
        "omni",
        "zero",
        "pundi",
        "magic",
        "vana",
        "hyper",
        "story",
        "major",
        "solv",
    ]
)
# 한글명이 일상어와 같은 것 — "가스 요금" · "세이프 존" · "파워 게임"
AMBIGUOUS_KO = frozenset(
    [
        "가스",
        "세이프",
        "스톰",
        "웨이브",
        "웨이브즈",
        "파워",
        "무브",
        "블러",
        "썬",
        "엣지",
        "플로우",
        "샌드",
        "마스크",
        "헌트",
        "보라",
        "메타",
        "아크",
        "레이어",
        "오픈",
        "매직",
        "스토리",
        "메이저",
        "제로",
        "옴니",
        "하이퍼",
        "체인",
        "카바",
        "스택스",
    ]
)


_PAREN = re.compile(r"^(.*?)\s*\((.*?)\)\s*$")


def korean_names(name: str) -> tuple[str, ...]:
    """업비트 한글명 → 쓰이는 이름들. "엑스알피(리플)" → ("엑스알피", "리플")."""
    m = _PAREN.match(name.strip())
    return tuple(n for n in (m.group(1).strip(), m.group(2).strip()) if n) if m else (name.strip(),)


def search_keyword(name: str) -> str | None:
    """데이터랩 검색어 — 괄호 앞 이름 하나(search-interest@1). 일상어와 같은 이름 · 한 글자는 None."""
    main = korean_names(name)[0]
    return main if len(main) >= 2 and main not in AMBIGUOUS_KO else None


def build_aliases(markets: Iterable[tuple[str, str, str]]) -> list[AssetAlias]:
    """업비트 원화 마켓 (market, 한글명, 영문명) → 별칭.

    긴 이름이 먼저 — "이더리움클래식"이 "이더리움"보다 먼저 맞는다.
    """
    out: list[AssetAlias] = []
    for market, ko, en in markets:
        ticker = market.removeprefix("KRW-")
        # "엑스알피(리플)" — 괄호 안팎이 둘 다 쓰이는 이름이다
        for name in korean_names(ko):
            if len(name) >= 2 and name not in AMBIGUOUS_KO:
                out.append(AssetAlias(market, name, "ko"))
        if len(en) >= 4 and en.lower() not in _COMMON_EN:
            out.append(AssetAlias(market, en, "en"))
        if len(ticker) >= 3 and ticker not in _AMBIGUOUS:
            out.append(AssetAlias(market, ticker, "ticker"))
    return sorted(out, key=lambda a: (-len(a.name), a.name))


def _pattern(alias: AssetAlias) -> re.Pattern[str]:
    name = re.escape(alias.name)
    if alias.kind == "ticker":  # 대문자 그대로 · 낱말 경계
        return re.compile(rf"(?<![A-Za-z0-9]){name}(?![A-Za-z0-9])")
    if alias.kind == "en":
        return re.compile(rf"(?<![A-Za-z0-9]){name}(?![A-Za-z0-9])", re.IGNORECASE)
    return re.compile(name)  # 한국어는 조사가 붙는다("비트코인이") — 앞뒤 경계를 보지 않는다


@dataclass(frozen=True, slots=True)
class _Hit:
    start: int
    end: int
    symbol: str


def _hits(text: str, aliases: Sequence[AssetAlias]) -> list[_Hit]:
    taken: list[_Hit] = []
    for alias in aliases:  # 긴 이름부터 — 이미 잡힌 자리는 다시 잡지 않는다
        for m in _pattern(alias).finditer(text):
            if all(m.end() <= h.start or m.start() >= h.end for h in taken):
                taken.append(_Hit(m.start(), m.end(), alias.symbol))
    return sorted(taken, key=lambda h: h.start)


def link_symbols(text: str, aliases: Sequence[AssetAlias]) -> tuple[str, ...]:
    return tuple(sorted({h.symbol for h in _hits(text, aliases)}))


def mask_assets(text: str, aliases: Sequence[AssetAlias], token: str) -> str:
    out: list[str] = []
    at = 0
    for h in _hits(text, aliases):
        out.append(text[at : h.start])
        out.append(token)
        at = h.end
    out.append(text[at:])
    return "".join(out)


# ---------------------------------------------------------------- 사건 태그

EVENT_RULES: dict[str, re.Pattern[str]] = {
    "hack": re.compile(r"해킹|탈취|도난|익스플로잇|\bexploit|\bhack(ed|er|ers|s)?\b|\bdrain(ed)?\b|\bstolen\b", re.I),
    "regulation": re.compile(
        r"규제|제재|소송|기소|압수|금지|조사\s*착수|\bSEC\b|lawsuit|\bsue[sd]?\b|\bban(ned|s)?\b|crackdown|"
        r"\bprobe\b|\bcharged\b|enforcement",
        re.I,
    ),
    "etf": re.compile(r"\bETF", re.I),
    # 거래소 상장만 — "비상장 주가" · "나스닥 상장사" · "상장 이전"은 코인 상장이 아니다
    "listing": re.compile(
        r"(?<!비)신규\s*상장|(업비트|빗썸|코인원|코빗|바이낸스|코인베이스|원화\s*마켓)[^.。\n]{0,12}(?<!비)상장(?!\s*(폐지|사|이전|주))|"
        r"\blist(s|ed|ing)?\s+on\s+(Binance|Coinbase|Upbit|Bithumb|Kraken|OKX|Bybit)",
        re.I,
    ),
    "delisting": re.compile(r"상장\s*폐지|거래\s*지원\s*종료|투자\s*유의|유의\s*종목|\bdelist", re.I),
    "macro": re.compile(r"금리|FOMC|연준|\bCPI\b|인플레이션|\bFed\b|rate\s+(cut|hike)|inflation", re.I),
    "institution": re.compile(
        r"기관\s*(투자|매수|매입)|블랙록|BlackRock|treasury|스트래티지|MicroStrategy|\bStrategy\b"
    ),
}
NEGATION = re.compile(
    r"불발|무산|거부|기각|철회|연기|부인|취소|반려|"
    r"\breject(ed|s)?\b|\bden(y|ied|ies)\b|\bdelay(ed|s)?\b|\bpostpone|\bwithdr[ae]w|\bdismiss(ed)?\b",
    re.I,
)


def event_tags(text: str) -> tuple[tuple[str, ...], bool]:
    """(사건 종류 알파벳 순, 부정어 여부). 부정어는 사건이 하나라도 있을 때만 의미가 있다."""
    kinds = tuple(sorted(k for k, p in EVENT_RULES.items() if p.search(text)))
    return kinds, bool(kinds) and bool(NEGATION.search(text))
