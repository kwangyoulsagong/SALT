package com.salt.household.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import com.salt.kernel.Money
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.temporal.ChronoUnit
import java.util.UUID

/**
 * 고정비 · 이상치(`SRV-REQ-046` FR-12 · FR-21 `FixedCostIncreased`, 가계부 S1e). 후보는 저장하지 않고 지출에서 그때그때 센다(판단 2).
 * 문턱(간격 · 금액 폭 · 횟수 · 배수)은 전부 여기 — 화면은 서버가 준 결과만 그린다.
 */

/** 표본 한 줄 — 가맹점이 있는 **정확한 직접 입력** 지출(템플릿 · 대략 제외 — 판단 3) */
data class MerchantCharge(
    val expenseId: ExpenseId,
    val merchant: String,
    val category: Category,
    val paymentMethod: PaymentMethod,
    val amount: Money,
    val spentOn: LocalDate,
    val createdAt: Instant,
)

/**
 * 고정비 후보 — 같은 가맹점 · 비슷한 금액이 약 한 달 간격으로 [count] 번. [previousAmount] 는 바로 앞 회차.
 * [nextOn] 은 다음 달 같은 날(짧은 달이면 말일 — `plusMonths`). 반복 템플릿으로 옮길 때 [dayOfMonth] 를 쓴다
 */
data class FixedCostCandidate(
    val key: String,
    val merchant: String,
    val category: Category,
    val paymentMethod: PaymentMethod,
    val lastAmount: Money,
    val previousAmount: Money,
    val lastOn: LocalDate,
    val count: Int,
    val lastExpenseId: ExpenseId,
) {
    val nextOn: LocalDate get() = lastOn.plusMonths(1)

    val dayOfMonth: Int get() = lastOn.dayOfMonth

    /** 올랐다고 말하는 기준 — 앞 회차보다 [FixedCostRules.INCREASE_RATIO] 이상. 아니면 null(통신비의 몇십 원 차이는 말하지 않는다) */
    val increase: Money? get() = if (FixedCostRules.isIncrease(previousAmount, lastAmount)) lastAmount - previousAmount else null
}

/** 한 번 낸 고정비 증가(가맹점 · 달마다 하나) — 이벤트 본문은 분류 · 금액만(가맹점 0, 판단 5) */
data class FixedCostIncrease(
    val id: UUID,
    val userId: String,
    val merchantKey: String,
    val month: YearMonth,
    val expenseId: ExpenseId,
    val category: Category,
    val previous: Money,
    val current: Money,
    val detectedAt: Instant,
)

object FixedCostRules {
    /** 표본 창 — 넉 달이면 세 번 이어진 것을 놓치지 않는다(첫 회 ~ 셋째 회 최대 70일 + 활동 창 40일) */
    const val LOOKBACK_DAYS = 120L

    /** 세 번부터 — 두 번이면 한 달 간격 우연(그 카페에 두 번)을 고정비로 부른다(판단 1) */
    const val MIN_CHARGES = 3

    /** "약 30일" — 결제일이 주말 · 말일로 밀리는 폭 */
    const val GAP_MIN = 25L
    const val GAP_MAX = 35L

    /** 이웃 두 회차의 금액 폭(큰 쪽 ÷ 작은 쪽) — 요금 인상(구독 26%)은 들이고 같은 가게의 다른 물건은 가른다 */
    val STEP_RATIO = BigDecimal("1.30")

    /** 마지막 회차가 이만큼 지났으면 끝난 것으로 본다(해지했을 수 있다) */
    const val ACTIVE_DAYS = 40L

    /** 앞 회차보다 5% 이상 올라야 "올랐다" */
    val INCREASE_RATIO = BigDecimal("1.05")

    const val KEY_MAX = 40

    /** 가맹점 키 — 공백을 지우고 소문자("넷플릭스 " · "넷플릭스" 가 같은 곳). 지출 가맹점 상한(40)과 같은 길이 */
    fun key(merchant: String): String = merchant.lowercase().filterNot(Char::isWhitespace).take(KEY_MAX)

    fun isClose(a: Money, b: Money): Boolean {
        val (lo, hi) = if (a <= b) a to b else b to a
        if (lo.isZero() || lo.isNegative()) return false
        return hi.toDecimal() <= lo.toDecimal().multiply(STEP_RATIO)
    }

    fun isIncrease(previous: Money, current: Money): Boolean =
        !previous.isZero() && current.toDecimal() >= previous.toDecimal().multiply(INCREASE_RATIO)

    /** [excluded] — 숨긴 키 · 이미 반복 템플릿인 이름의 키. 다음 예정일 순 */
    fun detect(charges: List<MerchantCharge>, today: LocalDate, excluded: Set<String>): List<FixedCostCandidate> =
        charges.groupBy { key(it.merchant) }
            .filter { (k, _) -> k.isNotEmpty() && k !in excluded }
            .mapNotNull { (k, list) -> candidate(k, list, today) }
            .sortedWith(compareBy<FixedCostCandidate>({ it.nextOn }, { it.key }))

