package com.salt.household.domain

import com.salt.kernel.Money
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.shouldBe
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth

/**
 * 가계부 S1e — 고정비 후보 · 증가 · 평소보다 큰 지출의 경계 표(`SRV-REQ-046` FR-12).
 * 판단 번호는 루트 슬라이스 `MONEY-S1e-household-fixed-cost-slice.md`.
 */
class FixedCostSpec : StringSpec({
    val krw = { v: Long -> Money.krw(v) }
    val today = LocalDate.of(2026, 11, 4)
    var seq = 0L

    fun charge(merchant: String, amount: Long, on: LocalDate, category: Category = Category.TELECOM) = MerchantCharge(
        ExpenseId.new(), merchant, category, PaymentMethod.CARD, krw(amount), on, Instant.parse("2026-01-01T00:00:00Z").plusSeconds(seq++),
    )

    /** 오늘에서 거꾸로 [gaps] 간격으로 같은 금액 — 마지막 회차가 [lastOn] */
    fun series(merchant: String, amounts: List<Long>, gaps: List<Long>, lastOn: LocalDate = today.minusDays(2)): List<MerchantCharge> {
        val days = gaps.runningFold(0L) { acc, g -> acc + g }.reversed()
        return amounts.zip(days).map { (a, back) -> charge(merchant, a, lastOn.minusDays(back)) }
    }

    "후보 — 세 번 · 간격 25~35일 · 이웃 금액 30% 안이면 후보, 하나라도 넘으면 아니다(판단 1)" {
        val cases = listOf(
            Triple(listOf(55_000L, 55_000L, 55_000L), listOf(30L, 31L), true),
            Triple(listOf(55_000L, 55_000L, 55_000L), listOf(25L, 35L), true),
            Triple(listOf(55_000L, 55_000L), listOf(30L), false), // 두 번은 우연
            Triple(listOf(55_000L, 55_000L, 55_000L), listOf(24L, 30L), false),
            Triple(listOf(55_000L, 55_000L, 55_000L), listOf(30L, 36L), false),
            Triple(listOf(10_000L, 13_000L, 13_000L), listOf(30L, 30L), true), // 정확히 30% — 요금 인상은 든다
            Triple(listOf(10_000L, 13_001L, 13_001L), listOf(30L, 30L), false),
        )
        cases.forEach { (amounts, gaps, expected) ->
            val found = FixedCostRules.detect(series("통신사", amounts, gaps), today, emptySet())
            (found.size == 1) shouldBe expected
        }
    }

    "후보 — 마지막 회차가 40일 넘게 지났으면 끝난 것(해지)" {
        FixedCostRules.detect(series("헬스장", listOf(60_000, 60_000, 60_000), listOf(30, 30), today.minusDays(40)), today, emptySet()).size shouldBe 1
        FixedCostRules.detect(series("헬스장", listOf(60_000, 60_000, 60_000), listOf(30, 30), today.minusDays(41)), today, emptySet()).shouldBeEmpty()
    }

    "매주 가는 카페는 한 달 간격 사슬을 만들지 않는다 — 앞 고리 = 비슷한 금액의 바로 앞 지출" {
        val weekly = (0L..16L).map { w -> charge("동네카페", 4_500 + (w % 3) * 500, today.minusDays(1 + w * 7), Category.CAFE) }
        FixedCostRules.detect(weekly, today, emptySet()).shouldBeEmpty()
    }

    "구독 가게에서 산 물건(금액이 먼)은 건너뛰고 구독 사슬을 찾는다 — 마지막 지출이 물건이어도" {
        val sub = series("쿠팡", listOf(7_890, 7_890, 7_890), listOf(30, 30), today.minusDays(10))
        val orders = listOf(charge("쿠팡", 35_000, today.minusDays(3)), charge("쿠팡", 52_000, today.minusDays(25)))
        val c = FixedCostRules.detect(sub + orders, today, emptySet()).single()
        c.lastAmount shouldBe krw(7_890)
        c.count shouldBe 3
        c.lastOn shouldBe today.minusDays(10)
    }

    "가맹점 키 — 공백 · 대소문자가 달라도 같은 곳, 숨긴 키 · 템플릿 키는 빠진다" {
        FixedCostRules.key(" Netflix 코리아 ") shouldBe "netflix코리아"
        val mixed = listOf(
            charge("Netflix", 17_000, today.minusDays(62)),
            charge("netflix ", 17_000, today.minusDays(32)),
            charge("NET FLIX", 17_000, today.minusDays(2)),
        )
        FixedCostRules.detect(mixed, today, emptySet()).single().key shouldBe "netflix"
        FixedCostRules.detect(mixed, today, setOf("netflix")).shouldBeEmpty()
    }

    "다음 예정일 = 마지막 회차의 다음 달 같은 날(짧은 달이면 말일) · 결제일 = 그날" {
        val c = FixedCostRules.detect(series("월세", listOf(500_000, 500_000, 500_000), listOf(31, 30), LocalDate.of(2026, 10, 31)), today, emptySet()).single()
        c.nextOn shouldBe LocalDate.of(2026, 11, 30)
        c.dayOfMonth shouldBe 31
    }

    "증가 — 앞 회차보다 5% 이상일 때만, 내리거나 몇십 원이면 null" {
        val cases = listOf(
            Triple(20_000L, 21_000L, 1_000L),
            Triple(20_000L, 20_999L, null),
            Triple(20_000L, 19_000L, null),
            Triple(13_500L, 17_000L, 3_500L),
        )
        cases.forEach { (prev, last, expected) ->
            val c = FixedCostRules.detect(series("통신사", listOf(prev, prev, last), listOf(30, 30)), today, emptySet()).single()
            c.previousAmount shouldBe krw(prev)
            c.increase shouldBe expected?.let(krw)
        }
    }

    "평소보다 큰 지출 — 분류 중앙값의 3배 이상 · 표본 5개 이상 · 정확한 직접 입력만 · 고정비 가맹점 제외(판단 4)" {
        val now = Instant.parse("2026-11-04T03:00:00Z")
        fun expense(amount: Long, merchant: String? = null, precision: Precision = Precision.EXACT, kind: InputKind = InputKind.QUICK) =
            Expense(ExpenseId.new(), "u", krw(amount), today, Category.FOOD, PaymentMethod.CARD, merchant, precision, kind, null, null, now)
        val base = mapOf(Category.FOOD to CategoryBaseline(krw(10_000), 5))
        UnusualRules.typicalIfUnusual(expense(30_000), base, emptySet()) shouldBe krw(10_000)
        UnusualRules.typicalIfUnusual(expense(29_999), base, emptySet()) shouldBe null
        UnusualRules.typicalIfUnusual(expense(30_000), mapOf(Category.FOOD to CategoryBaseline(krw(10_000), 4)), emptySet()) shouldBe null
        UnusualRules.typicalIfUnusual(expense(30_000), emptyMap(), emptySet()) shouldBe null
        UnusualRules.typicalIfUnusual(expense(30_000, precision = Precision.APPROX, kind = InputKind.APPROX), base, emptySet()) shouldBe null
        UnusualRules.typicalIfUnusual(expense(30_000, kind = InputKind.TEMPLATE), base, emptySet()) shouldBe null
        UnusualRules.typicalIfUnusual(expense(30_000, merchant = "Rent Co"), base, setOf("rentco")) shouldBe null
    }

    "기준 창은 그달 앞 90일 — 그달 지출은 기준에 들지 않는다" {
        UnusualRules.window(YearMonth.of(2026, 11)) shouldBe (LocalDate.of(2026, 8, 3) to LocalDate.of(2026, 10, 31))
    }
})
