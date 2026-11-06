package com.salt.savings.infrastructure

import com.salt.kernel.Currency
import com.salt.kernel.Money
import com.salt.savings.domain.Deposit
import com.salt.savings.domain.DepositOverview
import com.salt.savings.domain.DepositSource
import com.salt.savings.domain.DepositTotals
import com.salt.savings.domain.Deposits
import com.salt.savings.domain.Goal
import com.salt.savings.domain.GoalId
import com.salt.savings.domain.GoalStatus
import com.salt.savings.domain.GoalTemplate
import com.salt.savings.domain.Goals
import com.salt.savings.domain.InterestPlan
import com.salt.savings.domain.ItemUnit
import com.salt.savings.domain.ItemUnits
import com.salt.savings.domain.IssuedProjection
import com.salt.savings.domain.MonthlyDeposit
import com.salt.savings.domain.Projection
import com.salt.savings.domain.ProjectionMethod
import com.salt.savings.domain.Projections
import com.salt.savings.infrastructure.jooq.Tables.DEPOSIT
import com.salt.savings.infrastructure.jooq.Tables.GOAL
import com.salt.savings.infrastructure.jooq.Tables.ITEM_UNIT
import com.salt.savings.infrastructure.jooq.Tables.PROJECTION_ISSUED
import com.salt.savings.infrastructure.jooq.tables.records.GoalRecord
import org.jooq.DSLContext
import org.jooq.impl.DSL
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneOffset
import java.util.UUID

/** 저축은 원화만 — 통화 열이 없다(옛 goals 도 없었다). 외화 목표가 생기면 열을 더하고 이 상수를 지운다 */
private val CURRENCY = Currency.KRW

private fun money(value: BigDecimal): Money = Money.of(value, CURRENCY)

private fun Instant.utc() = atOffset(ZoneOffset.UTC)

class JooqGoals(private val dsl: DSLContext) : Goals {
    override fun save(goal: Goal) {
        dsl.insertInto(GOAL)
            .set(GOAL.ID, goal.id.value)
            .set(GOAL.USER_ID, goal.userId)
            .set(GOAL.TITLE, goal.title)
            .set(GOAL.TEMPLATE, goal.template.key)
            .set(GOAL.TARGET_AMOUNT, goal.targetAmount.toDecimal())
            .set(GOAL.TARGET_DATE, goal.targetDate)
            .set(GOAL.MONTHLY_PLAN, goal.monthlyPlan?.toDecimal())
            .set(GOAL.INCLUDE_INTEREST, goal.interest != null)
            .set(GOAL.ANNUAL_RATE, goal.interest?.annualRatePercent)
            .set(GOAL.STATUS, goal.status.key)
            .set(GOAL.CREATED_AT, goal.createdAt.utc())
            .set(GOAL.UPDATED_AT, goal.createdAt.utc())
            .execute()
    }

    override fun findOwned(id: GoalId, userId: String): Goal? =
        dsl.selectFrom(GOAL).where(GOAL.ID.eq(id.value).and(GOAL.USER_ID.eq(userId)).and(GOAL.ARCHIVED_AT.isNull)).fetchOne(::toGoal)

    override fun lockOwned(id: GoalId, userId: String): Goal? =
        dsl.selectFrom(GOAL).where(GOAL.ID.eq(id.value).and(GOAL.USER_ID.eq(userId)).and(GOAL.ARCHIVED_AT.isNull)).forUpdate().fetchOne(::toGoal)

    override fun listOwned(userId: String): List<Goal> =
        dsl.selectFrom(GOAL)
            .where(GOAL.USER_ID.eq(userId).and(GOAL.ARCHIVED_AT.isNull))
            // 진행 중 → 멈춤 → 다 찬 목표, 같은 상태 안에선 만든 순서
            .orderBy(DSL.case_(GOAL.STATUS).`when`("active", 0).`when`("paused", 1).else_(2), GOAL.CREATED_AT.asc())
            .fetch(::toGoal)

    override fun markCompleted(id: GoalId, at: Instant) {
        dsl.update(GOAL)
            .set(GOAL.STATUS, GoalStatus.COMPLETED.key)
            .set(GOAL.COMPLETED_AT, at.utc())
            .set(GOAL.UPDATED_AT, at.utc())
            .where(GOAL.ID.eq(id.value))
            .execute()
    }

    override fun updateMonthlyPlan(id: GoalId, plan: Money, at: Instant) {
        dsl.update(GOAL)
            .set(GOAL.MONTHLY_PLAN, plan.toDecimal())
            .set(GOAL.UPDATED_AT, at.utc())
            .where(GOAL.ID.eq(id.value))
            .execute()
    }

    private fun toGoal(r: GoalRecord): Goal = Goal(
        id = GoalId(r.id),
        userId = r.userId,
        title = r.title,
        template = GoalTemplate.fromKey(r.template) ?: GoalTemplate.OTHER,
        targetAmount = money(r.targetAmount),
        targetDate = r.targetDate,
        monthlyPlan = r.monthlyPlan?.let(::money),
        interest = r.annualRate?.takeIf { r.includeInterest }?.let(::InterestPlan),
        status = GoalStatus.fromKey(r.status),
        createdAt = r.createdAt.toInstant(),
        completedAt = r.completedAt?.toInstant(),
    )
}

