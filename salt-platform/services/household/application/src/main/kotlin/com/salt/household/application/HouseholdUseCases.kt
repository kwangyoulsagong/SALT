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
import com.salt.household.domain.InstallmentBand
import com.salt.household.domain.InstallmentMath
import com.salt.household.domain.InstallmentPlan
import com.salt.household.domain.MonthClose
import com.salt.household.domain.MonthCloseRules
import com.salt.household.domain.MonthCloses
import com.salt.household.domain.RecurringOccurrence
import com.salt.household.domain.RecurringOccurrences
import com.salt.household.domain.RecurringRules
import com.salt.household.domain.CalendarRules
import com.salt.household.domain.EmotionMirror
import com.salt.household.domain.ExpenseFeeling
import com.salt.household.domain.FeelingAsk
import com.salt.household.domain.FeelingMirror
import com.salt.household.domain.FeelingRules
import com.salt.household.domain.Feelings
import com.salt.household.domain.MonthCalendar
import com.salt.household.domain.Settings
import com.salt.household.domain.StickerKind
import com.salt.household.domain.Stickers
import com.salt.household.domain.WorkHoursSetting
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
class LandingReader(private val expenses: Expenses, private val landings: Landings, private val occurrences: RecurringOccurrences) {
    /**
     * @param monthTotal 이 달 오늘까지 합 — 오늘 몫을 빼 "오늘 시작 기준"으로 넘긴다
     * @param monthOccurrences 이 달 예정 행 — 부르는 쪽이 이미 읽었으면 넘긴다(월 화면). null 이면 여기서 한 번 읽는다
     */
    fun landing(userId: String, today: LocalDate, monthTotal: Money, monthOccurrences: List<RecurringOccurrence>? = null): Landing {
        val first = expenses.firstRecordedOn(userId)
        val from = first?.let { maxOf(it, today.minusDays(LANDING_LOOKBACK_DAYS)) }
        // 오늘까지 받아 오늘 몫을 뺀다(같은 문장 하나). 표본은 엔진이 어제까지만 쓴다 — 변동 합만(템플릿 지출 뺌, S1b 판단 4)
        val daily = if (from == null || from.isAfter(today)) emptyMap() else expenses.dailyTotals(userId, from, today)
        val beforeToday = monthTotal - (daily[today]?.all ?: Money.krw(0))
        val month = YearMonth.from(today)
        val scheduled = RecurringRules.scheduledTotal(monthOccurrences ?: occurrences.inMonth(userId, month))
        return LandingEngine.project(month, today, beforeToday, daily.mapValues { it.value.variable }, from, scheduled)
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
    /** 감정 태그(가계부 S1c FR-13) — 비우면 태그 없음. 산 직후 만족은 태그가 있을 때만 */
    val emotion: String? = null,
    val feltNow: Int? = null,
)

/**
 * 저장 응답 — 저장한 행 · 첫 행 분류의 봉투 · 이번 달 합. [workHours] 는 노동시간 환산 설정(꺼졌으면 OFF — 응답이 분을 싣지 않는다, S1c FR-15).
 * [feelings] 는 이번에 붙인 감정 태그(지출 id → 태그)
 */
data class RecordResult(
    val saved: List<Expense>,
    val envelope: EnvelopeStatus?,
    val monthTotal: Money,
    val workHours: WorkHoursSetting = WorkHoursSetting.OFF,
    val feelings: Map<ExpenseId, ExpenseFeeling> = emptyMap(),
) {
    /** 이번에 적은 합 — BFF 가 목표 시계에 그대로 넘긴다(BFF 는 더하지 않는다) */
    val savedTotal: Money get() = saved.map { it.amount }.reduce(Money::plus)
}

/**
 * 행을 넣은 **뒤** 할 일 한 곳 — `ExpenseRecorded` · (그날 처음이면) 착지 발행 · 봉투. 직접 적기와 반복 확인(S1b)이 같은 길을 지난다
 * (규칙이 입력 경로마다 갈라지지 않게). 트랜잭션은 부르는 유스케이스의 것이다.
 */
class ExpenseWriter(
    private val expenses: Expenses,
    private val budgets: Budgets,
    private val landings: Landings,
    private val landingReader: LandingReader,
    private val events: HouseholdEvents,
    private val settings: Settings,
    private val clock: Clock,
) {
    fun afterInsert(userId: String, saved: List<Expense>, today: LocalDate): RecordResult {
        saved.forEach(events::expenseRecorded)
        val summary = expenses.monthSummary(userId, YearMonth.from(today))
        issueLanding(userId, today, summary)
        val budget = budgets.find(userId)
        val envelope = budget?.let { b ->
            val key = b.envelopeOf(saved.first().category) ?: return@let null
            BudgetMath.envelopes(b, summary.byCategory).firstOrNull { it.key == key }
        }
        return RecordResult(saved, envelope, summary.totals.total, settings.workHours(userId))
    }

    /** 그날 처음 적은 지출이면 이번 달 착지를 발행한다(S1a 슬라이스 판단 2). 이미 냈으면 아무것도 쓰지 않는다 */
    private fun issueLanding(userId: String, today: LocalDate, summary: MonthSummary) {
        val landing = landingReader.landing(userId, today, summary.totals.total)
        val issued = IssuedLanding(UUID.randomUUID(), userId, today, clock.instant(), landing)
        if (landings.issueOncePerDay(issued)) events.landingIssued(issued)
    }
}

/**
 * 지출 저장(FR-1 · FR-6) — 한 건 · 여러 건(붙여넣기 확인 목록)이 같은 유스케이스다. 한 트랜잭션: 행 + `ExpenseRecorded` + (그날 처음이면) 착지 발행.
 * 응답은 저장한 행과 **첫 행 분류의 봉투** — 화면이 "봉투 잔액 갱신"을 한 줄로 보인다(FEATURE-013 UX Success). 목표 시계는 BFF 가 조립한다(슬라이스 판단 1).
 */
open class RecordExpenses(
    private val expenses: Expenses,
    private val feelings: Feelings,
    private val writer: ExpenseWriter,
    private val clock: Clock,
) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, inputs: List<ExpenseInput>): RecordResult {
        if (inputs.isEmpty()) throw InvalidExpense("EXPENSE_REQUIRED", "at least one expense is required")
        if (inputs.size > InputParser.CANDIDATES_MAX) throw InvalidExpense("EXPENSE_TOO_MANY", "too many expenses at once")
        val today = clock.todayKst()
        val now = clock.instant()
        val saved = inputs.map { toExpense(userId, it, today, now) }
        // 태그 검사는 행을 넣기 전에 — 틀린 감정 키가 지출만 남기지 않게(한 트랜잭션이라 롤백되지만 문장을 아낀다)
        val tags = saved.zip(inputs).mapNotNull { (e, input) -> feelingFor(userId, e, input, today) }
        expenses.add(saved)
        tags.forEach { feelings.tag(it, now) }
        return writer.afterInsert(userId, saved, today).copy(feelings = tags.associateBy { it.expenseId })
    }

    private fun feelingFor(userId: String, expense: Expense, input: ExpenseInput, today: LocalDate): ExpenseFeeling? {
        if (input.emotion == null) {
            if (input.feltNow != null) throw InvalidExpense("FEELING_EMOTION_REQUIRED", "feltNow goes with an emotion")
            return null
        }
        return feelingOf(userId, expense.id, input.emotion, input.feltNow, today)
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

/** 지우기 — 반복 확인으로 생긴 지출이면 그 예정 행을 먼저 "예정"으로 되돌린다(S1b 판단 5 — 착지에서 빠지지 않게). 한 트랜잭션 */
open class DeleteExpense(private val expenses: Expenses, private val occurrences: RecurringOccurrences) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String) {
        val id = ExpenseId.parse(rawId) ?: throw ExpenseNotFound(rawId)
        occurrences.reopenFor(id, userId)
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

/** 한 달 화면(FR-6 · FR-7 · S1b FR-5 · 9 · 10). 숫자는 전부 여기서 — 프론트 계산 0 */
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
    /** 이 달 반복 예정 행(상태 무관) — 화면이 확인 카드 · 지난 달 기록을 그린다 */
    val occurrences: List<RecurringOccurrence>,
    val scheduledTotal: Money,
    val close: MonthClose?,
    val closable: Boolean,
    val installments: InstallmentBand,
    /** 그 달 지출의 감정 태그(지출 id → 태그) — 목록 표시(S1c FR-13) */
    val feelings: Map<ExpenseId, ExpenseFeeling>,
    /** 그 달 태그별 분포 — 건수만, 평가 0 */
    val mirror: List<EmotionMirror>,
    /** 오늘 물을 다음 날 만족 — 이번 달 화면에만(다른 달이면 빈 목록) */
    val feelingAsks: List<FeelingAsk>,
    val calendar: MonthCalendar,
    val workHours: WorkHoursSetting,
)

