package com.salt.household.application

import com.salt.household.domain.Budget
import com.salt.household.domain.BudgetMath
import com.salt.household.domain.BudgetMethod
import com.salt.household.domain.Budgets
import com.salt.household.domain.Category
import com.salt.household.domain.EnvelopeStatus
import com.salt.household.domain.Expense
import com.salt.household.domain.ExpenseId
import com.salt.household.domain.ExpenseNotFound
import com.salt.household.domain.Expenses
import com.salt.household.domain.HouseholdEvents
import com.salt.household.domain.InputKind
import com.salt.household.domain.InputParser
import com.salt.household.domain.InvalidBudget
import com.salt.household.domain.InvalidExpense
import com.salt.household.domain.IssuedLanding
import com.salt.household.domain.Landing
import com.salt.household.domain.LandingEngine
import com.salt.household.domain.LandingReason
import com.salt.household.domain.LandingTrack
import com.salt.household.domain.Landings
import com.salt.household.domain.MonthSummary
import com.salt.household.domain.ParseResult
import com.salt.household.domain.ParsedCandidate
import com.salt.household.domain.PaymentMethod
import com.salt.household.domain.Precision
import com.salt.household.domain.RecentMerchant
import com.salt.kernel.Money
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.util.UUID

/** household 서비스의 트랜잭션 매니저 이름 — 서비스마다 DB 계정이 달라 매니저도 따로다(`ServiceDatabase`). */
const val HOUSEHOLD_TX = "householdTx"

/** 날짜 해석은 한국 시간 — "이번 달" · 지출일이 사용자의 달력과 같아야 한다. 저장 시각은 UTC Instant */
val KST: ZoneId = ZoneId.of("Asia/Seoul")

fun Clock.todayKst(): LocalDate = LocalDate.ofInstant(instant(), KST)

/** 착지 표본을 거슬러 올라가는 날 수 — 생활이 바뀐 옛날 달이 구간을 끌지 않게 */
const val LANDING_LOOKBACK_DAYS = 90L

/** 최근 가맹점 제안 창(FR-2) */
const val SUGGEST_DAYS = 30L
const val SUGGEST_LIMIT = 8

/** 월 화면 목록 상한 — 한 달 300건이면 하루 10건. 넘으면 최신 300건(합계는 전부로 낸다) */
const val MONTH_LIST_LIMIT = 300

/**
 * 착지 · 적중 계산 자리 — 쓰기(발행)와 읽기(화면)가 같은 계산을 쓴다(규칙 한 곳).
 * 쿼리: 착지 2회(첫 기록 · 날별 합) · 적중 2회(지난달 합 · 지난달 발행)
 */
class LandingReader(private val expenses: Expenses, private val landings: Landings) {
    fun landing(userId: String, today: LocalDate, spentSoFar: Money): Landing {
        val first = expenses.firstSpentOn(userId)
        val from = first?.let { maxOf(it, today.minusDays(LANDING_LOOKBACK_DAYS)) }
        val daily = if (from == null || !from.isBefore(today)) emptyMap() else expenses.dailyTotals(userId, from, today.minusDays(1))
        return LandingEngine.project(YearMonth.from(today), today, spentSoFar, daily, from)
    }

    fun track(userId: String, today: LocalDate): LandingTrack {
        val lastMonth = YearMonth.from(today).minusMonths(1)
        val issued = landings.lastIssued(userId, lastMonth, LandingEngine.sameDayLastMonth(today))
        val actual = expenses.monthSummary(userId, lastMonth).totals.total
        return LandingEngine.track(lastMonth, today, issued, actual)
    }
}

/** 저장 한 건 — 형식 검증을 지난 값(api 층). 도메인 규칙은 [Expense.create] */
data class ExpenseInput(
    val amount: Money,
    val spentOn: LocalDate?,
    val category: String,
    val paymentMethod: String,
    val merchant: String?,
    val precision: String,
    val inputKind: String,
    val installmentMonths: Int?,
    val memo: String?,
)

/**
 * 지출 저장(FR-1 · FR-6) — 한 건 · 여러 건(붙여넣기 확인 목록)이 같은 유스케이스다. 한 트랜잭션: 행 + `ExpenseRecorded` + (그날 처음이면) 착지 발행.
 * 응답은 저장한 행과 **첫 행 분류의 봉투** — 화면이 "봉투 잔액 갱신"을 한 줄로 보인다(FEATURE-013 UX Success). 목표 시계는 BFF 가 조립한다(슬라이스 판단 1).
 */
