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
import com.salt.savings.domain.ProjectionReason
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.Clock
import java.time.Instant
import java.time.YearMonth
import java.time.ZoneOffset
import java.util.UUID

/**
 * 상세 조립의 부분 실패(리뷰 10차) — 놓친 달 계산이 깨져도 상세는 나오고, 그 칸만 degraded · 응답 최상위 이유에 `missed_months`.
 * goal 칸(구간)은 그대로라 목록 · 쓰기 응답과 같은 모양이다
 */
class GoalReaderSpec : StringSpec({
    val clock = Clock.fixed(Instant.parse("2026-11-03T03:00:00Z"), ZoneOffset.UTC)
    val goal = Goal(GoalId.new(), "u", "목표", GoalTemplate.OTHER, Money.krw(1_000_000), null, Money.krw(100_000), null, GoalStatus.ACTIVE, Instant.parse("2026-06-01T00:00:00Z"), null)
    val goals = object : Goals {
        override fun save(goal: Goal) = Unit
        override fun findOwned(id: GoalId, userId: String) = goal.takeIf { it.id == id && it.userId == userId }
        override fun lockOwned(id: GoalId, userId: String) = findOwned(id, userId)
        override fun listOwned(userId: String) = listOf(goal)
        override fun markCompleted(id: GoalId, at: Instant) = Unit
        override fun updateMonthlyPlan(id: GoalId, plan: Money, at: Instant) = Unit
    }
    val deposits = object : Deposits {
        override fun add(deposit: Deposit) = true
        override fun goalOfSourceRef(userId: String, sourceRef: UUID): GoalId? = null
        override fun totalsFor(goalId: GoalId, thisMonth: YearMonth): DepositTotals? = null
        override fun overviewByGoal(userId: String, thisMonth: YearMonth) = DepositOverview(emptyMap(), emptyMap())
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

    val noForecast = object : ForecastReads {
        override fun savingsCoverage() = null
        override fun priceIndex() = null
    }

    "놓친 달 계산이 실패하면 그 칸만 degraded — 상세는 나오고 이유는 missed_months" {
        val reader = GoalReader(goals, deposits, units, clock, noForecast, MissedMonthsCalculator { _, _, _, _, _, _ -> error("injected") })
        val detail = reader.detail("u", goal.id.toString())
        detail.missedMonths.reason shouldBe ProjectionReason.DEGRADED
        detail.degradedReasons shouldBe listOf("missed_months")
        detail.summary.degraded shouldBe false
    }

    "정상이면 이유 없음" {
        GoalReader(goals, deposits, units, clock, noForecast).detail("u", goal.id.toString()).degradedReasons shouldBe emptyList()
    }
})

/** 예측 뷰를 못 읽어도 목록 · 상세는 나오고 그 칸만 이유(`SRV-REQ-045` FR-6 · 10) · 홈 카드는 예측을 읽지 않는다 */
class GoalReaderForecastSpec : StringSpec({
    val clock = Clock.fixed(Instant.parse("2026-11-18T03:00:00Z"), ZoneOffset.UTC)
    val goal = Goal(GoalId.new(), "u", "목표", GoalTemplate.OTHER, Money.krw(30_000_000), null, Money.krw(500_000), null, GoalStatus.ACTIVE, Instant.parse("2024-11-01T00:00:00Z"), null)
    val goals = object : Goals {
        override fun save(goal: Goal) = Unit
        override fun findOwned(id: GoalId, userId: String) = goal.takeIf { it.id == id && it.userId == userId }
        override fun lockOwned(id: GoalId, userId: String) = findOwned(id, userId)
        override fun listOwned(userId: String) = listOf(goal)
        override fun markCompleted(id: GoalId, at: Instant) = Unit
        override fun updateMonthlyPlan(id: GoalId, plan: Money, at: Instant) = Unit
    }
    val deposits = object : Deposits {
        override fun add(deposit: Deposit) = true
        override fun goalOfSourceRef(userId: String, sourceRef: UUID): GoalId? = null
        override fun totalsFor(goalId: GoalId, thisMonth: YearMonth): DepositTotals? = null
        override fun overviewByGoal(userId: String, thisMonth: YearMonth) = DepositOverview(emptyMap(), emptyMap())
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
    class Counting(val coverage: List<com.salt.savings.domain.Coverage>?, val index: List<com.salt.savings.domain.PriceIndexMonth>?) : ForecastReads {
        var reads = 0
        override fun savingsCoverage() = coverage.also { reads++ }
        override fun priceIndex() = index.also { reads++ }
    }

    "예측을 못 읽으면 목록 · 상세 모두 unavailable — 예외 0" {
        val f = Counting(null, null)
        val reader = GoalReader(goals, deposits, units, clock, f)
        reader.summaries("u").single().track.reason shouldBe "unavailable"
        val detail = reader.detail("u", goal.id.toString())
        detail.summary.track.reason shouldBe "unavailable"
        detail.todayMoney.reason shouldBe "unavailable"
        detail.degradedReasons shouldBe emptyList()
    }

    "홈 카드(단위 없이)는 예측 뷰를 읽지 않는다 · 목록은 요청마다 한 번" {
        val f = Counting(emptyList(), emptyList())
        val reader = GoalReader(goals, deposits, units, clock, f)
        reader.summaries("u", withUnits = false)
        f.reads shouldBe 0
        reader.summaries("u")
        f.reads shouldBe 1
    }
})
