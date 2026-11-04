package com.salt.household.domain

import com.salt.kernel.Money
import java.math.BigDecimal
import java.time.LocalDate

/**
 * 입력 파싱(FR-3 · FR-4) — 순수 함수. **원문은 이 함수의 인자로만 산다**: 저장 · 로그 · 예외 메시지 어디에도 원문 조각을 싣지 않는다
 * (`SRV-REQ-046` FR-4 · 수용 기준 1). 실패는 이유 키로만 돌려준다.
 *
 * 금액은 정규식으로 확정한다(LLM 0 — 슬라이스 판단 5). 분류는 낱말 표([CategoryRules]) — 최근 같은 가맹점의 분류가 있으면 그쪽이 이긴다(유스케이스).
 */
data class ParsedCandidate(
    val amount: Money,
    val merchant: String?,
    val spentOn: LocalDate,
    val installmentMonths: Int?,
    val paymentMethod: PaymentMethod,
    val category: Category?,
)

/** 버린 조각의 이유 — 원문 없이 키만 */
enum class SkipReason(val key: String) {
    CANCELLED("cancelled"),
    NO_AMOUNT("no_amount"),
}

data class ParseResult(val candidates: List<ParsedCandidate>, val skipped: List<SkipReason>)

object CategoryRules {
    /** 낱말 → 분류. 긴 낱말이 먼저 맞는다("메가박스" 가 "메가커피" 보다 앞서지 않게 길이로 고른다) */
    private val WORDS: Map<String, Category> = buildMap {
        fun put(category: Category, vararg words: String) = words.forEach { put(it.lowercase(), category) }
        put(Category.FOOD, "점심", "저녁", "아침", "식당", "밥", "배달", "배민", "배달의민족", "요기요", "쿠팡이츠", "치킨", "피자", "김밥", "국밥", "분식", "식사", "맥도날드", "버거킹", "롯데리아", "버거")
        put(Category.CAFE, "커피", "카페", "스타벅스", "투썸", "이디야", "메가커피", "메가mgc", "빽다방", "컴포즈", "할리스", "폴바셋", "베이커리", "파리바게뜨", "뚜레쥬르", "빵", "디저트", "간식", "편의점", "gs25", "cu", "세븐일레븐", "이마트24")
        put(Category.TRANSPORT, "택시", "버스", "지하철", "교통", "주유", "기름", "카카오t", "톨게이트", "하이패스", "주차", "ktx", "srt", "코레일", "티머니")
        put(Category.HOUSING, "월세", "관리비", "전기", "가스", "수도", "전기요금", "도시가스")
        put(Category.TELECOM, "통신", "휴대폰", "핸드폰", "인터넷", "skt", "kt", "lg유플러스", "유플러스", "알뜰폰")
        put(Category.SHOPPING, "쿠팡", "옷", "신발", "무신사", "올리브영", "백화점", "쇼핑", "11번가", "g마켓", "지마켓", "옥션", "에이블리", "29cm", "지그재그")
        put(Category.LIVING, "마트", "이마트", "홈플러스", "롯데마트", "코스트코", "다이소", "생활", "세탁", "미용실")
        put(Category.HEALTH, "병원", "약국", "의원", "치과", "한의원", "약")
        put(Category.CULTURE, "영화", "cgv", "메가박스", "롯데시네마", "넷플릭스", "유튜브", "공연", "책", "서점", "교보문고", "yes24", "알라딘", "여행", "숙소", "호텔", "헬스", "운동")
        put(Category.EDUCATION, "학원", "강의", "교육", "수강", "인강")
        put(Category.GIFT, "축의금", "조의금", "경조사", "선물", "부조", "생일")
    }
    private val BY_LENGTH = WORDS.entries.sortedByDescending { it.key.length }

    fun suggest(text: String?): Category? {
        if (text.isNullOrBlank()) return null
        val t = text.lowercase()
        return BY_LENGTH.firstOrNull { t.contains(it.key) }?.value
    }
}

object InputParser {
    /** 한 요청의 원문 상한 — 문자 30건 남짓. 넘으면 형식 오류(원문을 되돌려 주지 않는다) */
    const val TEXT_MAX = 6_000
    const val CANDIDATES_MAX = 30