/**
 * 쿼리: 지출 목록 · 월 합 · 마감(2 — 닫은 달이면 예산 대신 사본) · 예산(2, 안 닫은 달) · 예정 행 · 할부 + 이번 달이면 착지 2 · 적중 2
 * + S1c: 태그(목록 · 거울 한 문장) · 날별 합(달력) · 스티커 · 설정 + 이번 달이면 다음 날 묻기 1.
 * 닫은 달은 그때 붙잡은 예산으로 본다(S1b 판단 6).
 */
open class GetMonth(
    private val expenses: Expenses,
    private val budgets: Budgets,
    private val occurrences: RecurringOccurrences,
    private val closes: MonthCloses,
    private val landingReader: LandingReader,
    private val feelings: Feelings,
    private val stickers: Stickers,
    private val settings: Settings,
    private val challenges: com.salt.household.domain.Challenges,
    private val clock: Clock,
) {
    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String, month: YearMonth): MonthView {
        val today = clock.todayKst()
        if (month.isAfter(YearMonth.from(today))) throw InvalidExpense("MONTH_IN_FUTURE", "month is in the future")
        val summary = expenses.monthSummary(userId, month)
        val close = closes.find(userId, month)
        val budget = if (close != null) close.budget else budgets.find(userId)
        val monthOccurrences = occurrences.inMonth(userId, month)
        val plans = expenses.installments(userId, month.minusMonths(InstallmentMath.MAX_MONTHS.toLong()).atDay(1), month.atEndOfMonth())
            .mapNotNull(InstallmentPlan::of)
        val envelopes = budget?.let { BudgetMath.envelopes(it, summary.byCategory) }.orEmpty()
        val remaining = envelopes.takeIf { it.isNotEmpty() }?.map { it.remaining }?.reduce(Money::plus)
        val daysLeft = BudgetMath.daysLeftIncludingToday(month, today)
        val current = month == YearMonth.from(today)
        val monthFeelings = feelings.inMonth(userId, month)
        val lastDay = if (current) today else month.atEndOfMonth()
        val daily = expenses.dailyTotals(userId, month.atDay(1), lastDay).mapValues { it.value.all }
        // 챌린지 "한 날"(가계부 S1d) — 칸 상태와 따로 붙는다
        val calendar = CalendarRules.month(month, today, daily, stickers.inMonth(userId, month, StickerKind.NO_SPEND), challenges.markedInMonth(userId, month))
        val asks = if (current) FeelingRules.askWindow(today).let { (from, to) -> feelings.pendingAsks(userId, from, to) } else emptyList()
        return MonthView(
            month = month,
            summary = summary,
            budget = budget,
            envelopes = envelopes,
            unbudgeted = budget?.let { BudgetMath.unbudgeted(it, summary.byCategory) },
            remaining = remaining,
            dailyAvailable = remaining?.let { BudgetMath.dailyAvailable(it, daysLeft) },
            daysLeft = daysLeft,
            landing = if (current) landingReader.landing(userId, today, summary.totals.total, monthOccurrences) else null,
            landingReason = if (current) null else LandingReason.NOT_CURRENT_MONTH,
            track = if (current) landingReader.track(userId, today) else null,
            expenses = expenses.inMonth(userId, month, MONTH_LIST_LIMIT),
            occurrences = monthOccurrences,
            scheduledTotal = RecurringRules.scheduledTotal(monthOccurrences),
            close = close,
            closable = MonthCloseRules.closable(month, today),
            installments = InstallmentMath.band(month, plans),
            feelings = monthFeelings.associateBy { it.expenseId },
            mirror = FeelingMirror.of(monthFeelings),
            feelingAsks = asks,
            calendar = calendar,
            workHours = settings.workHours(userId),
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
