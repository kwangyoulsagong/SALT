package com.salt.household.domain

import com.salt.kernel.Money
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth

/**
 * 가계부 S1b — 반복 템플릿 · 착지 예정 · 월 마감 · 할부 띠의 경계 표(`SRV-REQ-046` FR-5 · 8 · 9 · 10).
 * 판단 번호는 루트 슬라이스 `MONEY-S1b-household-month-slice.md`.
 */
class RecurringCloseSpec : StringSpec({
    val krw = { v: Long -> Money.krw(v) }
    val now = Instant.parse("2026-11-04T03:00:00Z")
    val today = LocalDate.of(2026, 11, 4)
    val nov = YearMonth.of(2026, 11)

    fun template(day: Int, on: LocalDate = today) =
        RecurringTemplate.create("u", "월세", krw(500_000), Category.HOUSING, PaymentMethod.TRANSFER, day, true, on, now)

    "예정일 — 짧은 달은 말일(31일 → 2월 28일 · 30일 달 30일)" {
        RecurringRules.dueOn(YearMonth.of(2027, 2), 31) shouldBe LocalDate.of(2027, 2, 28)
        RecurringRules.dueOn(YearMonth.of(2028, 2), 30) shouldBe LocalDate.of(2028, 2, 29)
        RecurringRules.dueOn(nov, 31) shouldBe LocalDate.of(2026, 11, 30)
        RecurringRules.dueOn(nov, 1) shouldBe LocalDate.of(2026, 11, 1)
    }

    "시작 달 — 이번 달 예정일이 오늘 이후(오늘 포함)면 이번 달, 지났으면 다음 달(판단 2)" {
        template(4).startsMonth shouldBe nov
        template(25).startsMonth shouldBe nov
        template(3).startsMonth shouldBe YearMonth.of(2026, 12)
        // 말일 예정 — 30일 달의 31일 템플릿을 30일에 만들면 이번 달
        template(31, LocalDate.of(2026, 11, 30)).startsMonth shouldBe nov
    }

    "템플릿 거절 표 — 이름 1~40 · 금액 양수 · 원 단위 · 상한 · 날 1~31" {
        val make = { name: String, amount: Money, day: Int ->
            RecurringTemplate.create("u", name, amount, Category.HOUSING, PaymentMethod.CARD, day, true, today, now)
        }
        shouldThrow<InvalidRecurring> { make("  ", krw(1), 1) }.code shouldBe "TEMPLATE_NAME_INVALID"
        shouldThrow<InvalidRecurring> { make("가".repeat(41), krw(1), 1) }.code shouldBe "TEMPLATE_NAME_INVALID"
        make("가".repeat(40), krw(1), 1).name.length shouldBe 40
        shouldThrow<InvalidRecurring> { make("a", krw(0), 1) }.code shouldBe "TEMPLATE_AMOUNT_INVALID"
        shouldThrow<InvalidRecurring> { make("a", Money.krw("0.5"), 1) }.code shouldBe "TEMPLATE_AMOUNT_INVALID"
        shouldThrow<InvalidRecurring> { make("a", krw(1_000_000_001), 1) }.code shouldBe "TEMPLATE_AMOUNT_TOO_LARGE"
        make("a", krw(1_000_000_000), 1).amount shouldBe krw(1_000_000_000)
        shouldThrow<InvalidRecurring> { make("a", krw(1), 0) }.code shouldBe "TEMPLATE_DAY_INVALID"
        shouldThrow<InvalidRecurring> { make("a", krw(1), 32) }.code shouldBe "TEMPLATE_DAY_INVALID"
    }

    "단계 — 예정 · 예정일 전이면 upcoming · 예정일이 오면 ask · 정한 행은 그대로" {
        val o = template(10).occurrenceFor(nov, now)
        OccurrenceStage.of(o, LocalDate.of(2026, 11, 9)) shouldBe OccurrenceStage.UPCOMING
        OccurrenceStage.of(o, LocalDate.of(2026, 11, 10)) shouldBe OccurrenceStage.ASK
        OccurrenceStage.of(o, LocalDate.of(2026, 11, 30)) shouldBe OccurrenceStage.ASK
        OccurrenceStage.of(o.copy(status = OccurrenceStatus.SKIPPED), today) shouldBe OccurrenceStage.SKIPPED
        OccurrenceStage.of(o.copy(status = OccurrenceStatus.CONFIRMED, expenseId = ExpenseId.new()), today) shouldBe OccurrenceStage.CONFIRMED
    }

    "확인한 지출 날짜 — 예정일, 미리 확인하면 오늘(미래 지출 0)" {
        RecurringRules.spentOnWhenConfirmed(LocalDate.of(2026, 11, 1), today) shouldBe LocalDate.of(2026, 11, 1)
        RecurringRules.spentOnWhenConfirmed(LocalDate.of(2026, 11, 25), today) shouldBe today
    }

    "착지 예정 몫 — 예정 행만(지난 예정일 포함 · 확인 · 건너뜀 0, 판단 4) · 구간 양 끝에 더한다" {
        val o = template(10).occurrenceFor(nov, now)
        RecurringRules.scheduledTotal(listOf(o, o.copy(status = OccurrenceStatus.SKIPPED), o.copy(status = OccurrenceStatus.CONFIRMED))) shouldBe krw(500_000)

        val daily = (1..30).associate { LocalDate.of(2026, 10, 5).plusDays(it.toLong()) to krw(10_000) }
        val first = LocalDate.of(2026, 10, 6)
        val without = LandingEngine.project(nov, today, krw(30_000), daily, first)
        val with = LandingEngine.project(nov, today, krw(30_000), daily, first, krw(500_000))
        with.low shouldBe without.low!! + krw(500_000)
        with.high shouldBe without.high!! + krw(500_000)
        with.scheduled shouldBe krw(500_000)
        // 표본이 짧아도 예정 몫은 기록한다
        LandingEngine.project(nov, today, krw(0), emptyMap(), null, krw(500_000)).scheduled shouldBe krw(500_000)
    }

    "닫을 수 있는 달 — 지난 달 전부 · 이번 달 마지막 3일 · 다음 달 0" {
        MonthCloseRules.closable(YearMonth.of(2026, 10), today) shouldBe true
        MonthCloseRules.closable(YearMonth.of(2025, 1), today) shouldBe true
        MonthCloseRules.closable(nov, LocalDate.of(2026, 11, 27)) shouldBe false
        MonthCloseRules.closable(nov, LocalDate.of(2026, 11, 28)) shouldBe true
        MonthCloseRules.closable(nov, LocalDate.of(2026, 11, 30)) shouldBe true
        MonthCloseRules.closable(YearMonth.of(2026, 12), LocalDate.of(2026, 11, 30)) shouldBe false
        // 2월(28일)은 26일부터
        MonthCloseRules.closable(YearMonth.of(2027, 2), LocalDate.of(2027, 2, 25)) shouldBe false
        MonthCloseRules.closable(YearMonth.of(2027, 2), LocalDate.of(2027, 2, 26)) shouldBe true
    }

    "리뷰 답 — 앞뒤 공백 정리 · 빈 답은 null · 300자 넘으면 거절 · 점수 칸 없음" {
        ReviewAnswers.of("  커피 줄임 ", "", null) shouldBe ReviewAnswers("커피 줄임", null, null)
        ReviewAnswers.of("가".repeat(300), null, null).satisfied!!.length shouldBe 300
        shouldThrow<InvalidMonthClose> { ReviewAnswers.of(null, "가".repeat(301), null) }.code shouldBe "CLOSE_ANSWER_TOO_LONG"
        ReviewAnswers.QUESTION_KEYS shouldBe listOf("satisfied", "try_next", "known_next")
    }

    fun installment(amount: Long, months: Int, on: LocalDate) = Expense.create(
        "u", krw(amount), on, Category.SHOPPING, PaymentMethod.CARD, "가전", Precision.EXACT, InputKind.QUICK, months, null, today, now,
    )

    "할부 — 회차 합 = 원거래(불변식) · 나머지는 첫 달 · 첫 청구는 산 다음 달(판단 8)" {
        listOf(100_000L to 3, 1_000L to 7, 999_999L to 36, 35_000L to 2, 10L to 3).forEach { (amount, n) ->
            val p = InstallmentPlan.of(installment(amount, n, LocalDate.of(2026, 10, 15)))!!
            p.charges().fold(krw(0), Money::plus) shouldBe krw(amount)
            p.charges().size shouldBe n
            p.charges().drop(1).toSet().size shouldBe 1
        }
        val p = InstallmentPlan.of(installment(100_000, 3, LocalDate.of(2026, 10, 15)))!!
        p.charges() shouldBe listOf(krw(33_334), krw(33_333), krw(33_333))
        p.firstMonth shouldBe nov
        p.lastMonth shouldBe YearMonth.of(2027, 1)
        p.indexOf(YearMonth.of(2026, 10)) shouldBe null
        p.indexOf(nov) shouldBe 1
        p.indexOf(YearMonth.of(2027, 1)) shouldBe 3
        p.indexOf(YearMonth.of(2027, 2)) shouldBe null
        p.remainingAfter(nov) shouldBe krw(66_666)
        p.remainingAfter(YearMonth.of(2027, 1)) shouldBe krw(0)
        p.remainingAfter(YearMonth.of(2026, 10)) shouldBe krw(100_000)
        // 연도 넘김 — 12월에 산 12개월
        val dec = InstallmentPlan.of(installment(120_000, 12, LocalDate.of(2025, 12, 31)))!!
        dec.firstMonth shouldBe YearMonth.of(2026, 1)
        dec.indexOf(YearMonth.of(2026, 12)) shouldBe 12
    }

    "할부 띠 — 이 달 청구 줄만 · 청구 큰 순 · 앞으로 6개월 합" {
        val a = InstallmentPlan.of(installment(300_000, 3, LocalDate.of(2026, 10, 1)))!!
        val b = InstallmentPlan.of(installment(60_000, 6, LocalDate.of(2026, 9, 1)))!!
        val ended = InstallmentPlan.of(installment(20_000, 2, LocalDate.of(2026, 7, 1)))!!
        val band = InstallmentMath.band(nov, listOf(b, a, ended))
        band.lines.map { it.plan } shouldBe listOf(a, b)
        band.lines.map { it.index } shouldBe listOf(1, 2)
        band.monthCharge shouldBe krw(110_000)
        band.upcoming.map { it.month } shouldBe (0..5).map { nov.plusMonths(it.toLong()) }
        band.upcoming.map { it.amount } shouldBe listOf(krw(110_000), krw(110_000), krw(110_000), krw(10_000), krw(10_000), krw(0))
    }
})