    // ---------- 한 줄: "점심 12000" · "12,000 스타벅스" · "택시 1.2만" · "3만5천 저녁" · "커피 4500원" ----------

    // 영문 · 숫자에 붙은 숫자는 금액이 아니다("GS25" 의 25). 한글 뒤는 허용("점심12000")
    private const val NOT_AFTER = """(?<![A-Za-z\d.,])"""
    private val MAN = Regex(NOT_AFTER + """(\d+(?:\.\d+)?)\s*만(?:\s*(\d+)\s*천)?\s*원?""")
    private val CHEON = Regex(NOT_AFTER + """(\d+(?:\.\d+)?)\s*천\s*원?""")
    private val PLAIN = Regex(NOT_AFTER + """(\d{1,3}(?:,\d{3})+|\d+)(?![A-Za-z\d])\s*원?""")

    fun line(text: String, today: LocalDate): ParseResult {
        val t = text.trim().take(200)
        val match = amountIn(t) ?: return ParseResult(emptyList(), listOf(SkipReason.NO_AMOUNT))
        val (amount, range) = match
        val label = (t.removeRange(range)).replace(Regex("\\s+"), " ").trim().ifBlank { null }
        val candidate = ParsedCandidate(Money.krw(amount), label?.take(Expense.MERCHANT_MAX), today, null, PaymentMethod.CARD, CategoryRules.suggest(label))
        return ParseResult(listOf(candidate), emptyList())
    }

    private fun amountIn(t: String): Pair<BigDecimal, IntRange>? {
        MAN.find(t)?.let { m ->
            val man = BigDecimal(m.groupValues[1]).multiply(BigDecimal(10_000))
            val cheon = m.groupValues[2].takeIf { it.isNotEmpty() }?.let { BigDecimal(it).multiply(BigDecimal(1_000)) } ?: BigDecimal.ZERO
            return positive(man + cheon)?.let { it to m.range }
        }
        CHEON.find(t)?.let { m -> return positive(BigDecimal(m.groupValues[1]).multiply(BigDecimal(1_000)))?.let { it to m.range } }
        PLAIN.find(t)?.let { m -> return positive(BigDecimal(m.groupValues[1].replace(",", "")))?.let { it to m.range } }
        return null
    }

    /** 원 아래는 버리지 않고 그대로 둔다 — "1.25만" 은 12,500 원. 0 이하는 금액이 아니다 */
    private fun positive(v: BigDecimal): BigDecimal? = v.takeIf { it.signum() > 0 }?.stripTrailingZeros()

    // ---------- 결제 문자 여러 건 ----------

    private val WEB_MARK = Regex("""\[\s*web\s*발신\s*]""", RegexOption.IGNORE_CASE)

    /** 카드번호 · 이름을 **파싱 전에** 지운다(FR-4). 지운 뒤에도 남는 숫자 꼴(누적 · 잔액)은 금액으로 오인하지 않게 같이 지운다 */
    private val MASKS = listOf(
        // 1234-56**-****-7890 · 1234****5678 · ****1234 · (1234) · 카드 뒤 4자리
        Regex("""\d{4}[-\s]?[\d*]{2,4}[-\s]?[*]{2,4}[-\s]?\d{0,4}"""),
        Regex("""[*＊]{2,}\d{2,4}"""),
        Regex("""\(\s*\d{3,4}\s*\)"""),
        Regex("""(?<=카드|체크|신용|국민|삼성|신한|현대|롯데|하나|우리|농협|BC|비씨|씨티|IBK|기업|KB|NH)\s?\d{3,4}(?=\s?(?:승인|취소|\s|$))"""),
        // 홍*동 · 홍*동님 · 홍길동님 · 고객님
        Regex("""[가-힣][*＊][가-힣]{0,3}\s?님?"""),
        Regex("""[가-힣]{2,4}\s?님"""),
        // 누적 · 잔액 · 한도 금액 — 결제 금액이 아니다
        Regex("""(?:누적|잔액|한도|사용가능|가용)\s*:?\s*-?[\d,]+\s*원?"""),
    )

