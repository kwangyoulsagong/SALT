package com.salt.content.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import com.salt.kernel.Money
import java.math.BigDecimal
import java.time.LocalDate

/**
 * 내 숫자로 다시 읽기(`SRV-REQ-047` FR-6 · FEATURE-014 FR-6, 금융 팁 S2d). 글의 예시 숫자를 로그인한 사람의 값으로 다시 계산하고
 * **해당될 수 있는 제도 + 요건 체크**까지만 한다 — 받을 수 있다고 말하지 않는다(요건 중 앱이 모르는 것은 늘 `unknown`).
 *
 * 다른 서비스의 사실(저축 목표 · 가계부 급여)은 **BFF 가 원천에서 읽어 넘긴다**(`msa-services.md` §5 — 서비스끼리 부르지 않는다,
 * 서비스 주소는 BFF 한 곳). content 는 그 사실을 저장하지 않는다 — 계산만 하고 버린다(급여는 민감 정보: 저장 · 로그 0).
 * 숫자는 전부 제도 파라미터 표([PolicyParam])에서 — 이 파일에 금액 · 비율 상수 0.
 *
 * 불변식:
 * 1. 원천을 못 읽었으면(`null` · [Wage.Unread]) 그 원천이 쓰는 요건은 `unknown` — 못 읽은 것을 "아님"으로 말하지 않는다
 * 2. 앱이 모르는 요건(무주택 · 세대주 · 금융회사 · 주택 규모 · 받은 적 있나)은 원천과 무관하게 늘 `unknown`
 * 3. 같은 사실 · 같은 날이면 같은 답. 금액 반올림은 응답 직전 한 번(여기선 [Money] 그대로)
 */
enum class MyNumbersKind(val key: String) {
    HOUSING_SUBSCRIPTION("housing_subscription"),
    MARRIAGE_CREDIT("marriage_credit"),
    DEPOSIT_PROTECTION("deposit_protection"),
    MONTHLY_RENT_CREDIT("monthly_rent_credit"),
    ;

    companion object {
        fun parse(key: String): MyNumbersKind? = entries.firstOrNull { it.key == key }
    }
}

/** 저축 목표 하나 — 저축 서비스 응답에서 BFF 가 고른 칸. 이름 · id 는 받지 않는다(계산에 안 쓴다) */
data class GoalFact(
    val template: String,
    val status: String,
    val saved: Money,
    val monthlyPlan: Money?,
    val targetDate: LocalDate?,
)

/** 가계부 급여 칸(노동시간 환산 설정) — 켜 둔 것만 쓴다(사용자가 끈 칸을 다른 데 쓰지 않는다) */
sealed interface Wage {
    /** 원천을 못 읽었다(늦음 · 실패) */
    data object Unread : Wage

    /** 읽었는데 적지 않았거나 꺼 두었다 */
    data object NotSet : Wage

    data class Set(val hourly: Boolean, val amount: Money, val monthlyHours: Int?) : Wage {
        /** 한 해 급여 어림 — 월급 × 12, 시급이면 × 월 시간(없으면 209) × 12. 세전 · 비과세 구분은 모른다([MyReading.estimated]) */
        val annual: Money
            get() = if (hourly) amount.scale(BigDecimal((monthlyHours ?: DEFAULT_MONTHLY_HOURS) * 12)) else amount.scale(BigDecimal(12))
    }

    companion object {
        /** 가계부 노동시간 환산과 같은 값(주 40시간 + 주휴) */
        const val DEFAULT_MONTHLY_HOURS = 209
    }
}

/** [goals] 가 null 이면 저축 원천을 못 읽었다 — 빈 목록(목표 없음)과 다르다 */
data class MyFacts(val goals: List<GoalFact>?, val wage: Wage)

enum class CheckState(val key: String) {
    MET("met"),
    NOT_MET("not_met"),
    UNKNOWN("unknown"),
}

