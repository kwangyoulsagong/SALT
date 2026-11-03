package com.salt.savings.domain

import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode
import java.time.LocalDate
import java.time.YearMonth
import java.time.temporal.ChronoUnit

enum class CalculationState {
    /** 계산됨 */
    OK,

    /** 이미 목표 금액 이상 모였다 */
    REACHED,

    /** 기한이 이번 달이거나 지났다 — 넣을 달이 없다 */
    DEADLINE_TOO_CLOSE,

    /** 이 월 적립액으로는 100년 안에 닿지 않는다 */
    NOT_REACHABLE,
}

/**
 * 양방향 계산 결과(`SRV-REQ-045` FR-3).
 *
 * @param monthly 월 적립액 — 원 단위 **올림**(덜 넣으면 기한에 못 닿는다). 계획 금액이라 최종값이고 중간값이 아니다
 * @param months 넣는 달 수(이번 달 포함)
 * @param reachMonth 도달 월 = 이번 달 + [months]. 기한 모드면 기한의 달과 같다
 * @param expectedInterest 세후 예상 이자(이자 미포함이면 0)
 */
data class Calculation(
    val state: CalculationState,
    val remaining: Money,
    val monthly: Money?,
    val months: Int?,
    val reachMonth: YearMonth?,
    val expectedInterest: Money,
)

/**
 * 저축 계산 — 순수 함수만. 시계 · DB 를 모른다(오늘 날짜는 인자로, KST 해석은 application 이 한다).
 *
 * ## 이자 모형 — 정기적금 단리, 매달 초 납입
 *
 * k 번째 납입(1..n)은 만기까지 (n − k + 1)개월 이자를 받는다 → 이자 합 = m · r · n(n+1)/24 (r = 연 이율 소수).
 * 세후는 × (1 − [INTEREST_TAX_RATE]). 이미 모은 돈의 이자는 넣지 않는다(어디에 두었는지 모른다) — 응답의 가정 칸이 이 문장을 말한다.
 */
object SavingsMath {
    /** 이자소득세 14% + 지방소득세 1.4%(FEATURE-012 FR-2). 제도 파라미터 사본(FR-13)이 생기면 그 값으로 */
    val INTEREST_TAX_RATE: BigDecimal = BigDecimal("0.154")

    /** 도달 월 탐색 상한 — 100년 */
    const val MAX_MONTHS = 1200

    private val MC = MathContext.DECIMAL128
    private val TWENTY_FOUR = BigDecimal(24)
    private val HUNDRED = BigDecimal(100)

    /** 세후 연 이율(소수). 이자 미포함이면 0 */
    fun netRate(interest: InterestPlan?): BigDecimal =
        interest?.annualRatePercent?.divide(HUNDRED, MC)?.multiply(BigDecimal.ONE - INTEREST_TAX_RATE, MC) ?: BigDecimal.ZERO

    /** n 달 동안 매달 1원씩 넣었을 때 만기 금액(세후) = n + r·n(n+1)/24 */
    fun growthFactor(months: Int, netRate: BigDecimal): BigDecimal {
        val n = BigDecimal(months)
        return n + netRate.multiply(n, MC).multiply(n + BigDecimal.ONE, MC).divide(TWENTY_FOUR, MC)
    }

    /** 넣는 달 수 — 이번 달부터 기한의 달 **전**까지(기한의 달엔 이미 모여 있어야 한다) */
    fun monthsUntil(today: LocalDate, deadline: LocalDate): Int =
        ChronoUnit.MONTHS.between(YearMonth.from(today), YearMonth.from(deadline)).toInt()

    /** 금액 + 기한 → 월 적립액 */
    fun byDeadline(target: Money, saved: Money, deadline: LocalDate, interest: InterestPlan?, today: LocalDate): Calculation {
        val remaining = target - saved
        val zero = Money.zero(target.currency)
        if (remaining.isNegative() || remaining.isZero()) return Calculation(CalculationState.REACHED, zero, null, 0, YearMonth.from(today), zero)
        val months = monthsUntil(today, deadline)
        if (months <= 0) return Calculation(CalculationState.DEADLINE_TOO_CLOSE, remaining, null, null, null, zero)

        val rate = netRate(interest)
        val monthly = Money.of(
            remaining.toDecimal().divide(growthFactor(months, rate), MC).setScale(0, RoundingMode.CEILING),
            target.currency,
        )
        return Calculation(CalculationState.OK, remaining, monthly, months, YearMonth.from(today).plusMonths(months.toLong()), interestOf(monthly, months, rate))
    }

    /** 금액 + 월 적립액 → 도달 월 */
    fun byMonthly(target: Money, saved: Money, monthly: Money, interest: InterestPlan?, today: LocalDate): Calculation {
        val remaining = target - saved
        val zero = Money.zero(target.currency)
        if (remaining.isNegative() || remaining.isZero()) return Calculation(CalculationState.REACHED, zero, monthly, 0, YearMonth.from(today), zero)
        val rate = netRate(interest)
        val months = monthsToReach(remaining, monthly, rate)
            ?: return Calculation(CalculationState.NOT_REACHABLE, remaining, monthly, null, null, zero)
        return Calculation(CalculationState.OK, remaining, monthly, months, YearMonth.from(today).plusMonths(months.toLong()), interestOf(monthly, months, rate))
    }

    /** 남은 돈을 이 월 적립으로 채우는 최소 달 수. 0 이하 적립이거나 100년 안에 못 닿으면 null */
    fun monthsToReach(remaining: Money, monthly: Money, netRate: BigDecimal): Int? {
        if (monthly.isNegative() || monthly.isZero()) return null
        val need = remaining.toDecimal()
        val m = monthly.toDecimal()
        // 이자 없는 상한부터 — 이자가 있으면 그보다 빠르다. 그 아래를 이분 탐색한다(달 수에 대해 단조 증가)
        // 상한을 BigDecimal 로 비교한다 — Int 로 먼저 바꾸면 21억을 넘는 몫이 음수로 접혀 "1달"이 된다(코드 리뷰 2026-11-03)
        val upper = need.divide(m, 0, RoundingMode.CEILING).max(BigDecimal.ONE)
        val cap = BigDecimal(MAX_MONTHS)
        if (upper > cap && m.multiply(growthFactor(MAX_MONTHS, netRate), MC) < need) return null
        var lo = 1
        var hi = upper.min(cap).toInt()
        while (lo < hi) {
            val mid = (lo + hi) / 2
            if (m.multiply(growthFactor(mid, netRate), MC) >= need) hi = mid else lo = mid + 1
        }
        return lo
    }

    private fun interestOf(monthly: Money, months: Int, netRate: BigDecimal): Money =
        monthly.scale(growthFactor(months, netRate) - BigDecimal(months))
}