class JooqDeposits(private val dsl: DSLContext) : Deposits {
    override fun add(deposit: Deposit): Boolean =
        dsl.insertInto(DEPOSIT)
            .set(DEPOSIT.ID, deposit.id)
            .set(DEPOSIT.GOAL_ID, deposit.goalId.value)
            .set(DEPOSIT.USER_ID, deposit.userId)
            .set(DEPOSIT.AMOUNT, deposit.amount.toDecimal())
            .set(DEPOSIT.DEPOSITED_ON, deposit.depositedOn)
            .set(DEPOSIT.NOTE, deposit.note)
            .set(DEPOSIT.SPLIT_GROUP_ID, deposit.splitGroupId)
            .set(DEPOSIT.SOURCE, deposit.source.key)
            .set(DEPOSIT.CREATED_AT, deposit.createdAt.utc())
            .set(DEPOSIT.SOURCE_REF, deposit.sourceRef)
            // 출처가 있는 적립은 한 번만(V3 유일 인덱스). 출처 없는 행은 NULL 이라 서로 부딪히지 않는다
            .onConflictDoNothing()
            .execute() == 1

    override fun goalOfSourceRef(userId: String, sourceRef: UUID): GoalId? =
        dsl.select(DEPOSIT.GOAL_ID).from(DEPOSIT)
            .where(DEPOSIT.SOURCE_REF.eq(sourceRef).and(DEPOSIT.USER_ID.eq(userId)))
            .fetchOne(DEPOSIT.GOAL_ID)
            ?.let(::GoalId)

    override fun totalsFor(goalId: GoalId, thisMonth: YearMonth): DepositTotals? {
        val monthStart = thisMonth.atDay(1)
        val thisMonthSum = DSL.sum(DSL.`when`(DEPOSIT.DEPOSITED_ON.ge(monthStart), DEPOSIT.AMOUNT).else_(BigDecimal.ZERO))
        return dsl.select(DSL.sum(DEPOSIT.AMOUNT), DSL.count(), DSL.max(DEPOSIT.DEPOSITED_ON), thisMonthSum, actionCount())
            .from(DEPOSIT)
            .where(DEPOSIT.GOAL_ID.eq(goalId.value))
            .fetchOne()
            ?.takeIf { it.value2() > 0 }
            ?.let { DepositTotals(money(it.value1()), it.value2(), it.value3(), money(it.value4() ?: BigDecimal.ZERO), it.value5()) }
    }

    /** 직접 넣은 적립 건수 — 가져온 잔액 한 줄은 도장이 아니다 */
    private fun actionCount() = DSL.count().filterWhere(DEPOSIT.SOURCE.ne(DepositSource.IMPORTED_BALANCE.key))

    /**
     * (목표, 달, 가져온 잔액인가) 로 묶은 한 문장 → 메모리에서 두 모양으로. 행 수 = 목표 × 적립한 달(사용자 하나 몫)이라 작다.
     * 이번 달 합에는 가져온 잔액도 들어간다(`totalsFor` 와 같은 뜻), 월별 표본 · 도장 건수에는 빠진다(`monthly` 와 같은 뜻)
     */
    override fun overviewByGoal(userId: String, thisMonth: YearMonth): DepositOverview {
        val month = DSL.field("date_trunc('month', {0})::date", LocalDate::class.java, DEPOSIT.DEPOSITED_ON)
        // 값을 인라인으로 — 바인드(?)면 SELECT 와 GROUP BY 의 식이 서로 다른 매개변수라 Postgres 가 같은 식으로 보지 않는다
        val imported = DSL.field(DEPOSIT.SOURCE.eq(DSL.inline(DepositSource.IMPORTED_BALANCE.key)))
        val rows = dsl.select(DEPOSIT.GOAL_ID, month, imported, DSL.sum(DEPOSIT.AMOUNT), DSL.count(), DSL.max(DEPOSIT.DEPOSITED_ON))
            .from(DEPOSIT)
            .where(DEPOSIT.USER_ID.eq(userId))
            .groupBy(DEPOSIT.GOAL_ID, month, imported)
            .fetch()
        val byGoal = rows.groupBy { GoalId(it.value1()) }
        val zero = money(BigDecimal.ZERO)
        val totals = byGoal.mapValues { (_, rs) ->
            DepositTotals(
                saved = rs.map { money(it.value4()) }.fold(zero, Money::plus),
                count = rs.sumOf { it.value5() },
                lastDepositedOn = rs.mapNotNull { it.value6() }.maxOrNull(),
                thisMonth = rs.filter { YearMonth.from(it.value2()) == thisMonth }.map { money(it.value4()) }.fold(zero, Money::plus),
                actions = rs.filter { it.value3() != true }.sumOf { it.value5() },
            )
        }
        val monthly = byGoal.mapValues { (_, rs) ->
            rs.filter { it.value3() != true }
                .groupBy { YearMonth.from(it.value2()) }
                .map { (m, ms) -> MonthlyDeposit(m, ms.map { money(it.value4()) }.fold(zero, Money::plus)) }
                .sortedBy { it.month }
        }.filterValues { it.isNotEmpty() }
        return DepositOverview(totals, monthly)
    }

