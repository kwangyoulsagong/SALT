package com.salt.household.application

import com.salt.household.domain.Category
import com.salt.household.domain.CategoryBook
import com.salt.household.domain.CustomCategories
import com.salt.household.domain.Expense
import com.salt.household.domain.Expenses
import com.salt.household.domain.HouseholdEvents
import com.salt.household.domain.InputKind
import com.salt.household.domain.InvalidRecurring
import com.salt.household.domain.OccurrenceAlreadyDecided
import com.salt.household.domain.OccurrenceNotFound
import com.salt.household.domain.OccurrenceStatus
import com.salt.household.domain.PaymentMethod
import com.salt.household.domain.Precision
import com.salt.household.domain.RecurringOccurrence
import com.salt.household.domain.RecurringOccurrences
import com.salt.household.domain.RecurringRules
import com.salt.household.domain.RecurringTemplate
import com.salt.household.domain.RecurringTemplates
import com.salt.household.domain.TemplateNotFound
import com.salt.household.domain.TemplateWithOccurrence
import com.salt.kernel.Money
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.time.YearMonth
import java.util.UUID

/** 템플릿 입력 — 형식 검증을 지난 값(api 층). 도메인 규칙은 [RecurringTemplate.create] */
data class TemplateInput(
    val name: String,
    val amount: Money,
    val category: String,
    val paymentMethod: String,
    val dayOfMonth: Int,
    val confirmRequired: Boolean,
)

private fun parseId(raw: String): UUID? = runCatching { UUID.fromString(raw) }.getOrNull()

/** 기본 분류 · 보관하지 않은 내 분류(가계부 S1f). [keep] 은 고치는 템플릿이 이미 든 분류 — 그 분류를 보관했어도 그대로 두면 받는다 */
private fun category(book: CategoryBook, key: String, keep: Category? = null): Category =
    book.pick(key) ?: keep?.takeIf { it.key == key } ?: throw InvalidRecurring("TEMPLATE_CATEGORY_UNKNOWN", "unknown category")

private fun payment(key: String): PaymentMethod = PaymentMethod.fromKey(key) ?: throw InvalidRecurring("TEMPLATE_PAYMENT_UNKNOWN", "unknown payment method")

/** 템플릿 목록 + 이번 달 예정 행 — 한 문장 */
open class ListTemplates(private val templates: RecurringTemplates, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String): List<TemplateWithOccurrence> = templates.activeWithOccurrence(userId, YearMonth.from(clock.todayKst()))
}

/** 만들기 — 이번 달 예정일이 오늘 이후면 이번 달 예정 행을 바로 만든다(슬라이스 판단 2 — 워커를 기다리지 않는다) */
open class CreateTemplate(
    private val templates: RecurringTemplates,
    private val occurrences: RecurringOccurrences,
    private val categories: CustomCategories,
    private val clock: Clock,
) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, input: TemplateInput): TemplateWithOccurrence {
        if (templates.countActive(userId) >= RecurringRules.TEMPLATE_MAX) throw InvalidRecurring("TEMPLATE_TOO_MANY", "too many templates")
        val today = clock.todayKst()
        val now = clock.instant()
        val template = RecurringTemplate.create(
            userId, input.name, input.amount, category(CategoryBook(categories.list(userId)), input.category), payment(input.paymentMethod),
            input.dayOfMonth, input.confirmRequired, today, now,
        )
        templates.add(template)
        val month = YearMonth.from(today)
        val occurrence = if (template.startsMonth == month) template.occurrenceFor(month, now).also { occurrences.addIfAbsent(it) } else null
        return TemplateWithOccurrence(template, occurrence)
    }
}

/** 고치기 — 이번 달 예정 행이 아직 예정이면 새 값으로(확인 · 건너뛴 달은 그대로) */
open class EditTemplate(
    private val templates: RecurringTemplates,
    private val occurrences: RecurringOccurrences,
    private val categories: CustomCategories,
    private val clock: Clock,
) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String, input: TemplateInput): TemplateWithOccurrence {
        val id = parseId(rawId) ?: throw TemplateNotFound(rawId)
        val current = templates.find(id, userId) ?: throw TemplateNotFound(rawId)
        val now = clock.instant()
        val picked = category(CategoryBook(categories.list(userId)), input.category, keep = current.category)
        val edited = current.edited(input.name, input.amount, picked, payment(input.paymentMethod), input.dayOfMonth, input.confirmRequired, now)
        if (templates.update(edited) == 0) throw TemplateNotFound(rawId)
        val month = YearMonth.from(clock.todayKst())
        occurrences.refreshScheduled(edited, month)
        return templates.activeWithOccurrence(userId, month).first { it.template.id == id }
    }
}

