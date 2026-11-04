package com.salt.household.domain

import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth

/** 예산 방식(FR-6). 통장 쪼개기 라벨(`account_split`)은 ~~S1b~~ ~~S1c~~ ~~S1d~~ S1e(2026-11-04 정정 세 번 — S1d 는 챌린지만) */
enum class BudgetMethod(val key: String) {
    FIFTY_THIRTY_TWENTY("50_30_20"),
    ENVELOPE("envelope"),
    ;

    companion object {
        fun fromKey(key: String): BudgetMethod? = entries.firstOrNull { it.key == key }
    }
}

/**
 * "지금 예산" 하나(슬라이스 판단 3). 봉투 키는 50/30/20 이면 묶음(needs · wants), 봉투 방식이면 분류 키.
 * 50/30/20 의 저축 몫(20%)은 봉투가 아니다 — 지출이 들어가는 칸이 아니라서 [savingsShare] 로 따로 보여 준다.
 */
data class Budget(
    val userId: String,
    val method: BudgetMethod,
    val income: Money?,
    val envelopes: Map<String, Money>,
    val updatedAt: Instant,
) {
    val savingsShare: Money? get() = income?.scale(SAVINGS_RATIO)

    val total: Money? get() = envelopes.values.reduceOrNull(Money::plus)

    /** 이 지출이 어느 봉투에 드나 — 봉투가 없는 분류면 null(예산 밖 지출) */
    fun envelopeOf(category: Category): String? = when (method) {
        BudgetMethod.FIFTY_THIRTY_TWENTY -> category.bucket.key
        BudgetMethod.ENVELOPE -> category.key.takeIf { it in envelopes }
    }

    companion object {
        val NEEDS_RATIO = BigDecimal("0.50")
        val WANTS_RATIO = BigDecimal("0.30")
        val SAVINGS_RATIO = BigDecimal("0.20")
        const val ENVELOPE_MAX = 12

        fun fiftyThirtyTwenty(userId: String, income: Money, now: Instant): Budget {
            if (income.isNegative() || income.isZero()) throw InvalidBudget("BUDGET_INCOME_INVALID", "income must be positive")
            if (income > Expense.MAX_AMOUNT) throw InvalidBudget("BUDGET_AMOUNT_TOO_LARGE", "income is too large")
            if (!Expense.isWholeWon(income)) throw InvalidBudget("BUDGET_INCOME_INVALID", "income must be whole won")
            return Budget(
                userId,
                BudgetMethod.FIFTY_THIRTY_TWENTY,
                income,
                linkedMapOf(Bucket.NEEDS.key to income.scale(NEEDS_RATIO), Bucket.WANTS.key to income.scale(WANTS_RATIO)),
                now,
            )
        }

        fun envelopes(userId: String, amounts: Map<String, Money>, now: Instant): Budget {
            if (amounts.isEmpty()) throw InvalidBudget("BUDGET_ENVELOPES_REQUIRED", "at least one envelope is required")
            if (amounts.size > ENVELOPE_MAX) throw InvalidBudget("BUDGET_ENVELOPES_TOO_MANY", "too many envelopes")
            amounts.forEach { (key, amount) ->
                if (Category.fromKey(key) == null) throw InvalidBudget("BUDGET_CATEGORY_UNKNOWN", "unknown category")
                if (amount.isNegative() || amount.isZero()) throw InvalidBudget("BUDGET_AMOUNT_INVALID", "envelope amount must be positive")
                if (amount > Expense.MAX_AMOUNT) throw InvalidBudget("BUDGET_AMOUNT_TOO_LARGE", "envelope amount is too large")
                if (!Expense.isWholeWon(amount)) throw InvalidBudget("BUDGET_AMOUNT_INVALID", "envelope amount must be whole won")
            }
            // 분류 표 순서로 — 화면 순서가 입력 순서에 흔들리지 않게
            val ordered = Category.entries.mapNotNull { c -> amounts[c.key]?.let { c.key to it } }.toMap(LinkedHashMap())
            return Budget(userId, BudgetMethod.ENVELOPE, null, ordered, now)
        }
    }
}

/** 봉투 하나의 이번 달 — 남은 금액은 음수가 될 수 있다(차단 · 경고 0). 상태 필드가 없다 */
data class EnvelopeStatus(val key: String, val budget: Money, val spent: Money) {
    val remaining: Money get() = budget - spent
}

/** 한 달 지출 합 — 정확/대략을 따로(FR-6) */
data class MonthTotals(val exact: Money, val approx: Money, val count: Int) {
    val total: Money get() = exact + approx
}

/**
 * 한 달 예산 계산. 하루 가용액은 **이번 달에만**(남은 날로 나눌 것이 있을 때) · 남은 금액이 0 이하면 0 — 음수 "하루 가용"은 뜻이 없다.
 * 금액 반올림은 하지 않는다(응답 직전 api 층 1회).
 */
object BudgetMath {
    fun envelopes(budget: Budget, spentByCategory: Map<Category, Money>): List<EnvelopeStatus> {
        val zero = Money.krw(0)
        val spentByEnvelope = HashMap<String, Money>()
        spentByCategory.forEach { (category, spent) ->
            budget.envelopeOf(category)?.let { key -> spentByEnvelope[key] = (spentByEnvelope[key] ?: zero) + spent }
        }
        return budget.envelopes.map { (key, amount) -> EnvelopeStatus(key, amount, spentByEnvelope[key] ?: zero) }
    }

    /** 봉투에 들지 않은 지출 — 봉투 방식에서 봉투를 안 만든 분류 */
    fun unbudgeted(budget: Budget, spentByCategory: Map<Category, Money>): Money =
        spentByCategory.filterKeys { budget.envelopeOf(it) == null }.values.fold(Money.krw(0), Money::plus)

    /** 오늘 포함 남은 날 — 이번 달이 아니면 null */
    fun daysLeftIncludingToday(month: YearMonth, today: LocalDate): Int? =
        if (YearMonth.from(today) == month) month.lengthOfMonth() - today.dayOfMonth + 1 else null

    fun dailyAvailable(remaining: Money, daysLeft: Int?): Money? {
        if (daysLeft == null || daysLeft <= 0) return null
        if (remaining.isNegative() || remaining.isZero()) return Money.krw(0)
        return Money.krw(remaining.toDecimal().divide(BigDecimal(daysLeft), 10, RoundingMode.DOWN))
    }
}
