package com.salt.savings.application

import com.salt.kernel.Money
import com.salt.savings.domain.Deposit
import com.salt.savings.domain.DepositOverview
import com.salt.savings.domain.DepositTotals
import com.salt.savings.domain.Deposits
import com.salt.savings.domain.ForecastReads
import com.salt.savings.domain.Goal
import com.salt.savings.domain.GoalId
import com.salt.savings.domain.GoalStatus
import com.salt.savings.domain.GoalTemplate
import com.salt.savings.domain.Goals
import com.salt.savings.domain.ItemUnit
import com.salt.savings.domain.ItemUnits
import com.salt.savings.domain.MonthlyDeposit
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneOffset
import java.util.UUID

/**
 * 목록 요약 띠(`SRV-REQ-045` FR-20) — 합은 서버, 가장 이른 도달 고르기의 허용 · 거절 경계.
 *
 * | 경우 | 기대 |
 * |---|---|
 * | 진행 중 둘, 계획 달이 다르다 | 이른 쪽 |
 * | 멈춘 목표가 더 이르다(계획 달이 남아 있다) | 진행 중만 — 멈춘 목표는 빠진다 |
 * | 같은 달 | 먼저 만든 목표 |
 * | 목표 0 | 합 null · 이번 달 0 · 도달 null |
 * | 이번 달 합 | 다 찬 목표의 이번 달 적립도 더한다(이정표 넣은 돈과 같은 집계) |
 */
class GoalsOverviewSpec : StringSpec({
    // 2026-11-19 12:00 KST
    val clock = Clock.fixed(Instant.parse("2026-11-19T03:00:00Z"), ZoneOffset.UTC)

    fun goal(title: String, target: Long, plan: Long, status: GoalStatus = GoalStatus.ACTIVE, created: String = "2026-06-01T00:00:00Z") =
        Goal(GoalId.new(), "u", title, GoalTemplate.OTHER, Money.krw(target), null, Money.krw(plan), null, status, Instant.parse(created), null)

    fun totals(saved: Long, thisMonth: Long) = DepositTotals(Money.krw(saved), 1, LocalDate.parse("2026-11-10"), Money.krw(thisMonth), 1)

    fun overview(list: List<Goal>, byGoal: Map<GoalId, DepositTotals>): GoalsOverview.View {
        val goals = object : Goals {
            override fun save(goal: Goal) = Unit
            override fun findOwned(id: GoalId, userId: String) = list.firstOrNull { it.id == id }
            override fun lockOwned(id: GoalId, userId: String) = findOwned(id, userId)
            override fun listOwned(userId: String) = list
            override fun markCompleted(id: GoalId, at: Instant) = Unit
            override fun updateMonthlyPlan(id: GoalId, plan: Money, at: Instant) = Unit
        }
        val deposits = object : Deposits {
            override fun add(deposit: Deposit) = true
            override fun goalOfSourceRef(userId: String, sourceRef: UUID): GoalId? = null
            override fun totalsFor(goalId: GoalId, thisMonth: YearMonth): DepositTotals? = byGoal[goalId]
            override fun overviewByGoal(userId: String, thisMonth: YearMonth) = DepositOverview(byGoal, emptyMap())
            override fun monthly(goalId: GoalId): List<MonthlyDeposit> = emptyList()
            override fun recent(goalId: GoalId, limit: Int): List<Deposit> = emptyList()
        }
        val units = object : ItemUnits {
            override fun add(unit: ItemUnit) = Unit
            override fun delete(id: UUID, goalId: GoalId, userId: String) = 0
            override fun countFor(goalId: GoalId, userId: String) = 0
            override fun forGoal(goalId: GoalId, userId: String): List<ItemUnit> = emptyList()
            override fun byGoal(userId: String): Map<GoalId, List<ItemUnit>> = emptyMap()
        }
        val forecasts = object : ForecastReads {
            override fun savingsCoverage() = error("요약 띠는 적중 이력을 읽지 않는다")
            override fun priceIndex() = error("요약 띠는 물가를 읽지 않는다")
        }
        return GoalsOverview(GoalReader(goals, deposits, units, clock, forecasts), clock).execute("u")
    }

    "진행 중 둘 — 계획 달이 이른 목표" {
        val far = goal("먼", 10_000_000, 100_000)
        val near = goal("가까운", 1_000_000, 100_000)
        overview(listOf(far, near), emptyMap()).nearestReach?.goal?.id shouldBe near.id
    }

    "멈춘 목표는 계획 달이 더 일러도 빠진다 — 진행 중만" {
        val paused = goal("멈춤", 200_000, 100_000, GoalStatus.PAUSED)
        val active = goal("진행", 1_000_000, 100_000)
        val view = overview(listOf(paused, active), emptyMap())
        view.nearestReach?.goal?.id shouldBe active.id
        view.activeGoals shouldBe 1
    }

    "같은 달이면 먼저 만든 목표" {
        val later = goal("나중", 1_000_000, 100_000, created = "2026-07-01T00:00:00Z")
        val earlier = goal("먼저", 1_000_000, 100_000, created = "2026-05-01T00:00:00Z")
        overview(listOf(later, earlier), emptyMap()).nearestReach?.goal?.id shouldBe earlier.id
    }

    "목표 0 — 합 null · 이번 달 0 · 도달 null" {
        val view = overview(emptyList(), emptyMap())
        view.totalGoals shouldBe 0
        view.totalSaved shouldBe null
        view.monthDeposited shouldBe Money.krw(0)
        view.nearestReach shouldBe null
        view.month shouldBe YearMonth.of(2026, 11)
    }

    "합 — 모은 돈은 전부(다 찬 목표 포함), 이번 달은 목표마다 이번 달 적립의 합" {
        val a = goal("가", 1_000_000, 100_000)
        val b = goal("나", 2_000_000, 100_000)
        val done = goal("다 참", 300_000, 100_000, GoalStatus.COMPLETED)
        val view = overview(listOf(a, b, done), mapOf(a.id to totals(250_000, 50_000), b.id to totals(400_000, 120_000), done.id to totals(300_000, 30_000)))
        view.totalSaved shouldBe Money.krw(950_000)
        view.monthDeposited shouldBe Money.krw(200_000)
        view.activeGoals shouldBe 2
        view.totalGoals shouldBe 3
    }
})
