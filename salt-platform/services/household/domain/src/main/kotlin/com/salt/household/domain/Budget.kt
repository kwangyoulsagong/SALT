package com.salt.household.domain

import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth

/** 예산 방식(FR-6). 통장 쪼개기(`account_split`)는 가계부 S1f — 통장 넷의 이름표일 뿐, 통장과 잇지 않는다(연동 0) */
enum class BudgetMethod(val key: String) {
    FIFTY_THIRTY_TWENTY("50_30_20"),
    ENVELOPE("envelope"),
    ACCOUNT_SPLIT("account_split"),
    ;

    companion object {
        fun fromKey(key: String): BudgetMethod? = entries.firstOrNull { it.key == key }
    }
}

/**
 * 통장 쪼개기 이름표(가계부 S1f 판단 3). 월급이 들어오는 급여 통장에서 고정비(반복 템플릿 — 자동이체 자리)가 나가고,
 * 생활비 통장으로 나머지 지출을 쓴다. 저축 · 비상금 통장은 지출이 들어가지 않는 칸(50/30/20 의 모으기 몫과 같은 자리).
 * [SALARY] 몫은 저장하지 않는다 — 소득 − 나머지 셋(서버 계산).
 */
object Accounts {
    const val SALARY = "salary"
    const val SPENDING = "spending"
    const val SAVING = "saving"
    const val EMERGENCY = "emergency"

    /** 저장하는 칸 — 사용자가 넣는 금액 */
    val STORED = listOf(SPENDING, SAVING, EMERGENCY)

    /** 지출이 들어가는 통장 */
    val SPENDING_ACCOUNTS = listOf(SALARY, SPENDING)

    /** 지출이 들어가지 않는 통장 */
    val SET_ASIDE = listOf(SAVING, EMERGENCY)

    /** 반복 템플릿으로 적은 지출은 급여 통장(고정비), 나머지는 생활비 통장 */
    fun of(inputKind: InputKind): String = if (inputKind == InputKind.TEMPLATE) SALARY else SPENDING
}

/**
 * "지금 예산" 하나(슬라이스 판단 3). 봉투 키는 50/30/20 이면 묶음(needs · wants), 봉투 방식이면 분류 키, 통장 쪼개기면 통장 키([Accounts]).
 * [envelopes] 는 **저장하는 값** 그대로 — 지출이 드는 봉투는 [spending], 지출이 들지 않는 칸은 [setAside].
 * 50/30/20 의 저축 몫(20%)은 봉투가 아니다 — 지출이 들어가는 칸이 아니라서 [savingsShare] 로 따로 보여 준다.
 */
