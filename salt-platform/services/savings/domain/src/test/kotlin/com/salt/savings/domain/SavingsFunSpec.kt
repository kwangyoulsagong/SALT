package com.salt.savings.domain

import com.salt.kernel.Money
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth

/**
 * S1b 계산 경계(`SRV-REQ-045` FR-7 · 11 · 12 · 16 · 17 · 18) — 장면 단계 · 도장 · 엽서 · 실물 환산 · 놓친 달 · 비상시 · 저울.
 * 기대값은 손계산이 아니라 계산기(python Decimal)로 뽑았다 — 대출 상환액 86,066.4297… → 올림 86,067 · 이자 합 32,797.156… → 32,797 · 마지막 달 1,032,797 − 86,067 × 11 = 86,060
 */
class SavingsFunSpec : StringSpec({
    val today = LocalDate.of(2026, 11, 3)
    val krw = { v: Long -> Money.krw(v) }
    val created = Instant.parse("2026-06-15T00:00:00Z")

    fun goal(target: Long, plan: Long?, template: GoalTemplate = GoalTemplate.OTHER, status: GoalStatus = GoalStatus.ACTIVE) =
        Goal(GoalId.new(), "u", "목표", template, krw(target), null, plan?.let(krw), null, status, created, null)

    fun month(y: Int, m: Int, amount: Long) = MonthlyDeposit(YearMonth.of(y, m), krw(amount))

    "장면 — 10% 마다 한 칸, 내림이라 99.9% 는 9칸 · 다 차야 10칸 · 템플릿이 그림을 정한다" {
        Scene.of(GoalTemplate.TRAVEL, BigDecimal.ZERO) shouldBe Scene(SceneKind.TRIP, 0)
        Scene.of(GoalTemplate.FIRST_CAR, BigDecimal("0.999")) shouldBe Scene(SceneKind.CAR, 9)
        Scene.of(GoalTemplate.EMERGENCY, BigDecimal.ONE) shouldBe Scene(SceneKind.UMBRELLA, 10)
        Scene.of(GoalTemplate.HOUSING, BigDecimal("0.35")).kind shouldBe SceneKind.HOUSE
        Scene.of(GoalTemplate.WEDDING, BigDecimal("0.35")) shouldBe Scene(SceneKind.JAR, 3)
    }

    "도장 — 목표를 만들면 첫 도장 하나, 적립마다 하나" {
        stampCount(0) shouldBe 1
        stampCount(4) shouldBe 5
    }

    "엽서 — 걸린 일수는 시작일과 다 찬 날의 차이(KST 날짜)" {
        val p = Postcard.of(LocalDate.of(2026, 6, 15), today, 7)
        p.daysTaken shouldBe 141
        p.depositActions shouldBe 7
    }

    "실물 환산 — 내림, 다 모으지 못한 한 개는 세지 않는다 · 이름 · 단가 검증" {
        val unit = ItemUnit.create(goal(3_000_000, 100_000), " 제주 왕복 ", krw(120_000), created)
        unit.name shouldBe "제주 왕복"
        unit.countFor(krw(250_000)) shouldBe 2
        unit.countFor(krw(119_999)) shouldBe 0
        shouldThrow<InvalidGoal> { ItemUnit.create(goal(1, 1), " ", krw(1), created) }.code shouldBe "UNIT_NAME_INVALID"
        shouldThrow<InvalidGoal> { ItemUnit.create(goal(1, 1), "x", krw(0), created) }.code shouldBe "UNIT_PRICE_INVALID"
    }

    "놓친 달 — 만든 달부터 지난달까지 빈 달을 세고, 그 달마다 계획만큼 넣었다면 몇 달 빨랐을지" {
        // 6 · 8 · 10월에 넣고 7 · 9월을 건너뜀. 11월(이번 달)은 아직 안 끝나 보지 않는다
        val history = listOf(month(2026, 6, 100_000), month(2026, 8, 100_000), month(2026, 10, 100_000))
        val m = MissedMonths.of(goal(3_000_000, 100_000), krw(300_000), history, YearMonth.of(2026, 6), today, null)
        m.observedMonths shouldBe 5
        m.skippedMonths shouldBe 2
        // 남은 270만 ÷ 10만 = 27달 · 두 달을 채웠다면 250만 = 25달 → 2달
        m.shiftMonths shouldBe 2
        m.reason shouldBe null
    }

    "놓친 달 — 만든 달은 넣었을 때만 센다(31일에 만들고 다음 달에 넣은 목표는 건너뛴 달 0)" {
        val history = listOf(month(2026, 11, 100_000))
        val m = MissedMonths.of(goal(3_000_000, 100_000), krw(100_000), history, YearMonth.of(2026, 10), LocalDate.of(2026, 12, 3), null)
        m.observedMonths shouldBe 1
        m.skippedMonths shouldBe 0
    }

    "기한 — 바꾼 계획대로면 기한 안에 닿나(기한 없는 목표는 null)" {
        val deadline = Goal(GoalId.new(), "u", "목표", GoalTemplate.OTHER, krw(1_200_000), LocalDate.of(2027, 11, 1), krw(100_000), null, GoalStatus.ACTIVE, created, null)
        Simulation.row(deadline, krw(100_000), krw(0), emptyList(), today).afterMeetsDeadline shouldBe true
        Simulation.row(deadline, krw(50_000), krw(0), emptyList(), today).afterMeetsDeadline shouldBe false
        Simulation.row(goal(1_200_000, 100_000), krw(50_000), krw(0), emptyList(), today).afterMeetsDeadline shouldBe null
    }

    "놓친 달 — 계획이 없으면 이동을 말하지 않고, 다 찬 목표는 다 찬 달 전까지만 센다" {
        val noPlan = MissedMonths.of(
            Goal(GoalId.new(), "u", "목표", GoalTemplate.OTHER, krw(3_000_000), LocalDate.of(2099, 1, 1), null, null, GoalStatus.ACTIVE, created, null),
            krw(0), emptyList(), YearMonth.of(2026, 6), today, null,
        )
        // 6월에 만들고 한 번도 안 넣음 — 만든 달(6월)은 빼고 7 ~ 10월 넷
        noPlan.skippedMonths shouldBe 4
        noPlan.shiftMonths shouldBe null
        noPlan.reason shouldBe ProjectionReason.NO_PLAN

        val done = MissedMonths.of(goal(300_000, 100_000, status = GoalStatus.COMPLETED), krw(300_000), listOf(month(2026, 6, 300_000)), YearMonth.of(2026, 6), today, YearMonth.of(2026, 8))
        done.observedMonths shouldBe 2
        done.skippedMonths shouldBe 1
        done.reason shouldBe ProjectionReason.REACHED
    }

    "비상시 — 꺼내면 계획 도달이 밀린 달 수, 빌리면 원리금 균등 상환액 · 이자 합" {
        val c = EmergencyComparison.of(goal(3_000_000, 100_000), krw(300_000), krw(200_000), BigDecimal("6"), 12, today)
        c.withdraw.planMonthBefore shouldBe YearMonth.of(2029, 2)
        c.withdraw.planMonthAfter shouldBe YearMonth.of(2029, 4)
        c.withdraw.delayMonths shouldBe 2

        val loan = EmergencyComparison.of(goal(3_000_000, 100_000), krw(1_000_000), krw(1_000_000), BigDecimal("6"), 12, today).loan
        // 상환액은 원 단위 올림 · 이자는 정확한 값 · 마지막 달이 차액을 맞춘다 — 매달 × 11 + 마지막 = 원금 + 이자
        loan.monthlyPayment shouldBe krw(86_067)
        loan.totalInterest shouldBe krw(32_797)
        loan.lastPayment shouldBe krw(86_060)
        (loan.monthlyPayment.scale(BigDecimal(11)) + loan.lastPayment) shouldBe krw(1_000_000) + loan.totalInterest
    }

    "비상시 — 금리 0 이면 원금 ÷ 달 수 · 모은 돈보다 많이 꺼낼 수 없다 · 계획이 없으면 꺼내기 이동을 말하지 않는다" {
        val zeroRate = EmergencyComparison.of(goal(3_000_000, 100_000), krw(600_000), krw(600_000), BigDecimal.ZERO, 6, today).loan
        zeroRate.monthlyPayment shouldBe krw(100_000)
        zeroRate.totalInterest.isZero() shouldBe true
        // 나누어떨어지지 않아도 금리 0 이면 이자 0 — 올림 차액은 마지막 달이 덜 낸다(셸 경유 실측: "이자 8원" 결함)
        val uneven = EmergencyComparison.of(goal(3_000_000, 100_000), krw(100_000), krw(100_000), BigDecimal.ZERO, 12, today).loan
        uneven.monthlyPayment shouldBe krw(8_334)
        uneven.lastPayment shouldBe krw(8_326)
        uneven.totalInterest.isZero() shouldBe true
        shouldThrow<InvalidGoal> {
            EmergencyComparison.of(goal(3_000_000, 100_000), krw(100_000), krw(1), BigDecimal.ZERO, 120, today)
        }.code shouldBe "EMERGENCY_AMOUNT_TOO_SMALL"
        shouldThrow<InvalidGoal> {
            EmergencyComparison.of(goal(3_000_000, 100_000), krw(100_000), krw(100_001), BigDecimal("5"), 12, today)
        }.code shouldBe "EMERGENCY_AMOUNT_OVER_SAVED"
        shouldThrow<InvalidGoal> {
            EmergencyComparison.of(goal(3_000_000, 100_000), krw(100_000), krw(1_000), BigDecimal("5"), 121, today)
        }.code shouldBe "EMERGENCY_MONTHS_INVALID"
        val noPlan = Goal(GoalId.new(), "u", "목표", GoalTemplate.OTHER, krw(3_000_000), LocalDate.of(2099, 1, 1), null, null, GoalStatus.ACTIVE, created, null)
        EmergencyComparison.of(noPlan, krw(500_000), krw(100_000), BigDecimal("5"), 12, today).withdraw.reason shouldBe ProjectionReason.NO_PLAN
    }

    "저울 — 계획을 올리면 계획 도달 월과 경험 구간이 같이 당겨진다(표본마다 Δ) · 안 바꾼 목표는 그대로" {
        val g = goal(2_000_000, 100_000)
        val history = (7..10).map { month(2026, it, 100_000) }
        val same = Simulation.row(g, null, krw(400_000), history, today)
        same.before shouldBe same.after
        same.before.plan shouldBe YearMonth.of(2028, 3)

        val up = Simulation.row(g, krw(200_000), krw(400_000), history, today)
        up.before.early shouldBe YearMonth.of(2028, 3)
        up.after.plan shouldBe YearMonth.of(2027, 7)
        up.after.early shouldBe YearMonth.of(2027, 7)
        up.after.late shouldBe YearMonth.of(2027, 7)
        up.monthlyAfter shouldBe krw(200_000)
    }

    "저울 — 계획을 내려 표본이 0 아래로 가면 0 으로, 늦은 쪽이 열린다" {
        val g = goal(2_000_000, 100_000)
        // 표본 [5만, 5만, 10만, 10만] − 6만 → [0, 0, 4만, 4만] — 10% 분위가 0
        val history = listOf(month(2026, 7, 50_000), month(2026, 8, 50_000), month(2026, 9, 100_000), month(2026, 10, 100_000))
        val down = Simulation.row(g, krw(40_000), krw(300_000), history, today)
        down.after.late shouldBe null
        down.after.reason shouldBe ProjectionReason.SLOW_SIDE_OPEN
    }
})
