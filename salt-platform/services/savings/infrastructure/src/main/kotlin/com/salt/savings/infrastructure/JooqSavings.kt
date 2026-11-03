package com.salt.savings.infrastructure

import com.salt.kernel.Currency
import com.salt.kernel.Money
import com.salt.savings.domain.Deposit
import com.salt.savings.domain.DepositSource
import com.salt.savings.domain.DepositTotals
import com.salt.savings.domain.Deposits
import com.salt.savings.domain.Goal
import com.salt.savings.domain.GoalId
import com.salt.savings.domain.GoalStatus
import com.salt.savings.domain.GoalTemplate
import com.salt.savings.domain.Goals
import com.salt.savings.domain.InterestPlan
import com.salt.savings.domain.IssuedProjection
import com.salt.savings.domain.MonthlyDeposit
import com.salt.savings.domain.Projection
import com.salt.savings.domain.ProjectionMethod
import com.salt.savings.domain.Projections
import com.salt.savings.infrastructure.jooq.Tables.DEPOSIT
import com.salt.savings.infrastructure.jooq.Tables.GOAL
import com.salt.savings.infrastructure.jooq.Tables.PROJECTION_ISSUED
import com.salt.savings.infrastructure.jooq.tables.records.GoalRecord
import org.jooq.DSLContext
import org.jooq.impl.DSL
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneOffset

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
    override fun add(deposit: Deposit) {
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
            .execute()
    }

    /** 목표마다 합계 · 건수 · 마지막 날 · 이번 달 합 — 한 문장(GROUP BY) */
    override fun totalsByGoal(userId: String, thisMonth: YearMonth): Map<GoalId, DepositTotals> {
        val monthStart = thisMonth.atDay(1)
        val thisMonthSum = DSL.sum(DSL.`when`(DEPOSIT.DEPOSITED_ON.ge(monthStart), DEPOSIT.AMOUNT).else_(BigDecimal.ZERO))
        return dsl.select(DEPOSIT.GOAL_ID, DSL.sum(DEPOSIT.AMOUNT), DSL.count(), DSL.max(DEPOSIT.DEPOSITED_ON), thisMonthSum)
            .from(DEPOSIT)
            .where(DEPOSIT.USER_ID.eq(userId))
            .groupBy(DEPOSIT.GOAL_ID)
            .fetch()
            .associate { r ->
                GoalId(r.value1()) to DepositTotals(
                    saved = money(r.value2()),
                    count = r.value3(),
                    lastDepositedOn = r.value4(),
                    thisMonth = money(r.value5() ?: BigDecimal.ZERO),
                )
            }
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
                    DepositSource.fromKey(it.source), it.createdAt.toInstant(),
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

    /** 목표마다 최근 하나 — DISTINCT ON(인덱스 goal_id, issued_at desc 를 탄다). 남의 목표는 goal 조인의 user_id 조건이 거른다 */
    override fun latestByGoal(userId: String): Map<GoalId, IssuedProjection> =
        dsl.select(PROJECTION_ISSUED.asterisk())
            .distinctOn(PROJECTION_ISSUED.GOAL_ID)
            .from(PROJECTION_ISSUED)
            .join(GOAL).on(GOAL.ID.eq(PROJECTION_ISSUED.GOAL_ID))
            .where(GOAL.USER_ID.eq(userId))
            .orderBy(PROJECTION_ISSUED.GOAL_ID, PROJECTION_ISSUED.ISSUED_AT.desc())
            .fetchInto(PROJECTION_ISSUED)
            .associate { r ->
                GoalId(r.goalId) to IssuedProjection(
                    r.id,
                    GoalId(r.goalId),
                    r.issuedAt.toInstant(),
                    Projection(
                        ProjectionMethod.fromKey(r.method),
                        r.pLowDate?.let(YearMonth::from),
                        r.pHighDate?.let(YearMonth::from),
                        r.planDate?.let(YearMonth::from),
                        r.reason,
                        r.monthsOfHistory,
                    ),
                )
            }
}
