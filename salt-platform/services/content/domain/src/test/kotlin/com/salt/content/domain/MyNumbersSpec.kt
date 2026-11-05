package com.salt.content.domain

import com.salt.kernel.Money
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import java.math.BigDecimal
import java.time.LocalDate

/**
 * 금융 팁 S2d — 내 숫자로 다시 읽기(FR-6). 불변식:
 * 1. 원천을 못 읽으면 그 원천이 쓰는 요건은 unknown — "아님"으로 말하지 않는다
 * 2. 앱이 모르는 요건(무주택 · 세대주 · 금융회사 · 주택 규모 · 받은 적)은 늘 unknown
 * 3. 한도 · 기한 경계는 "그 값까지 포함" — 같으면 met, 1원 · 하루 넘으면 not_met
 * 4. 숫자는 파라미터 표에서만 — 파라미터가 없으면 숫자 0 + 이유 한 줄
 * 5. 모든 문장이 법적 선을 지난다
 */
class MyNumbersSpec : StringSpec({
    fun param(key: String, value: String, validTo: LocalDate? = null) =
        PolicyParam(key, LocalDate.of(2024, 1, 1), validTo, BigDecimal(value), null, "KRW", "https://www.law.go.kr/x", LocalDate.of(2026, 11, 5))

    val table = listOf(
        param("housing_subscription_deduction_rate", "0.40"),
        param("housing_subscription_annual_cap", "3000000"),
        param("housing_subscription_salary_cap", "70000000"),
        param("marriage_tax_credit_per_person", "500000", LocalDate.of(2026, 12, 31)),
        param("deposit_protection_limit", "100000000"),
        param("monthly_rent_credit_salary_cap", "80000000"),
        param("monthly_rent_credit_high_rate_salary_cap", "55000000"),
        param("monthly_rent_credit_high_rate", "0.17"),
        param("monthly_rent_credit_rate", "0.15"),
        param("monthly_rent_credit_annual_cap", "10000000"),
    ).associateBy { it.key }
    val params = MyNumbers.Params { table[it] }
    val none = MyNumbers.Params { null }

    fun goal(template: String, saved: Long = 0, monthly: Long? = null, date: LocalDate? = null, status: String = "active") =
        GoalFact(template, status, Money.krw(saved), monthly?.let(Money::krw), date)

    /** 월급 → 한 해 어림 = × 12 */
    fun monthly(annual: Long) = Wage.Set(hourly = false, amount = Money.krw(annual / 12), monthlyHours = null)

    fun MyReading.check(key: String) = checks.first { it.key == key }

    fun MyReading.amount(key: String) = figures.first { it.key == key }.amount!!.toKrwInteger()

    "주택청약 — 월 적립 × 12 를 한도까지 × 40%" {
        val under = MyNumbers.read(MyNumbersKind.HOUSING_SUBSCRIPTION, MyFacts(listOf(goal("housing", monthly = 200_000)), Wage.NotSet), params)
        under.amount("annual_payment") shouldBe 2_400_000
        under.amount("counted") shouldBe 2_400_000
        under.amount("deduction") shouldBe 960_000
        val over = MyNumbers.read(MyNumbersKind.HOUSING_SUBSCRIPTION, MyFacts(listOf(goal("housing", monthly = 500_000)), Wage.NotSet), params)
        over.amount("counted") shouldBe 3_000_000
        over.amount("deduction") shouldBe 1_200_000
    }

    "주택청약 — 주거 목표 여럿이면 월 적립 합, 다른 템플릿 · 끝난 목표는 빼고" {
        val goals = listOf(goal("housing", monthly = 100_000), goal("housing", monthly = 50_000), goal("travel", monthly = 900_000), goal("housing", monthly = 900_000, status = "completed"))
        MyNumbers.read(MyNumbersKind.HOUSING_SUBSCRIPTION, MyFacts(goals, Wage.NotSet), params).amount("annual_payment") shouldBe 1_800_000
    }

    "급여 경계 — 한도와 같으면 met, 넘으면 not_met, 못 읽으면 · 안 적었으면 unknown" {
        val goals = listOf(goal("housing", monthly = 100_000))
        listOf(
            monthly(70_000_008) to CheckState.NOT_MET,
            Wage.Set(false, Money.krw(5_833_333), null) to CheckState.MET, // × 12 = 69,999,996
            Wage.Set(false, Money.krw(5_833_334), null) to CheckState.NOT_MET, // × 12 = 70,000,008
            Wage.Unread to CheckState.UNKNOWN,
            Wage.NotSet to CheckState.UNKNOWN,
        ).forEach { (wage, state) ->
            MyNumbers.read(MyNumbersKind.HOUSING_SUBSCRIPTION, MyFacts(goals, wage), params).check("salary_cap").state shouldBe state
        }
        // 정확히 한도 — 7천만 원은 12로 나누어떨어지지 않아 한도를 6천만 원으로 둔 표로 본다(5,000,000 × 12)
        val atCap = Wage.Set(hourly = false, amount = Money.krw(5_000_000), monthlyHours = null)
        val capOnly = MyNumbers.Params { if (it == "housing_subscription_salary_cap") param(it, "60000000") else table[it] }
        MyNumbers.read(MyNumbersKind.HOUSING_SUBSCRIPTION, MyFacts(goals, atCap), capOnly).check("salary_cap").state shouldBe CheckState.MET
    }

    "시급은 월 시간을 비우면 209시간" {
        val w = Wage.Set(hourly = true, amount = Money.krw(10_000), monthlyHours = null)
        w.annual.toKrwInteger() shouldBe 10_000L * 209 * 12
    }

    "앱이 모르는 요건은 원천과 무관하게 늘 unknown" {
        val facts = MyFacts(listOf(goal("housing", saved = 1, monthly = 1), goal("wedding", date = LocalDate.of(2026, 12, 1))), monthly(30_000_000))
        MyNumbers.read(MyNumbersKind.HOUSING_SUBSCRIPTION, facts, params).check("homeless_head").state shouldBe CheckState.UNKNOWN
        MyNumbers.read(MyNumbersKind.MARRIAGE_CREDIT, facts, params).check("first_time").state shouldBe CheckState.UNKNOWN
        MyNumbers.read(MyNumbersKind.DEPOSIT_PROTECTION, facts, params).check("same_institution").state shouldBe CheckState.UNKNOWN
        val rent = MyNumbers.read(MyNumbersKind.MONTHLY_RENT_CREDIT, facts, params)
        rent.check("homeless_head").state shouldBe CheckState.UNKNOWN
        rent.check("house_size").state shouldBe CheckState.UNKNOWN
    }

    "저축을 못 읽으면 숫자 0 + 이유, 목표 없음과 다른 문장" {
        val unread = MyNumbers.read(MyNumbersKind.HOUSING_SUBSCRIPTION, MyFacts(null, Wage.NotSet), params)
        unread.figures.shouldBeEmpty()
        unread.emptyReason shouldBe MyNumbers.GOALS_UNREAD
        val empty = MyNumbers.read(MyNumbersKind.HOUSING_SUBSCRIPTION, MyFacts(emptyList(), Wage.NotSet), params)
        empty.figures.shouldBeEmpty()
        empty.emptyReason.shouldNotBeNull()
        (empty.emptyReason == MyNumbers.GOALS_UNREAD) shouldBe false
    }

    "결혼 — 목표 날짜가 기한 당일이면 met, 다음 날이면 not_met, 날짜 없으면 unknown" {
        listOf(
            LocalDate.of(2026, 12, 31) to CheckState.MET,
            LocalDate.of(2027, 1, 1) to CheckState.NOT_MET,
            null to CheckState.UNKNOWN,
        ).forEach { (date, state) ->
            val r = MyNumbers.read(MyNumbersKind.MARRIAGE_CREDIT, MyFacts(listOf(goal("wedding", date = date)), Wage.NotSet), params)
            r.check("deadline").state shouldBe state
            r.amount("per_person") shouldBe 500_000
        }
    }

    "결혼 — 목표가 여럿이면 가장 이른 날짜" {
        val goals = listOf(goal("wedding", date = LocalDate.of(2027, 3, 1)), goal("wedding", date = LocalDate.of(2026, 10, 1)))
        MyNumbers.read(MyNumbersKind.MARRIAGE_CREDIT, MyFacts(goals, Wage.NotSet), params).check("deadline").state shouldBe CheckState.MET
    }

    "예금자보호 — 한도와 같으면 met, 1원 넘으면 not_met, 끝난 목표도 센다(돈은 그대로 있다)" {
        listOf(100_000_000L to CheckState.MET, 100_000_001L to CheckState.NOT_MET).forEach { (saved, state) ->
            val r = MyNumbers.read(MyNumbersKind.DEPOSIT_PROTECTION, MyFacts(listOf(goal("other", saved = saved, status = "completed"), goal("travel", saved = 10)), Wage.NotSet), params)
            r.check("within_limit").state shouldBe state
            r.amount("largest_saved") shouldBe saved
            r.amount("total_saved") shouldBe saved + 10
        }
        MyNumbers.read(MyNumbersKind.DEPOSIT_PROTECTION, MyFacts(listOf(goal("other")), Wage.NotSet), params).figures.shouldBeEmpty()
    }

    "월세 — 5,500만 원까지 17%, 8천만 원까지 15%, 넘으면 공제율 없음 · not_met" {
        listOf(
            Wage.Set(false, Money.krw(4_583_333), null) to "0.17", // 54,999,996
            Wage.Set(false, Money.krw(4_583_334), null) to "0.15", // 55,000,008
            Wage.Set(false, Money.krw(6_666_666), null) to "0.15", // 79,999,992
            Wage.Set(false, Money.krw(6_666_667), null) to null, // 80,000,004
        ).forEach { (wage, rate) ->
            val r = MyNumbers.read(MyNumbersKind.MONTHLY_RENT_CREDIT, MyFacts(emptyList(), wage), params)
            r.figures.firstOrNull { it.key == "rate" }?.ratio?.toPlainString() shouldBe rate
            r.check("salary_cap").state shouldBe if (rate == null) CheckState.NOT_MET else CheckState.MET
            r.amount("annual_cap") shouldBe 10_000_000
        }
        val high = MyNumbers.read(MyNumbersKind.MONTHLY_RENT_CREDIT, MyFacts(emptyList(), monthly(36_000_000)), params)
        high.amount("max_credit") shouldBe 1_700_000
        high.emptyReason.shouldBeNull()
        high.estimated shouldBe true
    }

    "월세 — 급여를 모르면 공제율 0 · 이유 한 줄(저축은 안 읽어도 된다)" {
        val r = MyNumbers.read(MyNumbersKind.MONTHLY_RENT_CREDIT, MyFacts(null, Wage.Unread), params)
        r.figures.map { it.key } shouldBe listOf("annual_cap")
        r.emptyReason.shouldNotBeNull()
        r.check("salary_cap").state shouldBe CheckState.UNKNOWN
    }

    "파라미터가 없으면 숫자 0 + 이유" {
        val facts = MyFacts(listOf(goal("housing", saved = 1, monthly = 1), goal("wedding", date = LocalDate.of(2026, 1, 1))), monthly(30_000_000))
        MyNumbersKind.entries.forEach { kind ->
            val r = MyNumbers.read(kind, facts, none)
            r.figures.shouldBeEmpty()
            r.emptyReason shouldBe MyNumbers.NO_PARAM
        }
    }

    "모든 문장이 법적 선을 지난다" {
        val facts = listOf(
            MyFacts(null, Wage.Unread),
            MyFacts(emptyList(), Wage.NotSet),
            MyFacts(listOf(goal("housing", saved = 200_000_000, monthly = 500_000), goal("wedding", date = LocalDate.of(2027, 5, 1))), monthly(90_000_000)),
            MyFacts(listOf(goal("housing", saved = 1, monthly = 1), goal("wedding", date = LocalDate.of(2026, 5, 1))), monthly(30_000_000)),
            MyFacts(listOf(goal("wedding")), Wage.NotSet),
        )
        MyNumbersKind.entries.forEach { kind ->
            (facts.map { MyNumbers.read(kind, it, params) } + MyNumbers.read(kind, facts.first(), none)).forEach { r ->
                MyNumbers.sentences(r).forEach { LegalLine.violations(it).shouldBeEmpty() }
            }
        }
    }

    "원문 my_numbers — 모르는 계산이면 발행 실패, 아는 계산이면 글에 실린다" {
        fun src(value: String) = """
            ---
            title: 제목
            summary: 요약
            source_url: https://www.law.go.kr/x
            source_name: 국가법령정보센터
            written_on: 2026-11-05
            reviewed_on: 2026-11-05
            base_year: 2026
            valid_until: 2026-12-31
            my_numbers: $value
            ---
            문단이에요.
        """.trimIndent()
        (PublishCheck.check("a", src("housing_subscription")) as PublishCheck.Outcome.Ok).tip.myNumbers shouldBe MyNumbersKind.HOUSING_SUBSCRIPTION
        (PublishCheck.check("a", src("salary_magic")) as PublishCheck.Outcome.Rejected).problems shouldBe listOf("my_numbers: 모르는 계산 salary_magic")
    }

    "고정비 증가 — 주거만 트리거, 나머지 분류 · 사용자 분류는 신호 0" {
        TriggerKind.forFixedCostCategory("housing") shouldBe TriggerKind.FIXED_COST_INCREASED_HOUSING
        listOf("telecom", "food", "u_0123456789ab", "").forEach { TriggerKind.forFixedCostCategory(it).shouldBeNull() }
        TriggerKind.FIXED_COST_INCREASED_HOUSING.isEvent shouldBe true
    }
})