/** 숫자 한 칸 — 금액([amount]) 또는 비율([ratio]) 하나 */
data class Figure(val key: String, val label: String, val amount: Money? = null, val ratio: BigDecimal? = null)

data class Check(val key: String, val label: String, val state: CheckState, val note: String)

/**
 * 다시 읽은 결과. [emptyReason] 이 있으면 숫자를 낼 재료가 없다(목표 없음 · 원천 못 읽음) — 화면은 글의 예시 그대로 두고 그 한 줄만.
 * [estimated] — 급여 어림을 썼다(화면이 "어림" 이라고 말한다).
 */
data class MyReading(
    val kind: MyNumbersKind,
    val figures: List<Figure>,
    val checks: List<Check>,
    val emptyReason: String?,
    val estimated: Boolean,
)

object MyNumbers {
    /** 그날 유효한 파라미터 — 없으면 null(제도 구간 밖) */
    fun interface Params {
        fun at(key: String): PolicyParam?
    }

    fun read(kind: MyNumbersKind, facts: MyFacts, params: Params): MyReading = when (kind) {
        MyNumbersKind.HOUSING_SUBSCRIPTION -> housing(facts, params)
        MyNumbersKind.MARRIAGE_CREDIT -> marriage(facts, params)
        MyNumbersKind.DEPOSIT_PROTECTION -> deposit(facts, params)
        MyNumbersKind.MONTHLY_RENT_CREDIT -> rent(facts, params)
    }

    // ---------- 요건 문장 — 원문 글처럼 "~예요 · ~있어요" 로만(법적 선 검사를 테스트가 돌린다) ----------

    const val GOALS_UNREAD = "저축 목표를 지금 읽지 못해 글의 예시 숫자 그대로예요."
    const val NO_PARAM = "이 제도의 숫자가 오늘 기준으로 정해져 있지 않아 글의 예시 숫자 그대로예요."

    private const val WAGE_UNREAD = "가계부의 급여 칸을 지금 읽지 못했어요."
    private const val WAGE_NOT_SET = "가계부 노동시간 설정에 급여를 적어 켜 두면 여기서 볼 수 있어요."
    private const val WAGE_ESTIMATE = "가계부에 적은 급여로 어림했어요. 총급여(세전 · 비과세 제외)와 다를 수 있어요."
    private const val HOMELESS_HEAD = "그해 주택이 없는 세대의 세대주인지는 앱이 알 수 없어요."

    private fun salaryCheck(key: String, wage: Wage, cap: PolicyParam?, label: String): Check {
        val limit = cap?.value?.let(Money::krw)
        return when {
            limit == null -> Check(key, label, CheckState.UNKNOWN, NO_PARAM)
            wage is Wage.Unread -> Check(key, label, CheckState.UNKNOWN, WAGE_UNREAD)
            wage is Wage.Set -> Check(key, label, if (wage.annual <= limit) CheckState.MET else CheckState.NOT_MET, WAGE_ESTIMATE)
            else -> Check(key, label, CheckState.UNKNOWN, WAGE_NOT_SET)
        }
    }

    private fun active(goals: List<GoalFact>, template: String? = null): List<GoalFact> =
        goals.filter { it.status == "active" && (template == null || it.template == template) }

