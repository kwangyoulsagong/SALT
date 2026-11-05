package com.salt.household.infrastructure

import com.salt.household.domain.Budget
import com.salt.household.domain.BudgetMethod
import com.salt.household.domain.Budgets
import com.salt.household.domain.Category
import com.salt.household.domain.DayTotal
import com.salt.household.domain.Expense
import com.salt.household.domain.ExpenseId
import com.salt.household.domain.Expenses
import com.salt.household.domain.InputKind
import com.salt.household.domain.IssuedLanding
import com.salt.household.domain.Landing
import com.salt.household.domain.LandingMethod
import com.salt.household.domain.Landings
import com.salt.household.domain.MonthSummary
import com.salt.household.domain.MonthTotals
import com.salt.household.domain.PaymentMethod
import com.salt.household.domain.Precision
import com.salt.household.domain.RecentMerchant
import com.salt.household.infrastructure.jooq.Tables.BUDGET
import com.salt.household.infrastructure.jooq.Tables.BUDGET_ENVELOPE
import com.salt.household.infrastructure.jooq.Tables.EXPENSE
import com.salt.household.infrastructure.jooq.Tables.LANDING_ISSUED
import com.salt.household.infrastructure.jooq.tables.records.ExpenseRecord
import com.salt.household.infrastructure.jooq.tables.records.LandingIssuedRecord
import com.salt.kernel.Currency
import com.salt.kernel.Money
import org.jooq.DSLContext
import org.jooq.impl.DSL
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneOffset

/** 가계부는 원화만 — 통화 열이 없다. 외화 지출이 생기면 열을 더하고 이 상수를 지운다 */
private val CURRENCY = Currency.KRW

/** 첫 기록 날짜는 사용자의 달력(KST)으로 */
private val KST = java.time.ZoneId.of("Asia/Seoul")

internal fun money(value: BigDecimal): Money = Money.of(value, CURRENCY)

internal fun Instant.utc() = atOffset(ZoneOffset.UTC)

class JooqExpenses(private val dsl: DSLContext) : Expenses {
    override fun add(expenses: List<Expense>) {
        if (expenses.isEmpty()) return
        // 여러 건(붙여넣기)도 문장 하나 — 건수만큼 왕복하지 않는다
        var insert = dsl.insertInto(
            EXPENSE,
            EXPENSE.ID, EXPENSE.USER_ID, EXPENSE.AMOUNT, EXPENSE.SPENT_ON, EXPENSE.CATEGORY, EXPENSE.PAYMENT_METHOD, EXPENSE.MERCHANT,
            EXPENSE.PRECISION, EXPENSE.INPUT_KIND, EXPENSE.INSTALLMENT_MONTHS, EXPENSE.MEMO, EXPENSE.CREATED_AT,
        )
        expenses.forEach { e ->
            insert = insert.values(
                e.id.value, e.userId, e.amount.toDecimal(), e.spentOn, e.category.key, e.paymentMethod.key, e.merchant,
                e.precision.key, e.inputKind.key, e.installmentMonths?.toShort(), e.memo, e.createdAt.utc(),
            )
        }
        insert.execute()
    }

    override fun delete(id: ExpenseId, userId: String): Int =
        dsl.deleteFrom(EXPENSE).where(EXPENSE.ID.eq(id.value).and(EXPENSE.USER_ID.eq(userId))).execute()

    override fun inMonth(userId: String, month: YearMonth, limit: Int): List<Expense> =
        dsl.selectFrom(EXPENSE)
            .where(EXPENSE.USER_ID.eq(userId).and(EXPENSE.SPENT_ON.between(month.atDay(1), month.atEndOfMonth())))
            .orderBy(EXPENSE.SPENT_ON.desc(), EXPENSE.CREATED_AT.desc())
            .limit(limit)
            .fetch(::toExpense)

    /** (분류, 정밀도, 템플릿인가) 로 묶은 한 문장 → 메모리에서 정확/대략 합 · 분류별 합 · 템플릿 합(S1f). 행 수 ≤ 분류 × 4 */
    override fun monthSummary(userId: String, month: YearMonth): MonthSummary {
        // 상수는 inline — 바인드 변수면 SELECT 와 GROUP BY 의 식이 서로 다른 것으로 읽혀 Postgres 가 거절한다
        val template = DSL.field(EXPENSE.INPUT_KIND.eq(DSL.inline(InputKind.TEMPLATE.key)))
        val rows = dsl.select(EXPENSE.CATEGORY, EXPENSE.PRECISION, template, DSL.sum(EXPENSE.AMOUNT), DSL.count())
            .from(EXPENSE)
            .where(EXPENSE.USER_ID.eq(userId).and(EXPENSE.SPENT_ON.between(month.atDay(1), month.atEndOfMonth())))
            .groupBy(EXPENSE.CATEGORY, EXPENSE.PRECISION, template)
            .fetch()
        var exact = Money.zero(CURRENCY)
        var approx = Money.zero(CURRENCY)
        var templateSpent = Money.zero(CURRENCY)
        var count = 0
        val byCategory = LinkedHashMap<Category, Money>()
        rows.forEach { r ->
            val sum = money(r.value4())
            count += r.value5()
            if (r.value2() == Precision.APPROX.key) approx += sum else exact += sum
            if (r.value3() == true) templateSpent += sum
            // 모르는 꼴의 키는 기타로 — 합계에서 빠지지 않게. 사용자 분류 키(`u_…`)는 그대로 둔다(가계부 S1f)
            val category = Category.parse(r.value1()) ?: Category.OTHER
            byCategory[category] = (byCategory[category] ?: Money.zero(CURRENCY)) + sum
        }
        return MonthSummary(MonthTotals(exact, approx, count), byCategory, templateSpent)
    }

