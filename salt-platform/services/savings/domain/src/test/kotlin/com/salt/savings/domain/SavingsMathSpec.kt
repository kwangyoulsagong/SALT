package com.salt.savings.domain

import com.salt.kernel.Money
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth

/** 계산 경계(`SRV-REQ-045` 수용 기준 2) — 기한 지남 · 0 · 달성 · 이자 포함/제외 */
class SavingsMathSpec : StringSpec({
    val today = LocalDate.of(2026, 11, 3)
    val krw = { v: Long -> Money.krw(v) }
    val zero = krw(0)

    "기한 12달 · 이자 없음 → 1200만 원은 월 100만 원, 도달 월 = 기한의 달" {
        val c = SavingsMath.byDeadline(krw(12_000_000), zero, LocalDate.of(2027, 11, 3), null, today)
        c.state shouldBe CalculationState.OK
        c.months shouldBe 12
        c.monthly shouldBe krw(1_000_000)
        c.reachMonth shouldBe YearMonth.of(2027, 11)
        c.expectedInterest shouldBe zero
    }

    "나누어떨어지지 않으면 원 단위 올림 — 덜 넣으면 못 닿는다" {
        val c = SavingsMath.byDeadline(krw(1_000_000), zero, LocalDate.of(2027, 2, 1), null, today)
        c.months shouldBe 3
        c.monthly shouldBe krw(333_334)
    }

    "이자 포함이면 월 적립이 줄고, 세후 이자는 단리 공식과 같다" {
        val rate = InterestPlan(BigDecimal("3.0"))
        val c = SavingsMath.byDeadline(krw(12_000_000), zero, LocalDate.of(2027, 11, 3), rate, today)
        // 성장 계수 = 12 + 0.03 × 0.846 × 12 × 13 / 24 = 12.16497
        c.monthly shouldBe krw(986_439)
        (c.monthly!! < krw(1_000_000)) shouldBe true
        c.expectedInterest.toDecimal().setScale(0, java.math.RoundingMode.FLOOR) shouldBe BigDecimal("162732")
    }

    "기한이 이번 달이거나 지났으면 계산하지 않는다" {
        SavingsMath.byDeadline(krw(1_000_000), zero, LocalDate.of(2026, 11, 30), null, today).state shouldBe CalculationState.DEADLINE_TOO_CLOSE
        SavingsMath.byDeadline(krw(1_000_000), zero, LocalDate.of(2025, 1, 1), null, today).state shouldBe CalculationState.DEADLINE_TOO_CLOSE
    }

    "이미 모였으면 reached · 남은 돈 0" {
        val c = SavingsMath.byDeadline(krw(1_000_000), krw(1_200_000), LocalDate.of(2027, 1, 1), null, today)
        c.state shouldBe CalculationState.REACHED
        c.remaining shouldBe zero
    }

    "월 적립 → 도달 월: 1000만 원을 월 30만 원이면 34달" {
        val c = SavingsMath.byMonthly(krw(10_000_000), zero, krw(300_000), null, today)
        c.months shouldBe 34
        c.reachMonth shouldBe YearMonth.of(2029, 9)
    }

    "월 적립 → 도달 월은 이자가 있으면 빨라진다" {
        val plain = SavingsMath.byMonthly(krw(30_000_000), zero, krw(300_000), null, today).months!!
        val withRate = SavingsMath.byMonthly(krw(30_000_000), zero, krw(300_000), InterestPlan(BigDecimal("4")), today).months!!
        (withRate < plain) shouldBe true
    }

    "100년 안에 못 닿으면 not_reachable" {
        SavingsMath.byMonthly(krw(10_000_000_000), zero, krw(1_000), null, today).state shouldBe CalculationState.NOT_REACHABLE
    }

    "목표 만들기 규칙 — 금액 0 · 이름 빈칸 · 계획 없음 · 이번 달 기한은 거부" {
        val now = Instant.parse("2026-11-03T00:00:00Z")
        shouldThrow<InvalidGoal> { Goal.create("u", "여행", GoalTemplate.TRAVEL, zero, LocalDate.of(2027, 5, 1), null, null, today, now) }.code shouldBe "GOAL_AMOUNT_INVALID"
        shouldThrow<InvalidGoal> { Goal.create("u", "  ", GoalTemplate.TRAVEL, krw(1), LocalDate.of(2027, 5, 1), null, null, today, now) }.code shouldBe "GOAL_TITLE_INVALID"
        shouldThrow<InvalidGoal> { Goal.create("u", "여행", GoalTemplate.TRAVEL, krw(1), null, null, null, today, now) }.code shouldBe "GOAL_PLAN_REQUIRED"
        shouldThrow<InvalidGoal> { Goal.create("u", "여행", GoalTemplate.TRAVEL, krw(1), LocalDate.of(2026, 11, 28), null, null, today, now) }.code shouldBe "GOAL_DEADLINE_TOO_CLOSE"
        Goal.create("u", "여행", GoalTemplate.TRAVEL, krw(1_200_000), LocalDate.of(2027, 11, 1), null, null, today, now).monthlyPlan shouldBe krw(100_000)
    }

    "옛 분류 → 템플릿: 창업 · 창작은 기타" {
        GoalTemplate.fromLegacyCategory("startup") shouldBe GoalTemplate.OTHER
        GoalTemplate.fromLegacyCategory("creative") shouldBe GoalTemplate.OTHER
        GoalTemplate.fromLegacyCategory("first_car") shouldBe GoalTemplate.FIRST_CAR
    }
})