    /** 주택청약 소득공제 — 주거 목표의 월 적립 계획 × 12 → 한도까지 × 공제율 */
    private fun housing(facts: MyFacts, params: Params): MyReading {
        val kind = MyNumbersKind.HOUSING_SUBSCRIPTION
        val rate = params.at("housing_subscription_deduction_rate")?.value
        val cap = params.at("housing_subscription_annual_cap")?.value?.let(Money::krw)
        val salary = salaryCheck("salary_cap", facts.wage, params.at("housing_subscription_salary_cap"), "그해 총급여 7천만 원 이하")
        val checks = listOf(salary, Check("homeless_head", "무주택 세대의 세대주(또는 배우자)", CheckState.UNKNOWN, HOMELESS_HEAD))
        val estimated = facts.wage is Wage.Set
        val goals = facts.goals ?: return MyReading(kind, emptyList(), checks, GOALS_UNREAD, estimated)
        if (rate == null || cap == null) return MyReading(kind, emptyList(), checks, NO_PARAM, estimated)
        val plans = active(goals, "housing").mapNotNull { it.monthlyPlan }
        if (plans.isEmpty()) return MyReading(kind, emptyList(), checks, "월 적립 계획이 있는 주거 목표가 없어 글의 예시 숫자 그대로예요.", estimated)
        val annual = plans.reduce(Money::plus).scale(BigDecimal(12))
        val counted = if (annual > cap) cap else annual
        val figures = listOf(
            Figure("annual_payment", "한 해 넣을 돈(주거 목표 월 적립 계획 × 12)", amount = annual),
            Figure("counted", "공제 대상 납입액(한 해 한도까지)", amount = counted),
            Figure("deduction", "소득에서 빠지는 돈", amount = counted.scale(rate)),
            Figure("rate", "공제율", ratio = rate),
        )
        return MyReading(kind, figures, checks, null, estimated)
    }

    /** 결혼세액공제 — 결혼 목표 날짜가 제도 기한 안인가 + 한 사람 공제액 */
    private fun marriage(facts: MyFacts, params: Params): MyReading {
        val kind = MyNumbersKind.MARRIAGE_CREDIT
        val credit = params.at("marriage_tax_credit_per_person")
        val firstTime = Check("first_time", "한 사람에 평생 한 번", CheckState.UNKNOWN, "예전에 이 공제를 받은 적이 있는지는 앱이 알 수 없어요.")
        val goals = facts.goals ?: return MyReading(kind, emptyList(), listOf(firstTime), GOALS_UNREAD, false)
        if (credit?.value == null) return MyReading(kind, emptyList(), listOf(firstTime), NO_PARAM, false)
        val wedding = active(goals, "wedding")
        if (wedding.isEmpty()) return MyReading(kind, emptyList(), listOf(firstTime), "결혼 목표가 없어 글의 예시 숫자 그대로예요.", false)
        val date = wedding.mapNotNull { it.targetDate }.minOrNull()
        val label = "혼인신고일이 제도 기한 안"
        val deadline = when {
            date == null -> Check("deadline", label, CheckState.UNKNOWN, "결혼 목표에 날짜가 없어요. 기준은 예식일이 아니라 혼인신고일이에요.")
            credit.validTo == null || !date.isAfter(credit.validTo) ->
                Check("deadline", label, CheckState.MET, "결혼 목표 날짜($date) 기준이에요. 기준은 예식일이 아니라 혼인신고일이에요.")
            else -> Check("deadline", label, CheckState.NOT_MET, "결혼 목표 날짜($date)가 지금 법의 기한(${credit.validTo})보다 뒤예요. 기준은 혼인신고일이에요.")
        }
        val figures = listOf(Figure("per_person", "한 사람이 세금에서 뺄 수 있는 돈(많아야)", amount = Money.krw(credit.value)))
        return MyReading(kind, figures, listOf(deadline, firstTime), null, false)
    }