    override fun monthly(goalId: GoalId): List<MonthlyDeposit> {
        val month = DSL.field("date_trunc('month', {0})::date", LocalDate::class.java, DEPOSIT.DEPOSITED_ON)
        return dsl.select(month, DSL.sum(DEPOSIT.AMOUNT))
            .from(DEPOSIT)
            // 가져온 잔액 한 줄은 "한 달 적립"이 아니다 — 표본에 넣으면 그 달 하나가 분위수를 끌어올린다(모은 돈 합계엔 들어간다)
            .where(DEPOSIT.GOAL_ID.eq(goalId.value).and(DEPOSIT.SOURCE.ne(DepositSource.IMPORTED_BALANCE.key)))
            .groupBy(month)
            .orderBy(month)
            .fetch { MonthlyDeposit(YearMonth.from(it.value1()), money(it.value2())) }
    }

    override fun recent(goalId: GoalId, limit: Int): List<Deposit> =
        dsl.selectFrom(DEPOSIT)
            .where(DEPOSIT.GOAL_ID.eq(goalId.value))
            .orderBy(DEPOSIT.DEPOSITED_ON.desc(), DEPOSIT.CREATED_AT.desc())
            .limit(limit)
            .fetch {
                Deposit(
                    it.id, GoalId(it.goalId), it.userId, money(it.amount), it.depositedOn, it.note, it.splitGroupId,
                    DepositSource.fromKey(it.source), it.createdAt.toInstant(), it.sourceRef,
                )
            }
}

class JooqProjections(private val dsl: DSLContext) : Projections {
    override fun issue(issued: IssuedProjection) {
        val p = issued.projection
        dsl.insertInto(PROJECTION_ISSUED)
            .set(PROJECTION_ISSUED.ID, issued.id)
            .set(PROJECTION_ISSUED.GOAL_ID, issued.goalId.value)
            .set(PROJECTION_ISSUED.ISSUED_AT, issued.issuedAt.utc())
            .set(PROJECTION_ISSUED.METHOD, p.method.key)
            .set(PROJECTION_ISSUED.P_LOW_DATE, p.early?.atDay(1))
            .set(PROJECTION_ISSUED.P_HIGH_DATE, p.late?.atDay(1))
            .set(PROJECTION_ISSUED.PLAN_DATE, p.plan?.atDay(1))
            .set(PROJECTION_ISSUED.REASON, p.reason)
            .set(PROJECTION_ISSUED.MONTHS_OF_HISTORY, p.monthsOfHistory)
            .execute()
    }
}

class JooqItemUnits(private val dsl: DSLContext) : ItemUnits {
    override fun add(unit: ItemUnit) {
        dsl.insertInto(ITEM_UNIT)
            .set(ITEM_UNIT.ID, unit.id)
            .set(ITEM_UNIT.USER_ID, unit.userId)
            .set(ITEM_UNIT.GOAL_ID, unit.goalId.value)
            .set(ITEM_UNIT.NAME, unit.name)
            .set(ITEM_UNIT.UNIT_PRICE, unit.unitPrice.toDecimal())
            .set(ITEM_UNIT.CREATED_AT, unit.createdAt.utc())
            .execute()
    }

    override fun delete(id: UUID, goalId: GoalId, userId: String): Int =
        dsl.deleteFrom(ITEM_UNIT)
            .where(ITEM_UNIT.ID.eq(id).and(ITEM_UNIT.GOAL_ID.eq(goalId.value)).and(ITEM_UNIT.USER_ID.eq(userId)))
            .execute()

    override fun countFor(goalId: GoalId, userId: String): Int =
        dsl.fetchCount(ITEM_UNIT, ITEM_UNIT.USER_ID.eq(userId).and(ITEM_UNIT.GOAL_ID.eq(goalId.value)))

    override fun forGoal(goalId: GoalId, userId: String): List<ItemUnit> =
        dsl.selectFrom(ITEM_UNIT).where(ITEM_UNIT.USER_ID.eq(userId).and(ITEM_UNIT.GOAL_ID.eq(goalId.value))).orderBy(ITEM_UNIT.CREATED_AT.asc(), ITEM_UNIT.ID.asc()).fetch(::toUnit)

    override fun byGoal(userId: String): Map<GoalId, List<ItemUnit>> =
        dsl.selectFrom(ITEM_UNIT)
            .where(ITEM_UNIT.USER_ID.eq(userId))
            .orderBy(ITEM_UNIT.CREATED_AT.asc(), ITEM_UNIT.ID.asc())
            .fetch(::toUnit)
            .groupBy { it.goalId }

    private fun toUnit(r: com.salt.savings.infrastructure.jooq.tables.records.ItemUnitRecord): ItemUnit =
        ItemUnit(r.id, GoalId(r.goalId), r.userId, r.name, money(r.unitPrice), r.createdAt.toInstant())
}