open class RecordExpenses(
    private val expenses: Expenses,
    private val budgets: Budgets,
    private val landings: Landings,
    private val landingReader: LandingReader,
    private val events: HouseholdEvents,
    private val clock: Clock,
) {
    data class Result(val saved: List<Expense>, val envelope: EnvelopeStatus?, val monthTotal: Money) {
        /** 이번에 적은 합 — BFF 가 목표 시계에 그대로 넘긴다(BFF 는 더하지 않는다) */
        val savedTotal: Money get() = saved.map { it.amount }.reduce(Money::plus)
    }

    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, inputs: List<ExpenseInput>): Result {
        if (inputs.isEmpty()) throw InvalidExpense("EXPENSE_REQUIRED", "at least one expense is required")
        if (inputs.size > InputParser.CANDIDATES_MAX) throw InvalidExpense("EXPENSE_TOO_MANY", "too many expenses at once")
        val today = clock.todayKst()
        val now = clock.instant()
        val saved = inputs.map { toExpense(userId, it, today, now) }
        expenses.add(saved)
        saved.forEach(events::expenseRecorded)

        val month = YearMonth.from(today)
        val summary = expenses.monthSummary(userId, month)
        issueLanding(userId, today, summary)

        val budget = budgets.find(userId)
        val envelope = budget?.let { b ->
            val key = b.envelopeOf(saved.first().category) ?: return@let null
            BudgetMath.envelopes(b, summary.byCategory).firstOrNull { it.key == key }
        }
        return Result(saved, envelope, summary.totals.total)
    }

    /** 그날 처음 적은 지출이면 이번 달 착지를 발행한다(슬라이스 판단 2). 이미 냈으면 아무것도 쓰지 않는다 */
    private fun issueLanding(userId: String, today: LocalDate, summary: MonthSummary) {
        val landing = landingReader.landing(userId, today, summary.totals.total)
        val issued = IssuedLanding(UUID.randomUUID(), userId, today, clock.instant(), landing)
        if (landings.issueOncePerDay(issued)) events.landingIssued(issued)
    }

    private fun toExpense(userId: String, input: ExpenseInput, today: LocalDate, now: Instant): Expense {
        val category = Category.fromKey(input.category) ?: throw InvalidExpense("EXPENSE_CATEGORY_UNKNOWN", "unknown category")
        val method = PaymentMethod.fromKey(input.paymentMethod) ?: throw InvalidExpense("EXPENSE_PAYMENT_UNKNOWN", "unknown payment method")
        val precision = Precision.fromKey(input.precision) ?: throw InvalidExpense("EXPENSE_PRECISION_INVALID", "unknown precision")
        val kind = InputKind.fromKey(input.inputKind)?.takeIf { it != InputKind.TEMPLATE }
            ?: throw InvalidExpense("EXPENSE_INPUT_KIND_INVALID", "unknown input kind")
        return Expense.create(
            userId, input.amount, input.spentOn ?: today, category, method, input.merchant, precision, kind,
            input.installmentMonths, input.memo, today, now,
        )
    }
}

open class DeleteExpense(private val expenses: Expenses) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String) {
        val id = ExpenseId.parse(rawId) ?: throw ExpenseNotFound(rawId)
        if (expenses.delete(id, userId) == 0) throw ExpenseNotFound(rawId)
    }
}

/**
 * 입력 파싱(FR-3 · FR-4) — **저장하지 않는다.** 원문은 인자로만 지나간다(로그 0 · 예외 메시지 0).
 * 분류: 최근 같은 가맹점에 사용자가 고른 분류 → 낱말 표 → 없음(화면이 고르게). 출처를 같이 돌려준다
 */
open class ParseInput(private val expenses: Expenses, private val clock: Clock) {
    enum class Mode(val key: String) {
        LINE("line"),
        MESSAGES("messages"),
        ;

        companion object {
            fun fromKey(key: String): Mode? = entries.firstOrNull { it.key == key }
        }
    }

    data class Suggested(val candidate: ParsedCandidate, val category: Category?, val categorySource: String?)

    data class Result(val candidates: List<Suggested>, val skipped: List<String>)

    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String, modeKey: String, text: String): Result {
        val mode = Mode.fromKey(modeKey) ?: throw InvalidExpense("PARSE_MODE_INVALID", "mode must be line or messages")
        if (text.length > InputParser.TEXT_MAX) throw InvalidExpense("PARSE_TEXT_TOO_LONG", "text is too long")
        val today = clock.todayKst()
        val parsed: ParseResult = when (mode) {
            Mode.LINE -> InputParser.line(text, today)
            Mode.MESSAGES -> InputParser.messages(text, today)
        }
        val history = if (parsed.candidates.any { it.merchant != null }) {
            expenses.recentMerchants(userId, today.minusDays(LANDING_LOOKBACK_DAYS), 200).associateBy { it.merchant }
        } else {
            emptyMap()
        }
        return Result(
            parsed.candidates.map { c ->
                val fromHistory = c.merchant?.let { history[it]?.category }
                when {
                    fromHistory != null -> Suggested(c, fromHistory, "history")
                    c.category != null -> Suggested(c, c.category, "rule")
                    else -> Suggested(c, null, null)
                }
            },
            parsed.skipped.map { it.key },
        )
    }
}