    /** 전체 · 변동(템플릿 지출 뺌 — S1b 판단 4)을 한 문장으로(`FILTER`) */
    override fun dailyTotals(userId: String, from: LocalDate, to: LocalDate): Map<LocalDate, DayTotal> {
        val variable = DSL.coalesce(DSL.sum(EXPENSE.AMOUNT).filterWhere(EXPENSE.INPUT_KIND.ne(InputKind.TEMPLATE.key)), BigDecimal.ZERO)
        return dsl.select(EXPENSE.SPENT_ON, DSL.sum(EXPENSE.AMOUNT), variable)
            .from(EXPENSE)
            .where(EXPENSE.USER_ID.eq(userId).and(EXPENSE.SPENT_ON.between(from, to)))
            .groupBy(EXPENSE.SPENT_ON)
            .fetch()
            .associate { it.value1() to DayTotal(money(it.value2()), money(it.value3())) }
    }

    override fun installments(userId: String, from: LocalDate, to: LocalDate): List<Expense> =
        dsl.selectFrom(EXPENSE)
            .where(EXPENSE.USER_ID.eq(userId).and(EXPENSE.INSTALLMENT_MONTHS.isNotNull).and(EXPENSE.SPENT_ON.between(from, to)))
            .orderBy(EXPENSE.SPENT_ON.desc(), EXPENSE.CREATED_AT.desc())
            .fetch(::toExpense)

    override fun firstRecordedOn(userId: String): LocalDate? =
        dsl.select(DSL.min(EXPENSE.CREATED_AT)).from(EXPENSE).where(EXPENSE.USER_ID.eq(userId)).fetchOne()?.value1()
            ?.toInstant()?.atZone(KST)?.toLocalDate()

    /**
     * 가맹점별 횟수 + 가장 최근 행의 분류 · 금액을 한 문장으로 — 창 함수(`row_number`)로 가맹점마다 최신 행 하나, `count` 를 같은 창에서.
     */
    override fun recentMerchants(userId: String, since: LocalDate, limit: Int): List<RecentMerchant> {
        val rn = DSL.rowNumber().over().partitionBy(EXPENSE.MERCHANT).orderBy(EXPENSE.CREATED_AT.desc()).`as`("rn")
        val cnt = DSL.count().over().partitionBy(EXPENSE.MERCHANT).`as`("cnt")
        val inner = dsl.select(EXPENSE.MERCHANT, EXPENSE.CATEGORY, EXPENSE.AMOUNT, EXPENSE.CREATED_AT, rn, cnt)
            .from(EXPENSE)
            .where(EXPENSE.USER_ID.eq(userId).and(EXPENSE.MERCHANT.isNotNull).and(EXPENSE.SPENT_ON.ge(since)))
            .asTable("m")
        val merchant = inner.field(EXPENSE.MERCHANT)!!
        val category = inner.field(EXPENSE.CATEGORY)!!
        val amount = inner.field(EXPENSE.AMOUNT)!!
        val createdAt = inner.field(EXPENSE.CREATED_AT)!!
        val count = inner.field("cnt", Int::class.java)!!
        return dsl.select(merchant, category, amount, count)
            .from(inner)
            .where(inner.field("rn", Int::class.java)!!.eq(1))
            .orderBy(count.desc(), createdAt.desc())
            .limit(limit)
            .fetch()
            .map { RecentMerchant(it.value1(), Category.parse(it.value2()) ?: Category.OTHER, money(it.value3()), it.value4()) }
    }

    private fun toExpense(r: ExpenseRecord): Expense = Expense(
        id = ExpenseId(r.id),
        userId = r.userId,
        amount = money(r.amount),
        spentOn = r.spentOn,
        category = Category.parse(r.category) ?: Category.OTHER,
        paymentMethod = PaymentMethod.fromKey(r.paymentMethod) ?: PaymentMethod.OTHER,
        merchant = r.merchant,
        precision = Precision.fromKey(r.precision) ?: Precision.EXACT,
        inputKind = InputKind.fromKey(r.inputKind) ?: InputKind.QUICK,
        installmentMonths = r.installmentMonths?.toInt(),
        memo = r.memo,
        createdAt = r.createdAt.toInstant(),
    )
}

