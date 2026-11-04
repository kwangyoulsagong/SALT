package com.salt.household.infrastructure

import com.salt.household.domain.Budget
import com.salt.household.domain.BudgetMethod
import com.salt.household.domain.Category
import com.salt.household.domain.DueOccurrence
import com.salt.household.domain.ExpenseId
import com.salt.household.domain.MonthClose
import com.salt.household.domain.MonthCloses
import com.salt.household.domain.OccurrenceStatus
import com.salt.household.domain.PaymentMethod
import com.salt.household.domain.RecurringOccurrence
import com.salt.household.domain.RecurringOccurrences
import com.salt.household.domain.RecurringTemplate
import com.salt.household.domain.RecurringTemplates
import com.salt.household.domain.ReviewAnswers
import com.salt.household.domain.TemplateWithOccurrence
import com.salt.household.infrastructure.jooq.Tables.MONTH_CLOSE
import com.salt.household.infrastructure.jooq.Tables.MONTH_CLOSE_ENVELOPE
import com.salt.household.infrastructure.jooq.Tables.RECURRING_OCCURRENCE
import com.salt.household.infrastructure.jooq.Tables.RECURRING_TEMPLATE
import com.salt.household.infrastructure.jooq.tables.records.RecurringOccurrenceRecord
import com.salt.household.infrastructure.jooq.tables.records.RecurringTemplateRecord
import com.salt.kernel.Money
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.util.UUID

private val T = RECURRING_TEMPLATE
private val O = RECURRING_OCCURRENCE

internal fun toTemplate(r: RecurringTemplateRecord): RecurringTemplate = RecurringTemplate(
    id = r.id,
    userId = r.userId,
    name = r.name,
    amount = money(r.amount),
    category = Category.parse(r.category) ?: Category.OTHER,
    paymentMethod = PaymentMethod.fromKey(r.paymentMethod) ?: PaymentMethod.OTHER,
    dayOfMonth = r.dayOfMonth.toInt(),
    confirmRequired = r.confirmRequired,
    startsMonth = YearMonth.from(r.startsMonth),
    createdAt = r.createdAt.toInstant(),
    updatedAt = r.updatedAt.toInstant(),
)

internal fun toOccurrence(r: RecurringOccurrenceRecord): RecurringOccurrence = RecurringOccurrence(
    id = r.id,
    templateId = r.templateId,
    userId = r.userId,
    month = YearMonth.from(r.month),
    dueOn = r.dueOn,
    name = r.name,
    amount = money(r.amount),
    category = Category.parse(r.category) ?: Category.OTHER,
    status = OccurrenceStatus.fromKey(r.status) ?: OccurrenceStatus.SCHEDULED,
    expenseId = r.expenseId?.let(::ExpenseId),
    decidedAt = r.decidedAt?.toInstant(),
    createdAt = r.createdAt.toInstant(),
)

class JooqRecurringTemplates(private val dsl: DSLContext) : RecurringTemplates {
    override fun add(template: RecurringTemplate) {
        dsl.insertInto(T)
            .set(T.ID, template.id)
            .set(T.USER_ID, template.userId)
            .set(T.NAME, template.name)
            .set(T.AMOUNT, template.amount.toDecimal())
            .set(T.CATEGORY, template.category.key)
            .set(T.PAYMENT_METHOD, template.paymentMethod.key)
            .set(T.DAY_OF_MONTH, template.dayOfMonth.toShort())
            .set(T.CONFIRM_REQUIRED, template.confirmRequired)
            .set(T.STARTS_MONTH, template.startsMonth.atDay(1))
            .set(T.CREATED_AT, template.createdAt.utc())
            .set(T.UPDATED_AT, template.updatedAt.utc())
            .execute()
    }

    override fun update(template: RecurringTemplate): Int =
        dsl.update(T)
            .set(T.NAME, template.name)
            .set(T.AMOUNT, template.amount.toDecimal())
            .set(T.CATEGORY, template.category.key)
            .set(T.PAYMENT_METHOD, template.paymentMethod.key)
            .set(T.DAY_OF_MONTH, template.dayOfMonth.toShort())
            .set(T.CONFIRM_REQUIRED, template.confirmRequired)
            .set(T.UPDATED_AT, template.updatedAt.utc())
            .where(T.ID.eq(template.id).and(T.USER_ID.eq(template.userId)).and(T.ENDED_AT.isNull))
            .execute()

    override fun end(id: UUID, userId: String, now: Instant): Int =
        dsl.update(T).set(T.ENDED_AT, now.utc()).set(T.UPDATED_AT, now.utc())
            .where(T.ID.eq(id).and(T.USER_ID.eq(userId)).and(T.ENDED_AT.isNull))
            .execute()

    /** 끝낸 템플릿도 찾는다 — 확인 유스케이스가 결제수단을 읽는다(끝내면 예정 행이 지워지니 실제로는 살아 있는 것만 온다) */
    override fun find(id: UUID, userId: String): RecurringTemplate? =
        dsl.selectFrom(T).where(T.ID.eq(id).and(T.USER_ID.eq(userId))).fetchOne(::toTemplate)