/** 끝내기 — 템플릿 행은 남고(확인한 달이 가리킨다) 아직 예정인 행은 지운다 */
open class EndTemplate(private val templates: RecurringTemplates, private val occurrences: RecurringOccurrences, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String) {
        val id = parseId(rawId) ?: throw TemplateNotFound(rawId)
        if (templates.end(id, userId, clock.instant()) == 0) throw TemplateNotFound(rawId)
        occurrences.deleteScheduled(id, userId)
    }
}

/**
 * "이번 달에도 나갔나요?" → 나갔어요. 금액을 고칠 수 있다(통신비가 달마다 조금 다르다). 지출 날짜는 예정일(미리 확인하면 오늘).
 * 한 트랜잭션: 지출 행 → 조건부 확인(예정일 때만 — 경합이면 0 → 409, 지출 행도 같이 되돌아간다) → 기록 뒤 할 일([ExpenseWriter]).
 */
open class ConfirmOccurrence(
    private val templates: RecurringTemplates,
    private val occurrences: RecurringOccurrences,
    private val expenses: Expenses,
    private val writer: ExpenseWriter,
    private val clock: Clock,
) {
    data class Result(val record: RecordResult, val occurrenceId: UUID)

    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String, amount: Money?): Result {
        val id = parseId(rawId) ?: throw OccurrenceNotFound(rawId)
        val occurrence = occurrences.find(id, userId) ?: throw OccurrenceNotFound(rawId)
        if (occurrence.status != OccurrenceStatus.SCHEDULED) throw OccurrenceAlreadyDecided(rawId)
        val template = templates.find(occurrence.templateId, userId) ?: throw OccurrenceNotFound(rawId)
        val today = clock.todayKst()
        val expense = templateExpense(occurrence, template.paymentMethod, amount ?: occurrence.amount, today, clock)
        expenses.add(listOf(expense))
        if (occurrences.confirm(id, userId, expense.id, expense.amount, clock.instant()) == 0) throw OccurrenceAlreadyDecided(rawId)
        return Result(writer.afterInsert(userId, listOf(expense), today), id)
    }
}

/** "이번 달은 안 나가요" — 착지 예정에서 빠진다. 예정이 아니면 409 */
open class SkipOccurrence(private val occurrences: RecurringOccurrences, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String) {
        val id = parseId(rawId) ?: throw OccurrenceNotFound(rawId)
        val occurrence = occurrences.find(id, userId) ?: throw OccurrenceNotFound(rawId)
        if (occurrence.status != OccurrenceStatus.SCHEDULED) throw OccurrenceAlreadyDecided(rawId)
        if (occurrences.skip(id, userId, clock.instant()) == 0) throw OccurrenceAlreadyDecided(rawId)
    }
}

/** 확인 · 자동 적기가 같은 모양의 지출을 만든다 — 가맹점 자리에 템플릿 이름(목록에서 "월세"로 보이게) */
internal fun templateExpense(o: RecurringOccurrence, method: PaymentMethod, amount: Money, today: LocalDate, clock: Clock): Expense = Expense.create(
    userId = o.userId,
    amount = amount,
    spentOn = RecurringRules.spentOnWhenConfirmed(o.dueOn, today),
    category = o.category,
    paymentMethod = method,
    merchant = o.name,
    precision = Precision.EXACT,
    inputKind = InputKind.TEMPLATE,
    installmentMonths = null,
    memo = null,
    today = today,
    now = clock.instant(),
)

/**
 * 워커 한 회차(`SRV-REQ-046` FR-5) — ① 이번 달 예정 행 만들기(한 문장 · 멱등) ② 확인 필요 없는 템플릿의 예정일이 온 행을 지출로.
 * 착지 발행은 하지 않는다 — 발행은 사용자가 적은 날의 일이다(S1a 판단 2). 한 회차 [batch] 건까지, 남으면 다음 회차.
 */
open class RunRecurring(
    private val occurrences: RecurringOccurrences,
    private val expenses: Expenses,
    private val events: HouseholdEvents,
    private val clock: Clock,
    private val batch: Int = 500,
) {
    data class Result(val generated: Int, val confirmed: Int)

    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(): Result {
        val today = clock.todayKst()
        val now = clock.instant()
        val generated = occurrences.generateFor(YearMonth.from(today), now)
        val due = occurrences.dueAutomatic(today, batch)
        var confirmed = 0
        due.forEach { d ->
            val expense = templateExpense(d.occurrence, d.paymentMethod, d.occurrence.amount, today, clock)
            expenses.add(listOf(expense))
            // 경합(같은 순간 사용자가 확인 · 건너뜀)이면 0 — 이 지출만 무르고 다음으로. 같은 트랜잭션 안이라 지운다
            if (occurrences.confirm(d.occurrence.id, d.occurrence.userId, expense.id, expense.amount, now) == 1) {
                events.expenseRecorded(expense)
                confirmed++
            } else {
                expenses.delete(expense.id, expense.userId)
            }
        }
        return Result(generated, confirmed)
    }
}