class JooqBudgets(private val dsl: DSLContext) : Budgets {
    /** 예산 · 봉투 두 문장 — 봉투는 [Budget.ordered] 순서로 다시 세운다(내 분류는 키 순 — 화면이 분류 표 순서로 다시 그린다) */
    override fun find(userId: String): Budget? {
        val head = dsl.selectFrom(BUDGET).where(BUDGET.USER_ID.eq(userId)).fetchOne() ?: return null
        val rows = dsl.select(BUDGET_ENVELOPE.ENVELOPE_KEY, BUDGET_ENVELOPE.AMOUNT).from(BUDGET_ENVELOPE)
            .where(BUDGET_ENVELOPE.USER_ID.eq(userId)).fetch().associate { it.value1() to money(it.value2()) }
        val envelopes = Budget.ordered(rows)
        return Budget(
            userId = userId,
            method = BudgetMethod.fromKey(head.method) ?: BudgetMethod.ENVELOPE,
            income = head.income?.let(::money),
            envelopes = envelopes,
            updatedAt = head.updatedAt.toInstant(),
        )
    }

    override fun replace(budget: Budget) {
        dsl.insertInto(BUDGET)
            .set(BUDGET.USER_ID, budget.userId)
            .set(BUDGET.METHOD, budget.method.key)
            .set(BUDGET.INCOME, budget.income?.toDecimal())
            .set(BUDGET.UPDATED_AT, budget.updatedAt.utc())
            .onConflict(BUDGET.USER_ID)
            .doUpdate()
            .set(BUDGET.METHOD, budget.method.key)
            .set(BUDGET.INCOME, budget.income?.toDecimal())
            .set(BUDGET.UPDATED_AT, budget.updatedAt.utc())
            .execute()
        dsl.deleteFrom(BUDGET_ENVELOPE).where(BUDGET_ENVELOPE.USER_ID.eq(budget.userId)).execute()
        var insert = dsl.insertInto(BUDGET_ENVELOPE, BUDGET_ENVELOPE.USER_ID, BUDGET_ENVELOPE.ENVELOPE_KEY, BUDGET_ENVELOPE.AMOUNT)
        budget.envelopes.forEach { (key, amount) -> insert = insert.values(budget.userId, key, amount.toDecimal()) }
        insert.execute()
    }
}

class JooqLandings(private val dsl: DSLContext) : Landings {
    override fun issueOncePerDay(issued: IssuedLanding): Boolean {
        val l = issued.landing
        return dsl.insertInto(LANDING_ISSUED)
            .set(LANDING_ISSUED.ID, issued.id)
            .set(LANDING_ISSUED.USER_ID, issued.userId)
            .set(LANDING_ISSUED.MONTH, l.month.atDay(1))
            .set(LANDING_ISSUED.ISSUED_ON, issued.issuedOn)
            .set(LANDING_ISSUED.ISSUED_AT, issued.issuedAt.utc())
            .set(LANDING_ISSUED.METHOD, l.method.key)
            .set(LANDING_ISSUED.P_LOW, l.low?.toDecimal())
            .set(LANDING_ISSUED.P_HIGH, l.high?.toDecimal())
            .set(LANDING_ISSUED.SPENT_SO_FAR, l.spentSoFar.toDecimal())
            .set(LANDING_ISSUED.SCHEDULED, l.scheduled.toDecimal())
            .set(LANDING_ISSUED.REASON, l.reason)
            .set(LANDING_ISSUED.DAYS_OF_HISTORY, l.daysOfHistory)
            .onConflictDoNothing()
            .execute() == 1
    }

    override fun lastIssued(userId: String, month: YearMonth, onOrBefore: LocalDate): IssuedLanding? =
        dsl.selectFrom(LANDING_ISSUED)
            .where(LANDING_ISSUED.USER_ID.eq(userId).and(LANDING_ISSUED.MONTH.eq(month.atDay(1))).and(LANDING_ISSUED.ISSUED_ON.le(onOrBefore)))
            .orderBy(LANDING_ISSUED.ISSUED_ON.desc())
            .limit(1)
            .fetchOne(::toIssued)

    private fun toIssued(r: LandingIssuedRecord): IssuedLanding = IssuedLanding(
        id = r.id,
        userId = r.userId,
        issuedOn = r.issuedOn,
        issuedAt = r.issuedAt.toInstant(),
        landing = Landing(
            month = YearMonth.from(r.month),
            method = LandingMethod.entries.firstOrNull { it.key == r.method } ?: LandingMethod.EMPIRICAL_WINDOW,
            spentSoFar = money(r.spentSoFar),
            scheduled = money(r.scheduled),
            low = r.pLow?.let(::money),
            high = r.pHigh?.let(::money),
            reason = r.reason,
            daysOfHistory = r.daysOfHistory,
        ),
    )
}