data class Budget(
    val userId: String,
    val method: BudgetMethod,
    val income: Money?,
    val envelopes: Map<String, Money>,
    val updatedAt: Instant,
) {
    val savingsShare: Money? get() = if (method == BudgetMethod.FIFTY_THIRTY_TWENTY) income?.scale(SAVINGS_RATIO) else null

    /** 통장 쪼개기의 급여 통장 몫 = 소득 − 생활비 · 저축 · 비상금. 0 일 수 있다(전부 나눴으면) */
    val salaryShare: Money? get() = if (method == BudgetMethod.ACCOUNT_SPLIT) {
        Accounts.STORED.mapNotNull { envelopes[it] }.fold(income!!) { left, amount -> left - amount }
    } else {
        null
    }

    /** 지출이 들어가는 봉투(순서 그대로) — 통장 쪼개기는 급여 · 생활비 통장 */
    val spending: Map<String, Money> get() = when (method) {
        BudgetMethod.ACCOUNT_SPLIT -> linkedMapOf(Accounts.SALARY to salaryShare!!, Accounts.SPENDING to envelopes.getValue(Accounts.SPENDING))
        else -> envelopes
    }

    /** 지출이 들어가지 않는 칸 — 통장 쪼개기의 저축 · 비상금(0 이면 빠진다) */
    val setAside: Map<String, Money> get() =
        if (method == BudgetMethod.ACCOUNT_SPLIT) Accounts.SET_ASIDE.mapNotNull { k -> envelopes[k]?.let { k to it } }.toMap(LinkedHashMap()) else emptyMap()

    val total: Money? get() = spending.values.reduceOrNull(Money::plus)

    /** 이 지출이 어느 봉투에 드나 — 봉투가 없는 분류면 null(예산 밖 지출) */
    fun envelopeOf(category: Category, inputKind: InputKind, book: CategoryBook): String? = when (method) {
        BudgetMethod.FIFTY_THIRTY_TWENTY -> book.bucketOf(category).key
        BudgetMethod.ENVELOPE -> category.key.takeIf { it in envelopes }
        BudgetMethod.ACCOUNT_SPLIT -> Accounts.of(inputKind)
    }

    companion object {
        val NEEDS_RATIO = BigDecimal("0.50")
        val WANTS_RATIO = BigDecimal("0.30")
        val SAVINGS_RATIO = BigDecimal("0.20")
        const val ENVELOPE_MAX = 12

        private fun checkAmount(amount: Money, invalidCode: String, what: String) {
            if (amount.isNegative() || amount.isZero()) throw InvalidBudget(invalidCode, "$what must be positive")
            if (amount > Expense.MAX_AMOUNT) throw InvalidBudget("BUDGET_AMOUNT_TOO_LARGE", "$what is too large")
            if (!Expense.isWholeWon(amount)) throw InvalidBudget(invalidCode, "$what must be whole won")
        }

        fun fiftyThirtyTwenty(userId: String, income: Money, now: Instant): Budget {
            checkAmount(income, "BUDGET_INCOME_INVALID", "income")
            return Budget(
                userId,
                BudgetMethod.FIFTY_THIRTY_TWENTY,
                income,
                linkedMapOf(Bucket.NEEDS.key to income.scale(NEEDS_RATIO), Bucket.WANTS.key to income.scale(WANTS_RATIO)),
                now,
            )
        }

        /**
         * 봉투 방식 — 키는 기본 분류 · 보관하지 않은 내 분류(가계부 S1f). 순서는 분류 표 순서.
         * [keep] 은 지금 예산에 이미 있는 봉투 키 — 그 분류를 보관했어도 다시 저장하면 받는다(조용히 빠지지 않게). 새 봉투로는 거절
         */
        fun envelopes(userId: String, amounts: Map<String, Money>, book: CategoryBook, now: Instant, keep: Set<String> = emptySet()): Budget {
            if (amounts.isEmpty()) throw InvalidBudget("BUDGET_ENVELOPES_REQUIRED", "at least one envelope is required")
            if (amounts.size > ENVELOPE_MAX) throw InvalidBudget("BUDGET_ENVELOPES_TOO_MANY", "too many envelopes")
            amounts.forEach { (key, amount) ->
                if (book.pick(key) == null && key !in keep) throw InvalidBudget("BUDGET_CATEGORY_UNKNOWN", "unknown category")
                checkAmount(amount, "BUDGET_AMOUNT_INVALID", "envelope amount")
            }
            // 분류 표 순서로 — 화면 순서가 입력 순서에 흔들리지 않게
            val ordered = book.order.mapNotNull { c -> amounts[c.key]?.let { c.key to it } }.toMap(LinkedHashMap())
            return Budget(userId, BudgetMethod.ENVELOPE, null, ordered, now)
        }

        /**
         * 통장 쪼개기(가계부 S1f) — 소득 · 생활비 통장은 꼭, 저축 · 비상금은 0 이면 빈 칸. 셋의 합이 소득을 넘으면 거절(급여 통장 몫이 음수 —
         * 지출 초과가 아니라 입력이 틀린 것이다. 지출은 여전히 막지 않는다)
         */
        fun accountSplit(userId: String, income: Money, spending: Money, saving: Money?, emergency: Money?, now: Instant): Budget {
            checkAmount(income, "BUDGET_INCOME_INVALID", "income")
            checkAmount(spending, "BUDGET_AMOUNT_INVALID", "spending account")
            val optional = listOf(Accounts.SAVING to saving, Accounts.EMERGENCY to emergency).mapNotNull { (k, v) -> v?.takeUnless(Money::isZero)?.let { k to it } }
            optional.forEach { (k, v) -> checkAmount(v, "BUDGET_AMOUNT_INVALID", "$k account") }
            val stored = (listOf(Accounts.SPENDING to spending) + optional).toMap(LinkedHashMap())
            if (stored.values.reduce(Money::plus) > income) throw InvalidBudget("BUDGET_SPLIT_OVER_INCOME", "accounts exceed income")
            return Budget(userId, BudgetMethod.ACCOUNT_SPLIT, income, stored, now)
        }

        /** 읽은 봉투 행을 화면 순서로 — 묶음 · 기본 분류 · 통장 다음 나머지(내 분류) 키 순. 읽는 쪽(지금 예산 · 마감 사본)이 같이 쓴다 */
        fun ordered(rows: Map<String, Money>): LinkedHashMap<String, Money> {
            val fixed = listOf(Bucket.NEEDS.key, Bucket.WANTS.key) + Category.entries.map { it.key } + Accounts.STORED
            val keys = fixed.filter { it in rows } + rows.keys.filterNot { it in fixed }.sorted()
            return keys.associateWith { rows.getValue(it) }.toMap(LinkedHashMap())
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
    /** 봉투마다 이번 달 쓴 돈 — 50/30/20 · 봉투는 분류별 합으로, 통장 쪼개기는 템플릿 지출(급여 통장) · 나머지(생활비 통장)로 */
    fun envelopes(budget: Budget, summary: MonthSummary, book: CategoryBook): List<EnvelopeStatus> {
        val zero = Money.krw(0)
        val spentByEnvelope = HashMap<String, Money>()
        if (budget.method == BudgetMethod.ACCOUNT_SPLIT) {
            spentByEnvelope[Accounts.SALARY] = summary.templateSpent
            spentByEnvelope[Accounts.SPENDING] = summary.totals.total - summary.templateSpent
        } else {
            summary.byCategory.forEach { (category, spent) ->
                // 분류별 합에는 입력 방식이 없다 — 분류로 가르는 두 방식에선 입력 방식이 답을 바꾸지 않는다
                budget.envelopeOf(category, InputKind.QUICK, book)?.let { key -> spentByEnvelope[key] = (spentByEnvelope[key] ?: zero) + spent }
            }
        }
        return budget.spending.map { (key, amount) -> EnvelopeStatus(key, amount, spentByEnvelope[key] ?: zero) }
    }

    /** 봉투에 들지 않은 지출 — 봉투 방식에서 봉투를 안 만든 분류. 통장 쪼개기 · 50/30/20 은 늘 0 */
    fun unbudgeted(budget: Budget, summary: MonthSummary, book: CategoryBook): Money =
        if (budget.method != BudgetMethod.ENVELOPE) {
            Money.krw(0)
        } else {
            summary.byCategory.filterKeys { budget.envelopeOf(it, InputKind.QUICK, book) == null }.values.fold(Money.krw(0), Money::plus)
        }

    /** 오늘 포함 남은 날 — 이번 달이 아니면 null */
    fun daysLeftIncludingToday(month: YearMonth, today: LocalDate): Int? =
        if (YearMonth.from(today) == month) month.lengthOfMonth() - today.dayOfMonth + 1 else null

    fun dailyAvailable(remaining: Money, daysLeft: Int?): Money? {
        if (daysLeft == null || daysLeft <= 0) return null
        if (remaining.isNegative() || remaining.isZero()) return Money.krw(0)
        return Money.krw(remaining.toDecimal().divide(BigDecimal(daysLeft), 10, RoundingMode.DOWN))
    }
}