    override fun countActive(userId: String): Int = dsl.fetchCount(T, T.USER_ID.eq(userId).and(T.ENDED_AT.isNull))

    override fun activeNames(userId: String): List<String> =
        dsl.select(T.NAME).from(T).where(T.USER_ID.eq(userId).and(T.ENDED_AT.isNull)).fetch(T.NAME)

    /** 한 문장 — 템플릿 left join 그 달 예정 행. 예정일 순 */
    override fun activeWithOccurrence(userId: String, month: YearMonth): List<TemplateWithOccurrence> =
        dsl.select(T.asterisk(), O.asterisk())
            .from(T)
            .leftJoin(O).on(O.TEMPLATE_ID.eq(T.ID).and(O.MONTH.eq(month.atDay(1))))
            .where(T.USER_ID.eq(userId).and(T.ENDED_AT.isNull))
            .orderBy(T.DAY_OF_MONTH, T.CREATED_AT)
            .fetch()
            .map { r: Record ->
                val template = toTemplate(r.into(T))
                val occ = r.get(O.ID)?.let { toOccurrence(r.into(O)) }
                TemplateWithOccurrence(template, occ)
            }
}

class JooqRecurringOccurrences(private val dsl: DSLContext) : RecurringOccurrences {
    override fun addIfAbsent(occurrence: RecurringOccurrence): Boolean =
        dsl.insertInto(O)
            .set(O.ID, occurrence.id)
            .set(O.TEMPLATE_ID, occurrence.templateId)
            .set(O.USER_ID, occurrence.userId)
            .set(O.MONTH, occurrence.month.atDay(1))
            .set(O.DUE_ON, occurrence.dueOn)
            .set(O.NAME, occurrence.name)
            .set(O.AMOUNT, occurrence.amount.toDecimal())
            .set(O.CATEGORY, occurrence.category.key)
            .set(O.STATUS, occurrence.status.key)
            .set(O.CREATED_AT, occurrence.createdAt.utc())
            .onConflictDoNothing()
            .execute() == 1

    /**
     * 한 문장 — 살아 있고 시작 달이 [month] 이하인 템플릿 전부. 예정일 = 그 달의 `least(day_of_month, 말일)`.
     * `(template_id, month)` 유일 + `ON CONFLICT DO NOTHING` 이라 몇 번 돌아도 같다(슬라이스 판단 2).
     */
    override fun generateFor(month: YearMonth, now: Instant): Int =
        dsl.execute(
            """
            INSERT INTO recurring_occurrence (id, template_id, user_id, month, due_on, name, amount, category, status, created_at)
            SELECT gen_random_uuid(), t.id, t.user_id, ?::date, make_date(?, ?, least(t.day_of_month::int, ?)), t.name, t.amount, t.category, 'scheduled', ?::timestamptz
            FROM recurring_template t
            WHERE t.ended_at IS NULL AND t.starts_month <= ?::date
            ON CONFLICT (template_id, month) DO NOTHING
            """.trimIndent(),
            month.atDay(1), month.year, month.monthValue, month.lengthOfMonth(), now.utc(), month.atDay(1),
        )

    override fun find(id: UUID, userId: String): RecurringOccurrence? =
        dsl.selectFrom(O).where(O.ID.eq(id).and(O.USER_ID.eq(userId))).fetchOne(::toOccurrence)

    override fun inMonth(userId: String, month: YearMonth): List<RecurringOccurrence> =
        dsl.selectFrom(O).where(O.USER_ID.eq(userId).and(O.MONTH.eq(month.atDay(1)))).orderBy(O.DUE_ON, O.NAME).fetch(::toOccurrence)

    /** 확인 필요 없는 템플릿 · 예정 · 예정일 도래 — 템플릿 결제수단과 한 문장 */
    override fun dueAutomatic(today: LocalDate, limit: Int): List<DueOccurrence> =
        dsl.select(O.asterisk(), T.PAYMENT_METHOD)
            .from(O)
            .join(T).on(T.ID.eq(O.TEMPLATE_ID))
            .where(O.STATUS.eq(OccurrenceStatus.SCHEDULED.key).and(O.DUE_ON.le(today)).and(T.CONFIRM_REQUIRED.isFalse).and(T.ENDED_AT.isNull))
            .orderBy(O.DUE_ON, O.ID)
            .limit(limit)
            .fetch()
            .map { r -> DueOccurrence(toOccurrence(r.into(O)), PaymentMethod.fromKey(r.get(T.PAYMENT_METHOD)) ?: PaymentMethod.OTHER) }

    override fun confirm(id: UUID, userId: String, expenseId: ExpenseId, amount: Money, now: Instant): Int =
        dsl.update(O)
            .set(O.STATUS, OccurrenceStatus.CONFIRMED.key)
            .set(O.EXPENSE_ID, expenseId.value)
            .set(O.AMOUNT, amount.toDecimal())
            .set(O.DECIDED_AT, now.utc())
            .where(O.ID.eq(id).and(O.USER_ID.eq(userId)).and(O.STATUS.eq(OccurrenceStatus.SCHEDULED.key)))
            .execute()