    /** 예금자보호 — 모은 돈이 가장 많은 목표 · 전체를 한도와 견준다. 금융회사는 모른다 */
    private fun deposit(facts: MyFacts, params: Params): MyReading {
        val kind = MyNumbersKind.DEPOSIT_PROTECTION
        val institution = Check("same_institution", "한 금융회사 기준", CheckState.UNKNOWN, "목표마다 돈을 어느 금융회사에 두었는지는 앱이 알 수 없어요.")
        val goals = facts.goals ?: return MyReading(kind, emptyList(), listOf(institution), GOALS_UNREAD, false)
        val limit = params.at("deposit_protection_limit")?.value?.let(Money::krw) ?: return MyReading(kind, emptyList(), listOf(institution), NO_PARAM, false)
        val withMoney = goals.filter { !it.saved.isZero() && !it.saved.isNegative() }
        if (withMoney.isEmpty()) return MyReading(kind, emptyList(), listOf(institution), "모은 돈이 있는 목표가 없어 글의 예시 숫자 그대로예요.", false)
        val largest = withMoney.maxOf { it.saved }
        val total = withMoney.map { it.saved }.reduce(Money::plus)
        val within = Check(
            "within_limit",
            "목표 하나에 모은 돈이 보호 한도 안",
            if (largest <= limit) CheckState.MET else CheckState.NOT_MET,
            if (largest <= limit) "모은 돈이 가장 많은 목표도 한도 안이에요." else "모은 돈이 가장 많은 목표가 한도를 넘어요. 한도는 금융회사마다 따로 세요.",
        )
        val figures = listOf(
            Figure("largest_saved", "모은 돈이 가장 많은 목표", amount = largest),
            Figure("total_saved", "목표 전체에 모은 돈", amount = total),
            Figure("limit", "한 금융회사 보호 한도(원금 + 이자)", amount = limit),
        )
        return MyReading(kind, figures, listOf(within, institution), null, false)
    }

    /** 월세 세액공제 — 급여 구간으로 공제율, 한 해 한도. 월세액 · 주택 요건은 모른다 */
    private fun rent(facts: MyFacts, params: Params): MyReading {
        val kind = MyNumbersKind.MONTHLY_RENT_CREDIT
        val salaryCap = params.at("monthly_rent_credit_salary_cap")
        val highCap = params.at("monthly_rent_credit_high_rate_salary_cap")?.value?.let(Money::krw)
        val highRate = params.at("monthly_rent_credit_high_rate")?.value
        val lowRate = params.at("monthly_rent_credit_rate")?.value
        val annualCap = params.at("monthly_rent_credit_annual_cap")?.value?.let(Money::krw)
        val salary = salaryCheck("salary_cap", facts.wage, salaryCap, "그해 총급여 8천만 원 이하")
        val checks = listOf(
            salary,
            Check("homeless_head", "무주택 세대의 세대주", CheckState.UNKNOWN, HOMELESS_HEAD),
            Check("house_size", "국민주택규모 이하 또는 기준시가 4억 원 이하 주택", CheckState.UNKNOWN, "사는 집의 규모 · 기준시가는 앱이 알 수 없어요."),
        )
        val estimated = facts.wage is Wage.Set
        if (annualCap == null || highCap == null || highRate == null || lowRate == null) return MyReading(kind, emptyList(), checks, NO_PARAM, estimated)
        val wage = facts.wage
        val rate = when {
            wage !is Wage.Set || salary.state != CheckState.MET -> null
            wage.annual <= highCap -> highRate
            else -> lowRate
        }
        val figures = listOfNotNull(
            rate?.let { Figure("rate", "내 급여 구간의 공제율", ratio = it) },
            Figure("annual_cap", "공제 대상 월세(한 해 한도)", amount = annualCap),
            rate?.let { Figure("max_credit", "한도만큼 냈을 때 세금에서 빠지는 돈(많아야)", amount = annualCap.scale(it)) },
        )
        val reason = when (wage) {
            is Wage.Set -> null
            Wage.Unread -> "가계부의 급여 칸을 지금 읽지 못해 공제율은 글의 예시 그대로예요."
            Wage.NotSet -> "급여를 모르면 공제율 구간을 고를 수 없어 글의 예시 그대로예요."
        }
        return MyReading(kind, figures, checks, reason, estimated)
    }

    /** 문장 전부 — 법적 선 검사용(테스트) */
    fun sentences(reading: MyReading): List<String> =
        reading.figures.map { it.label } + reading.checks.flatMap { listOf(it.label, it.note) } + listOfNotNull(reading.emptyReason)
}

class MyNumbersNotFound(slug: String) :
    DomainError("TIP_MY_NUMBERS_NOT_FOUND", ErrorKind.NOT_FOUND, "Tip has no my-numbers reading", mapOf("slug" to slug))
