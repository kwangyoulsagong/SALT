package com.salt.household.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import com.salt.kernel.Money
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.util.UUID

/**
 * 반복 템플릿(`SRV-REQ-046` FR-5 · `DB-REQ-038` FR-4, 가계부 S1b). 주기는 매달 하나(슬라이스 판단 1) —
 * [dayOfMonth] 가 짧은 달을 넘으면 그 달 말일. 예정 행([RecurringOccurrence])은 달마다 하나다.
 */
data class RecurringTemplate(
    val id: UUID,
    val userId: String,
    val name: String,
    val amount: Money,
    val category: Category,
    val paymentMethod: PaymentMethod,
    val dayOfMonth: Int,
    /** true 면 "이번 달에도 나갔나요?" 확인 뒤에야 지출. false 면 예정일에 워커가 적는다(판단 3) */
    val confirmRequired: Boolean,
    /** 이 달부터 예정 행을 만든다 */
    val startsMonth: YearMonth,
    val createdAt: Instant,
    val updatedAt: Instant,
) {
    fun dueOn(month: YearMonth): LocalDate = RecurringRules.dueOn(month, dayOfMonth)

    /** 이 달 예정 행 — 금액 · 이름 · 분류는 지금 템플릿 값으로 붙잡는다 */
    fun occurrenceFor(month: YearMonth, now: Instant): RecurringOccurrence =
        RecurringOccurrence(UUID.randomUUID(), id, userId, month, dueOn(month), name, amount, category, OccurrenceStatus.SCHEDULED, null, null, now)

    /** 고친 값 — 시작 달 · 만든 시각은 그대로 */
    fun edited(name: String, amount: Money, category: Category, paymentMethod: PaymentMethod, dayOfMonth: Int, confirmRequired: Boolean, now: Instant): RecurringTemplate {
        RecurringRules.validate(name, amount, dayOfMonth)
        return copy(name = name.trim(), amount = amount, category = category, paymentMethod = paymentMethod, dayOfMonth = dayOfMonth, confirmRequired = confirmRequired, updatedAt = now)
    }

    companion object {
        /**
         * 이번 달 예정일이 오늘 이후(오늘 포함)면 이번 달부터, 지났으면 다음 달부터 — 지난 예정일 몫은 이미 적었을 수 있다(판단 2).
         */
        fun create(
            userId: String,
            name: String,
            amount: Money,
            category: Category,
            paymentMethod: PaymentMethod,
            dayOfMonth: Int,
            confirmRequired: Boolean,
            today: LocalDate,
            now: Instant,
        ): RecurringTemplate {
            RecurringRules.validate(name, amount, dayOfMonth)
            val thisMonth = YearMonth.from(today)
            val starts = if (RecurringRules.dueOn(thisMonth, dayOfMonth).isBefore(today)) thisMonth.plusMonths(1) else thisMonth
            return RecurringTemplate(UUID.randomUUID(), userId, name.trim(), amount, category, paymentMethod, dayOfMonth, confirmRequired, starts, now, now)
        }
    }
}

enum class OccurrenceStatus(val key: String) {
    SCHEDULED("scheduled"),
    CONFIRMED("confirmed"),
    SKIPPED("skipped"),
    ;

    companion object {
        fun fromKey(key: String): OccurrenceStatus? = entries.firstOrNull { it.key == key }
    }
}

/** 예정 행 — 확인하면 [expenseId] 가 그 지출. 금액 · 이름 · 분류는 만든 때의 템플릿 값 */
data class RecurringOccurrence(
    val id: UUID,
    val templateId: UUID,
    val userId: String,
    val month: YearMonth,
    val dueOn: LocalDate,
    val name: String,
    val amount: Money,
    val category: Category,
    val status: OccurrenceStatus,
    val expenseId: ExpenseId?,
    val decidedAt: Instant?,
    val createdAt: Instant,
)

/**
 * 화면이 그릴 단계 — 보여 줄 대상은 서버가 정한다(`done-checklist.md` §2-2). ask = "이번 달에도 나갔나요?" 카드(예정일이 왔고 아직 예정),
 * upcoming = 예정일 전, confirmed · skipped = 정한 달.
 */
enum class OccurrenceStage(val key: String) {
    ASK("ask"),
    UPCOMING("upcoming"),
    CONFIRMED("confirmed"),
    SKIPPED("skipped"),
    ;

    companion object {
        fun of(o: RecurringOccurrence, today: LocalDate): OccurrenceStage = when (o.status) {
            OccurrenceStatus.CONFIRMED -> CONFIRMED
            OccurrenceStatus.SKIPPED -> SKIPPED
            OccurrenceStatus.SCHEDULED -> if (o.dueOn.isAfter(today)) UPCOMING else ASK
        }
    }
}

/** 워커가 적을 예정 행 + 템플릿 결제수단(한 문장 join) */
data class DueOccurrence(val occurrence: RecurringOccurrence, val paymentMethod: PaymentMethod)

/** 템플릿 + 이번 달 예정 행(없으면 null — 시작 달 전이거나 워커 전) */
data class TemplateWithOccurrence(val template: RecurringTemplate, val occurrence: RecurringOccurrence?)

