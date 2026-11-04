package com.salt.household.domain

import com.salt.kernel.Money
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.util.UUID

/** 봉투 · 하루 가용 · 착지 구간 · 지난달 적중 — 차단 · 경고 0, 같은 입력이면 같은 구간 */
class HouseholdMathSpec : StringSpec({
    val krw = { v: Long -> Money.krw(v) }
    val now = Instant.parse("2026-11-04T03:00:00Z")
    val today = LocalDate.of(2026, 11, 4)

    "50/30/20 — 봉투 둘(needs 50 · wants 30) · 저축 몫 20 은 봉투가 아니다" {
        val b = Budget.fiftyThirtyTwenty("u", krw(3_000_000), now)
        b.envelopes shouldBe mapOf("needs" to krw(1_500_000), "wants" to krw(900_000))
        b.savingsShare shouldBe krw(600_000)
        b.envelopeOf(Category.FOOD) shouldBe "needs"
        b.envelopeOf(Category.CAFE) shouldBe "wants"
    }

    "봉투 방식 — 봉투 없는 분류는 예산 밖 · 모르는 분류 키는 거절" {
        val b = Budget.envelopes("u", mapOf("cafe" to krw(100_000), "food" to krw(400_000)), now)
        b.envelopes.keys.toList() shouldBe listOf("food", "cafe")
        b.envelopeOf(Category.SHOPPING) shouldBe null
        BudgetMath.unbudgeted(b, mapOf(Category.SHOPPING to krw(30_000), Category.FOOD to krw(1))) shouldBe krw(30_000)
        shouldThrow<InvalidBudget> { Budget.envelopes("u", mapOf("nope" to krw(1)), now) }.code shouldBe "BUDGET_CATEGORY_UNKNOWN"
        shouldThrow<InvalidBudget> { Budget.envelopes("u", emptyMap(), now) }.code shouldBe "BUDGET_ENVELOPES_REQUIRED"
    }

    "넘친 봉투는 음수 숫자일 뿐 — 하루 가용은 0, 이번 달이 아니면 null" {
        val b = Budget.envelopes("u", mapOf("cafe" to krw(100_000)), now)
        val e = BudgetMath.envelopes(b, mapOf(Category.CAFE to krw(130_000))).single()
        e.remaining shouldBe krw(-30_000)
        BudgetMath.dailyAvailable(e.remaining, 27) shouldBe krw(0)
        BudgetMath.dailyAvailable(krw(270_000), 27) shouldBe krw(10_000)
        BudgetMath.daysLeftIncludingToday(YearMonth.of(2026, 11), today) shouldBe 27
        BudgetMath.daysLeftIncludingToday(YearMonth.of(2026, 10), today) shouldBe null
    }

    "지출 — 대략은 대략 입력에서만 · 미래 날짜 · 너무 큰 금액 · 할부 범위 거절" {
        val ok = { amount: Money, on: LocalDate, p: Precision, k: InputKind, inst: Int? ->
            Expense.create("u", amount, on, Category.FOOD, PaymentMethod.CARD, " 김밥 ", p, k, inst, null, today, now)
        }
        ok(krw(5_000), today, Precision.EXACT, InputKind.QUICK, null).merchant shouldBe "김밥"
        ok(krw(40_000), today.minusDays(3), Precision.APPROX, InputKind.APPROX, null).precision shouldBe Precision.APPROX
        shouldThrow<InvalidExpense> { ok(krw(5_000), today, Precision.APPROX, InputKind.QUICK, null) }.code shouldBe "EXPENSE_PRECISION_INVALID"
        shouldThrow<InvalidExpense> { ok(krw(5_000), today.plusDays(1), Precision.EXACT, InputKind.QUICK, null) }.code shouldBe "EXPENSE_DATE_FUTURE"
        shouldThrow<InvalidExpense> { ok(krw(1_000_000_001), today, Precision.EXACT, InputKind.QUICK, null) }.code shouldBe "EXPENSE_AMOUNT_TOO_LARGE"
        shouldThrow<InvalidExpense> { ok(krw(5_000), today, Precision.EXACT, InputKind.QUICK, 1) }.code shouldBe "EXPENSE_INSTALLMENT_INVALID"
    }

    "착지 — 기록 14일 미만이면 구간 없음 + history_short" {
        val daily = (1..10).associate { today.minusDays(it.toLong()) to krw(10_000) }
        val l = LandingEngine.project(YearMonth.from(today), today, krw(40_000), daily, today.minusDays(10))
        l.low shouldBe null
        l.high shouldBe null
        l.reason shouldBe LandingReason.HISTORY_SHORT
        l.daysOfHistory shouldBe 10
    }

    "착지 — 매일 같은 금액이면 구간 = 지금까지 + 일평균 × 남은 날(폭 0)" {
        val daily = (1..60).associate { today.minusDays(it.toLong()) to krw(10_000) }
        val l = LandingEngine.project(YearMonth.from(today), today, krw(40_000), daily, today.minusDays(60))
        // 11월 4일 → 남은 날 26
        l.low shouldBe krw(40_000 + 260_000)
        l.high shouldBe krw(40_000 + 260_000)
        l.method shouldBe LandingMethod.EMPIRICAL_WINDOW
    }

    "착지 — 들쭉날쭉하면 low < high · 같은 입력이면 같은 구간(재현)" {
        val daily = (1..60).associate { today.minusDays(it.toLong()) to krw(if (it % 7 == 0) 120_000 else 8_000) }
        val a = LandingEngine.project(YearMonth.from(today), today, krw(40_000), daily, today.minusDays(60))
        val b = LandingEngine.project(YearMonth.from(today), today, krw(40_000), daily, today.minusDays(60))
        (a.low!! < a.high!!) shouldBe true
        a shouldBe b
        (a.low >= krw(40_000)) shouldBe true
    }

    "착지 — 말일이면 지금까지가 곧 착지(month_over)" {
        val last = LocalDate.of(2026, 11, 30)
        val l = LandingEngine.project(YearMonth.from(last), last, krw(900_000), emptyMap(), null)
        l.method shouldBe LandingMethod.MONTH_OVER
        l.low shouldBe krw(900_000)
        l.high shouldBe krw(900_000)
    }

    "분위 — 선형 보간" {
        val sorted = (0..10).map { BigDecimal(it * 10) }
        LandingEngine.quantile(sorted, BigDecimal("0.10")).compareTo(BigDecimal(10)) shouldBe 0
        LandingEngine.quantile(sorted, BigDecimal("0.95")).compareTo(BigDecimal(95)) shouldBe 0
    }

    "지난달 적중 — 구간 안이면 hit · 밖이면 miss · 발행 없으면 not_issued · 31일 → 지난달 말일" {
        val lastMonth = YearMonth.of(2026, 10)
        val issued = { low: Long?, high: Long?, reason: String? ->
            IssuedLanding(
                UUID.randomUUID(), "u", LocalDate.of(2026, 10, 4), now,
                Landing(lastMonth, LandingMethod.EMPIRICAL_WINDOW, krw(50_000), low?.let(krw), high?.let(krw), reason, 30),
            )
        }
        LandingEngine.track(lastMonth, today, issued(800_000, 1_000_000, null), krw(950_000)).hit shouldBe true
        LandingEngine.track(lastMonth, today, issued(800_000, 1_000_000, null), krw(1_000_001)).hit shouldBe false
        LandingEngine.track(lastMonth, today, null, krw(1)).let {
            it.hit shouldBe null
            it.reason shouldBe LandingReason.NOT_ISSUED
        }
        LandingEngine.track(lastMonth, today, issued(null, null, LandingReason.HISTORY_SHORT), krw(1)).reason shouldBe LandingReason.HISTORY_SHORT
        LandingEngine.sameDayLastMonth(LocalDate.of(2026, 12, 31)) shouldBe LocalDate.of(2026, 11, 30)
    }
})