class ProjectionSpec : StringSpec({
    val today = LocalDate.of(2026, 11, 3)
    val now = Instant.parse("2026-11-03T00:00:00Z")
    val krw = { v: Long -> Money.krw(v) }
    val goal = Goal.create("u", "결혼", GoalTemplate.WEDDING, krw(30_000_000), null, krw(1_000_000), null, today, now)

    "다 찬 달이 3개월 미만이면 plan_only + history_short, 한 점 날짜는 계획 월 하나뿐" {
        val p = ProjectionEngine.project(goal, krw(0), listOf(MonthlyDeposit(YearMonth.of(2026, 9), krw(1_000_000)), MonthlyDeposit(YearMonth.of(2026, 11), krw(500_000))), today)
        p.method shouldBe ProjectionMethod.PLAN_ONLY
        p.reason shouldBe ProjectionReason.HISTORY_SHORT
        p.monthsOfHistory shouldBe 2
        p.early shouldBe null
        p.plan shouldBe YearMonth.of(2029, 5)
    }

    "3개월 이상이면 10 · 90% 분위 구간 — 빈 달은 0 으로 센다" {
        val history = listOf(
            MonthlyDeposit(YearMonth.of(2026, 6), krw(1_000_000)),
            MonthlyDeposit(YearMonth.of(2026, 7), krw(1_200_000)),
            MonthlyDeposit(YearMonth.of(2026, 9), krw(800_000)),
            MonthlyDeposit(YearMonth.of(2026, 10), krw(1_000_000)),
            // 이번 달은 표본 밖
            MonthlyDeposit(YearMonth.of(2026, 11), krw(5_000_000)),
        )
        val p = ProjectionEngine.project(goal, krw(4_000_000), history, today)
        p.method shouldBe ProjectionMethod.EMPIRICAL_QUANTILE
        p.monthsOfHistory shouldBe 5
        // 표본 [0, 0.8M, 1M, 1M, 1.2M] → p10 = 0.32M · p90 = 1.12M
        p.early shouldBe YearMonth.of(2028, 11)
        p.late shouldNotBe null
        (p.early!! < p.late!!) shouldBe true
        p.reason shouldBe null
    }

    "하위 10% 가 0 이면 늦은 쪽은 열림(slow_side_open)" {
        val history = (5..10).map { MonthlyDeposit(YearMonth.of(2026, it), if (it < 8) krw(0) else krw(1_000_000)) }.filter { !it.amount.isZero() } +
            MonthlyDeposit(YearMonth.of(2026, 1), krw(1_000_000))
        val p = ProjectionEngine.project(goal, krw(0), history, today)
        p.late shouldBe null
        p.reason shouldBe ProjectionReason.SLOW_SIDE_OPEN
    }

    "다 모였으면 구간 없이 reached" {
        ProjectionEngine.project(goal, krw(30_000_000), emptyList(), today).reason shouldBe ProjectionReason.REACHED
    }

    "이정표 · 프레임 — 사실만" {
        val m = Milestone.of(goal, krw(400_000), today)
        m.state shouldBe MilestoneState.UNDER_PLAN
        m.difference shouldBe krw(-600_000)
        Frame.of(progressOf(krw(14_999_999), krw(30_000_000))) shouldBe Frame.SAVED
        Frame.of(progressOf(krw(15_000_000), krw(30_000_000))) shouldBe Frame.REMAINING
        progressOf(krw(40_000_000), krw(30_000_000)) shouldBe BigDecimal.ONE
    }
})

class DegradedProjectionSpec : StringSpec({
    val today = LocalDate.of(2026, 11, 3)
    val now = Instant.parse("2026-11-03T00:00:00Z")
    val goal = Goal.create("u", "여행", GoalTemplate.TRAVEL, Money.krw(1_200_000), null, Money.krw(100_000), null, today, now)

    "구간 계산이 실패하면 500 이 아니라 degraded + 계획대로면 X월(BFF-REQ-047 수용 기준 2)" {
        val p = ProjectionEngine.safely(goal, Money.krw(0), today) { error("구간 결함") }
        p.reason shouldBe ProjectionReason.DEGRADED
        p.method shouldBe ProjectionMethod.PLAN_ONLY
        p.plan shouldBe YearMonth.of(2027, 11)
        p.early shouldBe null
    }

    "실패가 없으면 계산 결과 그대로" {
        ProjectionEngine.safely(goal, Money.krw(0), today) { ProjectionEngine.project(goal, Money.krw(0), emptyList(), today) }.reason shouldBe ProjectionReason.HISTORY_SHORT
    }
})