open class Suggestions(private val expenses: Expenses, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String): List<RecentMerchant> =
        expenses.recentMerchants(userId, clock.todayKst().minusDays(SUGGEST_DAYS), SUGGEST_LIMIT)
}

open class GetBudget(private val budgets: Budgets) {
    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String): Budget? = budgets.find(userId)
}

open class SetBudget(private val budgets: Budgets, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, method: String, income: Money?, envelopes: Map<String, Money>): Budget {
        val now = clock.instant()
        val budget = when (BudgetMethod.fromKey(method)) {
            BudgetMethod.FIFTY_THIRTY_TWENTY ->
                Budget.fiftyThirtyTwenty(userId, income ?: throw InvalidBudget("BUDGET_INCOME_REQUIRED", "income is required"), now)
            BudgetMethod.ENVELOPE -> Budget.envelopes(userId, envelopes, now)
            null -> throw InvalidBudget("BUDGET_METHOD_INVALID", "unknown budget method")
        }
        budgets.replace(budget)
        return budget
    }
}

/** 한 달 화면(FR-6 · FR-7). 숫자는 전부 여기서 — 프론트 계산 0 */
data class MonthView(
    val month: YearMonth,
    val summary: MonthSummary,
    val budget: Budget?,
    val envelopes: List<EnvelopeStatus>,
    val unbudgeted: Money?,
    /** 봉투 합 − 봉투에 든 지출. 음수 가능(차단 · 경고 0) */
    val remaining: Money?,
    val dailyAvailable: Money?,
    val daysLeft: Int?,
    /** 이번 달만. 다른 달이면 null + [landingReason] */
    val landing: Landing?,
    val landingReason: String?,
    val track: LandingTrack?,
    val expenses: List<Expense>,
)

/** 쿼리: 지출 목록 · 월 합 · 예산(2 — 예산 · 봉투) + 이번 달이면 착지 2 · 적중 2 */
open class GetMonth(private val expenses: Expenses, private val budgets: Budgets, private val landingReader: LandingReader, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String, month: YearMonth): MonthView {
        val today = clock.todayKst()
        if (month.isAfter(YearMonth.from(today))) throw InvalidExpense("MONTH_IN_FUTURE", "month is in the future")
        val summary = expenses.monthSummary(userId, month)
        val budget = budgets.find(userId)
        val envelopes = budget?.let { BudgetMath.envelopes(it, summary.byCategory) }.orEmpty()
        val remaining = envelopes.takeIf { it.isNotEmpty() }?.map { it.remaining }?.reduce(Money::plus)
        val daysLeft = BudgetMath.daysLeftIncludingToday(month, today)
        val current = month == YearMonth.from(today)
        return MonthView(
            month = month,
            summary = summary,
            budget = budget,
            envelopes = envelopes,
            unbudgeted = budget?.let { BudgetMath.unbudgeted(it, summary.byCategory) },
            remaining = remaining,
            dailyAvailable = remaining?.let { BudgetMath.dailyAvailable(it, daysLeft) },
            daysLeft = daysLeft,
            landing = if (current) landingReader.landing(userId, today, summary.totals.total) else null,
            landingReason = if (current) null else LandingReason.NOT_CURRENT_MONTH,
            track = if (current) landingReader.track(userId, today) else null,
            expenses = expenses.inMonth(userId, month, MONTH_LIST_LIMIT),
        )
    }
}

/** 홈 요약 카드(FR-18) — 이번 달 지출 · 착지 · 예산 남은 금액. 적중 판정은 싣지 않는다(쿼리를 아낀다) */
open class HomeCard(private val expenses: Expenses, private val budgets: Budgets, private val landingReader: LandingReader, private val clock: Clock) {
    data class View(val month: YearMonth, val spent: Money, val count: Int, val remaining: Money?, val landing: Landing)

    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String): View {
        val today = clock.todayKst()
        val month = YearMonth.from(today)
        val summary = expenses.monthSummary(userId, month)
        val remaining = budgets.find(userId)?.let { b -> BudgetMath.envelopes(b, summary.byCategory).map { it.remaining }.reduceOrNull(Money::plus) }
        return View(month, summary.totals.total, summary.totals.count, remaining, landingReader.landing(userId, today, summary.totals.total))
    }
}
