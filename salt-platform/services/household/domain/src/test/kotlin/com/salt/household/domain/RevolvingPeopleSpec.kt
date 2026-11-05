package com.salt.household.domain

import com.salt.kernel.Money
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.Year
import java.time.YearMonth

/**
 * 가계부 S1h — 리볼빙 띠 · 사람 장부. 불변식:
 * 1. 리볼빙: 원금 몫 합 + 마지막 잔액 = 처음 이월 잔액 · 잔액은 늘지 않는다 · 추정은 6개월을 넘지 않는다
 * 2. 리볼빙: 입력 경계는 규정 그대로(결제비율 10~100 · 수수료율 0 초과 20 이하) — 경계 표
 * 3. 사람 장부: 이름 · 금액 · 날 경계 — 경계 표. 해 봉투 남은 금액은 음수가 될 수 있다(막지 않는다)
 */
class RevolvingPeopleSpec : StringSpec({
    val today = LocalDate.parse("2026-11-05")
    val now = Instant.parse("2026-11-05T00:00:00Z")
    val krw = { v: Long -> Money.krw(v) }

    fun plan(balance: Long = 1_000_000, ratio: Int = 10, rate: String = "18", month: String = "2026-10") =
        RevolvingPlan.create("u", null, krw(balance), ratio, BigDecimal(rate), YearMonth.parse(month), today, now)

    "리볼빙 입력 경계 — 결제비율 · 수수료율 · 잔액 · 명세서 달 · 이름" {
        val ok = listOf<() -> RevolvingPlan>(
            { plan(ratio = 10) }, { plan(ratio = 100) }, { plan(rate = "0.01") }, { plan(rate = "20") }, { plan(rate = "19.99") },
            { plan(balance = 1) }, { plan(balance = 100_000_000) }, { plan(month = "2026-11") }, { plan(month = "2026-05") },
        )
        ok.forEach { it() }
        val rejected = listOf<Pair<String, () -> RevolvingPlan>>(
            "REVOLVING_RATIO_INVALID" to { plan(ratio = 9) },
            "REVOLVING_RATIO_INVALID" to { plan(ratio = 101) },
            "REVOLVING_RATE_INVALID" to { plan(rate = "0") },
            "REVOLVING_RATE_INVALID" to { plan(rate = "20.01") },
            "REVOLVING_RATE_INVALID" to { plan(rate = "16.555") },
            "REVOLVING_BALANCE_INVALID" to { plan(balance = 0) },
            "REVOLVING_BALANCE_TOO_LARGE" to { plan(balance = 100_000_001) },
            "REVOLVING_MONTH_FUTURE" to { plan(month = "2026-12") },
            "REVOLVING_MONTH_TOO_OLD" to { plan(month = "2026-04") },
            "REVOLVING_LABEL_TOO_LONG" to { RevolvingPlan.create("u", "가".repeat(21), krw(1000), 10, BigDecimal("10"), YearMonth.parse("2026-10"), today, now) },
        )
        rejected.forEach { (code, make) -> shouldThrow<InvalidRevolving> { make() }.code shouldBe code }
        // 소수 원 잔액도 거절
        shouldThrow<InvalidRevolving> { RevolvingPlan.create("u", null, Money.krw("1000.5"), 10, BigDecimal("10"), YearMonth.parse("2026-10"), today, now) }
            .code shouldBe "REVOLVING_BALANCE_INVALID"
        // 이름은 공백을 맞추고 비우면 null
        RevolvingPlan.create("u", "  생활비   카드 ", krw(1000), 10, BigDecimal("10"), YearMonth.parse("2026-10"), today, now).label shouldBe "생활비 카드"
        RevolvingPlan.create("u", "   ", krw(1000), 10, BigDecimal("10"), YearMonth.parse("2026-10"), today, now).label shouldBe null
    }

    "리볼빙 추정 — 청구 = 이월 잔액 × 비율 + 잔액 × 연율 × 그 달 일수 ÷ 365, 원 미만 버림" {
        val p = RevolvingMath.project(plan())
        p.charges.size shouldBe 6
        // 10월(31일)에 넘어가 있던 100만 원 → 11월 청구
        p.charges[0] shouldBe RevolvingCharge(YearMonth.parse("2026-11"), krw(100_000), krw(15_287), krw(900_000))
        // 11월(30일) 90만 원 → 12월
        p.charges[1] shouldBe RevolvingCharge(YearMonth.parse("2026-12"), krw(90_000), krw(13_315), krw(810_000))
        p.charges.last().month shouldBe YearMonth.parse("2027-04")
        p.plan.horizonEnd shouldBe YearMonth.parse("2027-04")
    }

    "리볼빙 불변식 — 원금 합 + 남는 잔액 = 처음 잔액 · 잔액은 늘지 않는다(비율 · 잔액 표)" {
        listOf(10 to 1L, 10 to 9L, 10 to 1_000_000L, 33 to 777_777L, 50 to 12_345L, 100 to 5_000_000L).forEach { (ratio, balance) ->
            val p = RevolvingMath.project(plan(balance = balance, ratio = ratio))
            p.charges.fold(krw(0)) { acc, c -> acc + c.principal } + p.balanceAtEnd shouldBe krw(balance)
            p.charges.zipWithNext().all { (a, b) -> b.balanceAfter <= a.balanceAfter } shouldBe true
            (p.charges.size <= RevolvingMath.HORIZON_MONTHS) shouldBe true
        }
        // 100% 면 첫 달에 끝 · 몇 원 남은 잔액도 끝없이 남지 않는다
        RevolvingMath.project(plan(ratio = 100)).charges.size shouldBe 1
        RevolvingMath.project(plan(balance = 5, ratio = 10)).balanceAtEnd shouldBe krw(0)
    }

    "리볼빙 수수료 — 윤년은 366일로 나눈다" {
        val leap = RevolvingPlan(RevolvingId(java.util.UUID.randomUUID()), "u", null, krw(1_000_000), 10, BigDecimal("18.00"), YearMonth.parse("2028-01"), null, now)
        // 2028-01(31일) · 윤년: 1,000,000 × 0.18 × 31 ÷ 366 = 15245.9 → 15245
        RevolvingMath.project(leap).charges[0].fee shouldBe krw(15_245)
    }

    "리볼빙 띠 — 명세서 달은 청구 없음 · 7개월째는 stale · 끝낸 달부터 빠진다" {
        val p = plan(month = "2026-10")
        RevolvingMath.band(YearMonth.parse("2026-10"), listOf(p)).lines.size shouldBe 0
        RevolvingMath.band(YearMonth.parse("2026-11"), listOf(p)).monthCharge shouldBe krw(115_287)
        RevolvingMath.band(YearMonth.parse("2027-04"), listOf(p)).lines.size shouldBe 1
        RevolvingMath.band(YearMonth.parse("2027-05"), listOf(p)).let { it.lines.size shouldBe 0; it.stale.size shouldBe 1 }
        val ended = p.copy(endedOn = LocalDate.parse("2026-12-03"))
        RevolvingMath.band(YearMonth.parse("2026-11"), listOf(ended)).lines.size shouldBe 1
        RevolvingMath.band(YearMonth.parse("2026-12"), listOf(ended)).lines.size shouldBe 0
        // 앞으로 6개월 — 이 달부터, 추정 기간 밖은 0
        RevolvingMath.band(YearMonth.parse("2027-03"), listOf(p)).upcoming.map { it.amount.isZero() } shouldBe listOf(false, false, true, true, true, true)
    }

    "사람 장부 경계 — 이름 · 금액 · 날 · 메모" {
        fun entry(person: String = "김민수", amount: Long = 100_000, on: String = "2026-11-05", memo: String? = null) =
            PersonEntry.create("u", person, GiftDirection.GAVE, krw(amount), Occasion.WEDDING, LocalDate.parse(on), memo, today, now)
        listOf({ entry() }, { entry(person = "가".repeat(20)) }, { entry(amount = 1) }, { entry(amount = 100_000_000) }, { entry(on = "2000-01-01") }, { entry(memo = "가".repeat(100)) })
            .forEach { it() }
        val rejected = listOf<Pair<String, () -> PersonEntry>>(
            "PERSON_NAME_REQUIRED" to { entry(person = "  ") },
            "PERSON_NAME_TOO_LONG" to { entry(person = "가".repeat(21)) },
            "PERSON_NAME_INVALID" to { entry(person = "김\u0000") },
            "PERSON_AMOUNT_INVALID" to { entry(amount = 0) },
            "PERSON_AMOUNT_TOO_LARGE" to { entry(amount = 100_000_001) },
            "PERSON_DATE_FUTURE" to { entry(on = "2026-11-06") },
            "PERSON_DATE_TOO_OLD" to { entry(on = "1999-12-31") },
            "PERSON_MEMO_TOO_LONG" to { entry(memo = "가".repeat(101)) },
        )
        rejected.forEach { (code, make) -> shouldThrow<InvalidPersonEntry> { make() }.code shouldBe code }
        entry(person = "  회사   김 과장 ").person shouldBe "회사 김 과장"
        entry(memo = "   ").memo shouldBe null
    }

    "해 봉투 — 남은 금액은 음수 가능 · 해 범위 2000 ~ 내년" {
        val e = OccasionEnvelope.of(Year.of(2026), krw(500_000), today)
        EnvelopeStatusOfYear(e, krw(650_000)).remaining shouldBe krw(-150_000)
        OccasionEnvelope.of(Year.of(2027), krw(1), today)
        shouldThrow<InvalidPersonEntry> { OccasionEnvelope.of(Year.of(2028), krw(1), today) }.code shouldBe "PERSON_YEAR_INVALID"
        shouldThrow<InvalidPersonEntry> { OccasionEnvelope.of(Year.of(1999), krw(1), today) }.code shouldBe "PERSON_YEAR_INVALID"
        shouldThrow<InvalidPersonEntry> { OccasionEnvelope.of(Year.of(2026), krw(0), today) }.code shouldBe "ENVELOPE_AMOUNT_INVALID"
    }
})