    /**
     * 한 가맹점에서 후보 하나. 최근 회차부터 끝점으로 삼아(활동 창 안의 것만) 거꾸로 사슬을 잇는다 —
     * 앞 고리 = **비슷한 금액의 바로 앞 지출**, 간격이 25~35일이어야 이어진다. 그 사이에 비슷한 금액 지출이 또 있으면
     * 앞 고리가 그것이 되어 간격이 짧아 끊긴다 — 매주 가는 카페가 우연히 한 달 간격 사슬을 만들지 않는다(판단 1).
     * 금액이 다른 지출(구독 가게에서 산 물건)은 건너뛴다. 첫 번째로 [MIN_CHARGES] 를 넘는 사슬이 후보
     */
    fun candidate(key: String, charges: List<MerchantCharge>, today: LocalDate): FixedCostCandidate? {
        val sorted = charges.sortedWith(compareBy<MerchantCharge>({ it.spentOn }, { it.createdAt }))
        for (endIndex in sorted.indices.reversed()) {
            val end = sorted[endIndex]
            if (ChronoUnit.DAYS.between(end.spentOn, today) > ACTIVE_DAYS) break
            val chain = chainEndingAt(sorted, endIndex)
            if (chain.size >= MIN_CHARGES) {
                val previous = chain[chain.size - 2]
                return FixedCostCandidate(key, end.merchant, end.category, end.paymentMethod, end.amount, previous.amount, end.spentOn, chain.size, end.expenseId)
            }
        }
        return null
    }

    private fun chainEndingAt(sorted: List<MerchantCharge>, endIndex: Int): List<MerchantCharge> {
        val chain = ArrayDeque<MerchantCharge>().apply { add(sorted[endIndex]) }
        var i = endIndex - 1
        while (i >= 0) {
            val head = chain.first()
            val prevIndex = (i downTo 0).firstOrNull { isClose(sorted[it].amount, head.amount) } ?: break
            val gap = ChronoUnit.DAYS.between(sorted[prevIndex].spentOn, head.spentOn)
            if (gap !in GAP_MIN..GAP_MAX) break
            chain.addFirst(sorted[prevIndex])
            i = prevIndex - 1
        }
        return chain.toList()
    }
}

/** 한 분류의 기준 — 지난 90일 중앙값 · 표본 수 */
data class CategoryBaseline(val median: Money, val samples: Int)

/**
 * "평소보다 큰 지출" — 그 분류의 **그달 앞 90일** 중앙값의 3배 이상. 그달 지출은 기준에 넣지 않는다(한 달 내내 같은 기준).
 * 평가 문구 0 — 결과는 "이 분류 보통 N원" 숫자 하나다(판단 4)
 */
object UnusualRules {
    const val WINDOW_DAYS = 90L
    const val MIN_SAMPLES = 5
    val RATIO = BigDecimal("3")

    /** 기준 창 `[그달 1일 − 90일, 그달 1일 − 1일]` */
    fun window(month: YearMonth): Pair<LocalDate, LocalDate> = month.atDay(1).minusDays(WINDOW_DAYS) to month.atDay(1).minusDays(1)

    /**
     * 평소보다 크면 그 분류의 중앙값, 아니면 null. 대략 · 템플릿 지출은 보지 않는다(표본에도 없다).
     * [fixedKeys] — 고정비 후보 · 반복 템플릿 이름의 가맹점 키: 월세가 관리비 기준의 몇 배로 매달 걸리지 않게
     */
    fun typicalIfUnusual(expense: Expense, baselines: Map<Category, CategoryBaseline>, fixedKeys: Set<String>): Money? {
        if (expense.precision != Precision.EXACT || expense.inputKind == InputKind.TEMPLATE) return null
        if (expense.merchant != null && FixedCostRules.key(expense.merchant) in fixedKeys) return null
        val base = baselines[expense.category] ?: return null
        if (base.samples < MIN_SAMPLES || base.median.isZero()) return null
        return base.median.takeIf { expense.amount.toDecimal() >= it.toDecimal().multiply(RATIO) }
    }
}

/** 고정비 찾기 저장소 — 표본 · 기준 · 숨김 · 증가 발행 기록 */
interface SpendingPatterns {
    /** [from] 부터 오늘까지 가맹점이 있는 정확한 직접 입력 지출 — 부분 인덱스 한 문장 */
    fun charges(userId: String, from: LocalDate): List<MerchantCharge>

    /** 분류별 중앙값 · 표본 수(`percentile_disc` — 금액 그대로) — 한 문장 */
    fun baselines(userId: String, from: LocalDate, to: LocalDate): Map<Category, CategoryBaseline>

    fun hiddenKeys(userId: String): Set<String>

    /** 멱등 — 이미 숨겼으면 그대로 */
    fun hide(userId: String, key: String, now: Instant)

    fun show(userId: String, key: String): Int

    /** 가맹점 · 달마다 한 번 — 넣었으면 true(`ON CONFLICT DO NOTHING`, 오류 코드 분기 0) */
    fun recordIncrease(increase: FixedCostIncrease): Boolean
}

class InvalidFixedCost(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)