object RecurringRules {
    const val NAME_MAX = 40
    const val TEMPLATE_MAX = 30

    fun dueOn(month: YearMonth, dayOfMonth: Int): LocalDate = month.atDay(minOf(dayOfMonth, month.lengthOfMonth()))

    fun validate(name: String, amount: Money, dayOfMonth: Int) {
        val trimmed = name.trim()
        if (trimmed.isEmpty() || trimmed.length > NAME_MAX) throw InvalidRecurring("TEMPLATE_NAME_INVALID", "name must be 1..$NAME_MAX chars")
        if (amount.isNegative() || amount.isZero()) throw InvalidRecurring("TEMPLATE_AMOUNT_INVALID", "amount must be positive")
        if (amount > Expense.MAX_AMOUNT) throw InvalidRecurring("TEMPLATE_AMOUNT_TOO_LARGE", "amount is too large")
        if (!Expense.isWholeWon(amount)) throw InvalidRecurring("TEMPLATE_AMOUNT_INVALID", "amount must be whole won")
        if (dayOfMonth !in 1..31) throw InvalidRecurring("TEMPLATE_DAY_INVALID", "dayOfMonth must be 1..31")
    }

    /** 확인한 지출의 날짜 — 예정일. 예정일 전에 미리 확인하면 오늘(지출 날짜는 미래가 될 수 없다) */
    fun spentOnWhenConfirmed(dueOn: LocalDate, today: LocalDate): LocalDate = if (dueOn.isAfter(today)) today else dueOn

    /** 착지에 "예정"으로 더하는 몫 — 아직 확인도 건너뛰기도 안 한 행(지난 예정일 포함 — 판단 4) */
    fun scheduledTotal(occurrences: List<RecurringOccurrence>): Money =
        occurrences.filter { it.status == OccurrenceStatus.SCHEDULED }.fold(Money.krw(0)) { acc, o -> acc + o.amount }
}

interface RecurringTemplates {
    fun add(template: RecurringTemplate)

    fun update(template: RecurringTemplate): Int

    /** 끝낸다(행은 남는다) — 끝낸 행 수 */
    fun end(id: UUID, userId: String, now: Instant): Int

    fun find(id: UUID, userId: String): RecurringTemplate?

    fun countActive(userId: String): Int

    /** 살아 있는 템플릿 + [month] 예정 행 — 한 문장(left join) */
    fun activeWithOccurrence(userId: String, month: YearMonth): List<TemplateWithOccurrence>
}

interface RecurringOccurrences {
    /** 하나 — 이미 있으면(같은 템플릿 · 달) 아무것도 쓰지 않는다 */
    fun addIfAbsent(occurrence: RecurringOccurrence): Boolean

    /** 살아 있고 [month] 가 시작 달 이후인 템플릿 전부의 [month] 예정 행 — 한 문장(`INSERT … SELECT … ON CONFLICT DO NOTHING`). 만든 수 */
    fun generateFor(month: YearMonth, now: Instant): Int

    fun find(id: UUID, userId: String): RecurringOccurrence?

    /** [month] 의 사용자 예정 행 전부(상태 무관) */
    fun inMonth(userId: String, month: YearMonth): List<RecurringOccurrence>

    /** 확인 필요 없는 템플릿의 예정 행 중 예정일이 [today] 이하이고 아직 예정인 것 — 워커 */
    fun dueAutomatic(today: LocalDate, limit: Int): List<DueOccurrence>

    /** 예정 → 확인(지출 연결). 예정이 아니면 0 — 한 문장 조건부 UPDATE(경합에 오류 코드 분기 0) */
    fun confirm(id: UUID, userId: String, expenseId: ExpenseId, amount: Money, now: Instant): Int

    /** 예정 → 건너뜀. 예정이 아니면 0 */
    fun skip(id: UUID, userId: String, now: Instant): Int

    /** 이 지출에 이어진 행을 예정으로 되돌린다(판단 5) — 되돌린 수 */
    fun reopenFor(expenseId: ExpenseId, userId: String): Int

    /** 템플릿을 끝낼 때 — 아직 예정인 행을 지운다 */
    fun deleteScheduled(templateId: UUID, userId: String): Int

    /** 템플릿을 고칠 때 — 이번 달 예정 행(아직 예정)에 새 값을 옮긴다 */
    fun refreshScheduled(template: RecurringTemplate, month: YearMonth): Int
}

class InvalidRecurring(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)

class TemplateNotFound(id: String) : DomainError("TEMPLATE_NOT_FOUND", ErrorKind.NOT_FOUND, "Template not found", mapOf("templateId" to id))

class OccurrenceNotFound(id: String) : DomainError("OCCURRENCE_NOT_FOUND", ErrorKind.NOT_FOUND, "Occurrence not found", mapOf("occurrenceId" to id))

class OccurrenceAlreadyDecided(id: String) :
    DomainError("OCCURRENCE_ALREADY_DECIDED", ErrorKind.CONFLICT, "Occurrence is already confirmed or skipped", mapOf("occurrenceId" to id))