    override fun skip(id: UUID, userId: String, now: Instant): Int =
        dsl.update(O)
            .set(O.STATUS, OccurrenceStatus.SKIPPED.key)
            .set(O.DECIDED_AT, now.utc())
            .where(O.ID.eq(id).and(O.USER_ID.eq(userId)).and(O.STATUS.eq(OccurrenceStatus.SCHEDULED.key)))
            .execute()

    override fun reopenFor(expenseId: ExpenseId, userId: String): Int =
        dsl.update(O)
            .set(O.STATUS, OccurrenceStatus.SCHEDULED.key)
            .setNull(O.EXPENSE_ID)
            .setNull(O.DECIDED_AT)
            .where(O.EXPENSE_ID.eq(expenseId.value).and(O.USER_ID.eq(userId)))
            .execute()

    override fun deleteScheduled(templateId: UUID, userId: String): Int =
        dsl.deleteFrom(O).where(O.TEMPLATE_ID.eq(templateId).and(O.USER_ID.eq(userId)).and(O.STATUS.eq(OccurrenceStatus.SCHEDULED.key))).execute()

    override fun refreshScheduled(template: RecurringTemplate, month: YearMonth): Int =
        dsl.update(O)
            .set(O.NAME, template.name)
            .set(O.AMOUNT, template.amount.toDecimal())
            .set(O.CATEGORY, template.category.key)
            .set(O.DUE_ON, template.dueOn(month))
            .where(
                O.TEMPLATE_ID.eq(template.id).and(O.USER_ID.eq(template.userId)).and(O.MONTH.eq(month.atDay(1)))
                    .and(O.STATUS.eq(OccurrenceStatus.SCHEDULED.key)),
            )
            .execute()
}

class JooqMonthCloses(private val dsl: DSLContext) : MonthCloses {
    private val C = MONTH_CLOSE
    private val E = MONTH_CLOSE_ENVELOPE

    /** 두 문장 — 마감 행 · 사본 봉투. 봉투 순서는 지금 예산과 같은 분류 표 순서 */
    override fun find(userId: String, month: YearMonth): MonthClose? {
        val head = dsl.selectFrom(C).where(C.USER_ID.eq(userId).and(C.MONTH.eq(month.atDay(1)))).fetchOne() ?: return null
        val budget = head.budgetMethod?.let { method ->
            val rows = dsl.select(E.ENVELOPE_KEY, E.AMOUNT).from(E).where(E.CLOSE_ID.eq(head.id)).fetch().associate { it.value1() to money(it.value2()) }
            Budget(
                userId = userId,
                method = BudgetMethod.fromKey(method) ?: BudgetMethod.ENVELOPE,
                income = head.budgetIncome?.let(::money),
                envelopes = Budget.ordered(rows),
                updatedAt = head.closedAt.toInstant(),
            )
        }
        return MonthClose(
            id = head.id,
            userId = userId,
            month = month,
            answers = ReviewAnswers(head.answerSatisfied, head.answerTryNext, head.answerKnownNext),
            budget = budget,
            closedAt = head.closedAt.toInstant(),
            updatedAt = head.updatedAt.toInstant(),
        )
    }

    override fun insertIfAbsent(close: MonthClose): Boolean {
        val inserted = dsl.insertInto(C)
            .set(C.ID, close.id)
            .set(C.USER_ID, close.userId)
            .set(C.MONTH, close.month.atDay(1))
            .set(C.ANSWER_SATISFIED, close.answers.satisfied)
            .set(C.ANSWER_TRY_NEXT, close.answers.tryNext)
            .set(C.ANSWER_KNOWN_NEXT, close.answers.knownNext)
            .set(C.BUDGET_METHOD, close.budget?.method?.key)
            .set(C.BUDGET_INCOME, close.budget?.income?.toDecimal())
            .set(C.CLOSED_AT, close.closedAt.utc())
            .set(C.UPDATED_AT, close.updatedAt.utc())
            .onConflictDoNothing()
            .execute() == 1
        val envelopes = close.budget?.envelopes.orEmpty()
        if (inserted && envelopes.isNotEmpty()) {
            var insert = dsl.insertInto(E, E.CLOSE_ID, E.ENVELOPE_KEY, E.AMOUNT)
            envelopes.forEach { (key, amount) -> insert = insert.values(close.id, key, amount.toDecimal()) }
            insert.execute()
        }
        return inserted
    }

    override fun updateAnswers(userId: String, month: YearMonth, answers: ReviewAnswers, now: Instant): Int =
        dsl.update(C)
            .set(C.ANSWER_SATISFIED, answers.satisfied)
            .set(C.ANSWER_TRY_NEXT, answers.tryNext)
            .set(C.ANSWER_KNOWN_NEXT, answers.knownNext)
            .set(C.UPDATED_AT, now.utc())
            .where(C.USER_ID.eq(userId).and(C.MONTH.eq(month.atDay(1))))
            .execute()
}
