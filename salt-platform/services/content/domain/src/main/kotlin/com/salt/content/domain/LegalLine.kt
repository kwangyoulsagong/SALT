package com.salt.content.domain

import java.net.URI

/**
 * 법적 선 검사기(`SRV-REQ-047` FR-5 · FEATURE-014 FR-5) — 금융 팁은 **공적 제도 설명만** 한다. 글 문장 하나라도 걸리면 발행 실패.
 *
 * 금소법(광고 · 중개)과 자본시장법(유사투자자문)의 선을 넘는 꼴을 잡는다. 법무 확인(FEATURE-014 열린 질문) 전이라
 * **넓게 잡는다** — 놓치는 것보다 글쓴이가 문장을 고치는 편이 싸다.
 *
 * 투자 코치 검증기(Express `coach/domain/policy/languageGuard.ts`)의 확신 · 명령형 · 완곡 권유 꼴을 옮겨 왔다. 언어가 달라
 * 한 파일을 같이 쓰지 못한다 — 코치가 Kotlin 으로 옮겨 오는 S6(`SRV-REQ-049` FR-4)에 둘을 한 모듈로 합친다(이 REQ 의 FR-5 "공용 모듈").
 */
object LegalLine {
    enum class Violation(val key: String) {
        PRODUCT_NAME("product_name"),
        RATE_COMPARISON("rate_comparison"),
        SIGNUP_LINK("signup_link"),
        IMPERATIVE("imperative"),
        SECURITY("security"),
        TRADE_TIMING("trade_timing"),
        CERTAINTY("certainty"),
    }

    // 금융회사 이름 — 회사 + 업권 말이 붙은 꼴만(“하나의” · “우리는” 같은 말을 잡지 않는다)
    private val COMPANY = Regex(
        "(KB|NH|IBK|SC|국민|신한|우리|하나|농협|기업|제일|씨티|카카오|케이|토스|부산|대구|경남|광주|전북|제주|수협|삼성|미래에셋|한국투자|키움|현대|롯데|BC)\\s?" +
            "(은행|뱅크|증권|카드|저축은행|생명|화재|손해보험|캐피탈|페이)",
    )

    // 상품을 고르게 하는 말 — 특정 상품 추천 · 순위
    private val PRODUCT_PICK = Regex("(추천\\s?(상품|통장|카드|적금|예금)|(상품|통장|카드|적금|예금)\\s?(추천|순위|베스트|TOP))", RegexOption.IGNORE_CASE)

    private val RATE = Regex("(금리|이자율|우대\\s?금리)\\s?(비교|순위|높은|최고|더\\s?(높|주))|최고\\s?금리|고금리|연\\s?\\d+(\\.\\d+)?\\s?%\\s?(금리|이자)|금리\\s?\\d+(\\.\\d+)?\\s?%")

    private val SIGNUP = Regex("(가입\\s?(하기|링크|바로\\s?가기)|지금\\s?가입|바로\\s?가입|신청\\s?바로\\s?가기|https?://|www\\.)", RegexOption.IGNORE_CASE)

    // 명령형 · 권유 — 제도 설명은 “~할 수 있어요 · ~이에요”로 쓴다. “-세요 · -십시오 · -하라”와 권유 말을 막는다
    private val IMPERATIVE = Regex(
        "([가-힣](세요|십시오)(?![가-힣])|(하라|해라)(?![가-힣])|추천합니다|권합니다|권해요|추천해요|해야\\s?(합니다|해요)|[는은]\\s?(것이|게|편이)\\s?(좋|유리|낫|바람직)|놓치지\\s?마|챙기세요|서두르)",
    )

    private val SECURITY = Regex("(종목|주식\\s?(추천|매수|매도)|(?<!\\d)\\d{6}(?!\\d)|ETF\\s?추천|코인\\s?추천)", RegexOption.IGNORE_CASE)

    private val TRADE_TIMING = Regex("(매수|매도|사세요|파세요|살\\s?때|팔\\s?때|타이밍|적기|저점|고점)")

    // “보장하지 않아요” · “보호돼요”는 통과 — 부정형은 면책이다
    private val CERTAINTY = Regex("(무조건|확실히|틀림없|반드시\\s?(받|돌려|오르)|100\\s?%\\s?(환급|보장|받)|보장(?!\\s?(하지|되지|되는\\s?것은\\s?아니|받지)))")

    fun violations(text: String): List<Violation> = buildList {
        if (COMPANY.containsMatchIn(text) || PRODUCT_PICK.containsMatchIn(text)) add(Violation.PRODUCT_NAME)
        if (RATE.containsMatchIn(text)) add(Violation.RATE_COMPARISON)
        if (SIGNUP.containsMatchIn(text)) add(Violation.SIGNUP_LINK)
        if (IMPERATIVE.containsMatchIn(text)) add(Violation.IMPERATIVE)
        if (SECURITY.containsMatchIn(text)) add(Violation.SECURITY)
        if (TRADE_TIMING.containsMatchIn(text)) add(Violation.TRADE_TIMING)
        if (CERTAINTY.containsMatchIn(text)) add(Violation.CERTAINTY)
    }

    /**
     * 출처는 공식 페이지만 — 정부(`.go.kr`) · 법령 · 공공기관 몇 곳. 금융회사 · 비교 사이트 · 블로그 주소는 가입 링크와 같은 선을 넘는다.
     * 공공기관을 더하려면 이 목록에 한 줄(PR 리뷰가 검수).
     */
    fun officialSource(url: String): Boolean {
        val uri = runCatching { URI(url) }.getOrNull() ?: return false
        if (uri.scheme != "https") return false
        val host = uri.host?.lowercase() ?: return false
        return host.endsWith(".go.kr") || host in PUBLIC_HOSTS
    }

    private val PUBLIC_HOSTS = setOf("www.kdic.or.kr", "kdic.or.kr", "www.fss.or.kr", "fine.fss.or.kr")
}