    private val AMOUNT_WON = Regex("""(?<![\d,])(\d{1,3}(?:,\d{3})+|\d+)\s*원""")
    private val INSTALLMENT = Regex("""(\d{1,2})\s*개월""")
    private val DATE_TIME = Regex("""(\d{1,2})[/.-](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?""")
    private val CANCEL = Regex("""취소""")

    /** 가맹점 후보에서 지울 낱말 — 카드 머리 · 결제 종류 · 날짜 · 시간 · 금액 */
    private val NOISE = listOf(
        WEB_MARK,
        Regex("""\S*(?:승인|취소|카드|체크|신용)\S*"""),
        Regex("""일시불|\d{1,2}\s*개월|할부|해외|국내|결제|사용"""),
        AMOUNT_WON,
        DATE_TIME,
        Regex("""\d{1,2}:\d{2}"""),
        Regex("""[()\[\]<>]"""),
    )

    fun messages(text: String, today: LocalDate): ParseResult {
        val candidates = ArrayList<ParsedCandidate>()
        val skipped = ArrayList<SkipReason>()
        for (segment in segments(text)) {
            if (candidates.size >= CANDIDATES_MAX) break
            val masked = MASKS.fold(segment) { acc, r -> r.replace(acc, " ") }
            if (CANCEL.containsMatchIn(masked)) {
                skipped += SkipReason.CANCELLED
                continue
            }
            val amountMatch = AMOUNT_WON.find(masked)
            val amount = amountMatch?.let { positive(BigDecimal(it.groupValues[1].replace(",", ""))) }
            if (amount == null) {
                skipped += SkipReason.NO_AMOUNT
                continue
            }
            val installment = INSTALLMENT.find(masked)?.groupValues?.get(1)?.toIntOrNull()?.takeIf { it in 2..36 }
            val spentOn = DATE_TIME.find(masked)?.let { dateOf(it.groupValues[1].toInt(), it.groupValues[2].toInt(), today) } ?: today
            val merchant = merchantOf(masked)
            candidates += ParsedCandidate(Money.krw(amount), merchant, spentOn, installment, PaymentMethod.CARD, CategoryRules.suggest(merchant))
        }
        return ParseResult(candidates, skipped)
    }

    /**
     * 붙여넣은 글을 문자 한 건씩 — `[Web발신]` 표시 · 빈 줄로 먼저 자르고, 한 덩어리에 "승인 · 취소" 줄이 둘 이상이면 그 줄마다 다시 자른다
     * (표시 없이 한 줄에 한 건씩 붙여넣은 경우).
     */
    internal fun segments(text: String): List<String> {
        val normalized = text.replace("\r\n", "\n").replace('\r', '\n')
        val chunks = WEB_MARK.split(normalized).flatMap { it.split(Regex("\n\\s*\n")) }.map { it.trim() }.filter { it.isNotEmpty() }
        return chunks.flatMap { chunk ->
            val lines = chunk.lines()
            val heads = lines.indices.filter { lines[it].contains("승인") || lines[it].contains("취소") }
            if (heads.size < 2) {
                listOf(chunk)
            } else {
                val starts = listOf(0) + heads.drop(1)
                starts.mapIndexed { i, s -> lines.subList(s, if (i + 1 < starts.size) starts[i + 1] else lines.size).joinToString("\n") }
            }
        }
    }

    /** 월/일 → 날짜. 오늘보다 뒤면 지난해(12월 문자를 1월에 붙여넣는 경우). 없는 날짜면 null → 오늘 */
    private fun dateOf(month: Int, day: Int, today: LocalDate): LocalDate? {
        val candidate = runCatching { LocalDate.of(today.year, month, day) }.getOrNull() ?: return null
        return if (candidate.isAfter(today)) runCatching { LocalDate.of(today.year - 1, month, day) }.getOrNull() else candidate
    }

    /** 잡음을 지우고 남은 조각 중 마지막 — 카드 문자는 대개 "시간 다음에 가맹점" 이다 */
    private fun merchantOf(masked: String): String? {
        val pieces = masked.lines()
            .map { line -> NOISE.fold(line) { acc, r -> r.replace(acc, " ") }.replace(Regex("\\s+"), " ").trim() }
            .filter { it.isNotEmpty() && it.any(Char::isLetter) }
        return pieces.lastOrNull()?.take(Expense.MERCHANT_MAX)
    }
}
