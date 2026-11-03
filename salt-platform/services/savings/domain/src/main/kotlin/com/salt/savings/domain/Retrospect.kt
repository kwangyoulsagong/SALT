package com.salt.savings.domain

import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.MathContext
import java.time.LocalDate
import java.time.YearMonth

/**
 * 놓친 달 회고(`SRV-REQ-045` FR-11 · FEATURE-012 FR-10) — 건너뛴 달 수와 그 달들이 "계획대로면" 도달 월을 몇 달 옮겼는지. 사실만 —
 * 재촉 · 벌칙 상태가 없다. 구간이 달 단위라 이동도 **달**로 센다(스펙 "일수" 정정 — 일 단위로 말하면 없는 정밀도를 말한다).
 *
 * @param observedMonths 살펴본 다 찬 달 수(만든 다음 달 ~ 지난달 + 만든 달에 넣었으면 그 달, 다 찬 목표는 다 찬 달 전까지).
 *   멈춘 기간은 빼지 못한다 — 멈춤 이력이 없다(멈춤을 바꾸는 경로가 아직 없어 `paused` 목표가 생기지 않는다. 멈춤이 생기면 이력과 같이)
 * @param skippedMonths 그중 넣지 않은 달
 * @param shiftMonths 건너뛴 달마다 계획만큼 넣었다면 도달 월이 몇 달 빨랐을지. 계획이 없거나 다 찬 목표면 null([reason])
 */
data class MissedMonths(val observedMonths: Int, val skippedMonths: Int, val shiftMonths: Int?, val reason: String?) {
    companion object {
        fun of(goal: Goal, saved: Money, history: List<MonthlyDeposit>, startMonth: YearMonth, today: LocalDate, endMonth: YearMonth?): MissedMonths {
            val thisMonth = YearMonth.from(today)
            // 다 찬 목표는 다 찬 달 전까지만 본다 — 그 뒤엔 넣을 이유가 없다
            val stop = listOfNotNull(thisMonth, endMonth).min()
            val deposited = history.filter { !it.amount.isZero() }.map { it.month }.toSet()
            // 만든 달은 넣었을 때만 센다 — 31일에 만들고 다음 달 1일에 넣은 목표를 "한 달 건너뜀"이라 하지 않는다(코드 리뷰 2026-11-03)
            val months = generateSequence(startMonth) { it.plusMonths(1) }
                .takeWhile { it < stop }
                .filter { it != startMonth || it in deposited }
                .toList()
            val skipped = months.count { it !in deposited }
            val remaining = goal.targetAmount - saved
            val plan = goal.monthlyPlan
            return when {
                remaining.isNegative() || remaining.isZero() || goal.status == GoalStatus.COMPLETED ->
                    MissedMonths(months.size, skipped, null, ProjectionReason.REACHED)
                plan == null -> MissedMonths(months.size, skipped, null, ProjectionReason.NO_PLAN)
                skipped == 0 -> MissedMonths(months.size, 0, 0, null)
                else -> {
                    val rate = SavingsMath.netRate(goal.interest)
                    val now = SavingsMath.monthsToReach(remaining, plan, rate)
                    val filled = remaining - plan.scale(BigDecimal(skipped))
                    val ifFilled = if (filled.isNegative() || filled.isZero()) 0 else SavingsMath.monthsToReach(filled, plan, rate)
                    MissedMonths(months.size, skipped, if (now != null && ifFilled != null) now - ifFilled else null, null)
                }
            }
        }
    }
}

/**
 * 비상시 비교(`SRV-REQ-045` FR-12 · FEATURE-012 FR-11) — 급하게 [amount] 가 필요할 때 ① 목표에서 꺼내기 ② 사용자가 넣은 금리로 빌리기.
 * **상품 · 링크 0** — 금리는 사용자가 넣은 숫자다. 어느 쪽이 낫다고 말하지 않는다: 두 줄의 숫자만.
 *
 * ① 꺼내기: 남은 돈이 [amount] 만큼 늘어 "계획대로면" 도달 월이 몇 달 밀리는지. 모은 돈보다 많이 꺼낼 수 없다
 * ② 빌리기: 원리금 균등 상환 — 월 상환액 = P·r / (1 − (1+r)^−n), r = 연 금리/12 를 **원 단위 올림**(덜 내면 못 갚는다 — 월 적립과 같은 계획 금액, 최종값).
 *   이자 합 = 정확한 원리금 균등 이자(원 단위), 마지막 달 = 원금 + 이자 − 올린 상환 × (n−1). 실제 상환처럼 끝 달이 차액을 맞춘다.
 *   ~~이자 합 = 올린 월 상환 × n − P~~ **정정 2026-11-03(셸 경유 실측)**: 그러면 금리 0% 에도 "이자 8원"이 나왔다 — 올림 차액은 이자가 아니다.
 *   상환은 목표 밖에서 낸다고 가정(가정 키)
 */
data class EmergencyComparison(
    val amount: Money,
    val withdraw: Withdraw,
    val loan: Loan,
) {
    data class Withdraw(val planMonthBefore: YearMonth?, val planMonthAfter: YearMonth?, val delayMonths: Int?, val reason: String?)

    /**
     * @param monthlyPayment 매달 내는 돈 — 원 단위 올림(덜 내면 못 갚는다)
     * @param lastPayment 마지막 달 — 올림으로 더 낸 몫을 빼고 남은 돈. 매달 × (n−1) + 마지막 = 원금 + 이자 합(화면 숫자가 서로 맞는다)
     * @param totalInterest 이자 합 — 원리금 균등의 정확한 값을 원 단위로 한 번(금리 0 이면 0). 올림 차액은 이자가 아니다
     */
    data class Loan(val months: Int, val annualRatePercent: BigDecimal, val monthlyPayment: Money, val lastPayment: Money, val totalInterest: Money)

    companion object {
        const val LOAN_MONTHS_MAX = 120
        private val MC = MathContext.DECIMAL128
        private val TWELVE = BigDecimal(12)
        private val HUNDRED = BigDecimal(100)

        fun of(goal: Goal, saved: Money, amount: Money, loanRatePercent: BigDecimal, loanMonths: Int, today: LocalDate): EmergencyComparison {
            if (amount.isNegative() || amount.isZero()) throw InvalidGoal("EMERGENCY_AMOUNT_INVALID", "amount must be positive")
            if (amount > saved) throw InvalidGoal("EMERGENCY_AMOUNT_OVER_SAVED", "amount must not exceed saved")
            if (loanRatePercent.signum() < 0 || loanRatePercent > BigDecimal(30)) throw InvalidGoal("EMERGENCY_RATE_INVALID", "loanRate must be 0..30")
            if (loanMonths !in 1..LOAN_MONTHS_MAX) throw InvalidGoal("EMERGENCY_MONTHS_INVALID", "loanMonths must be 1..$LOAN_MONTHS_MAX")
            return EmergencyComparison(amount, withdraw(goal, saved, amount, today), loan(amount, loanRatePercent, loanMonths))
        }

        private fun withdraw(goal: Goal, saved: Money, amount: Money, today: LocalDate): Withdraw {
            val plan = goal.monthlyPlan ?: return Withdraw(null, null, null, ProjectionReason.NO_PLAN)
            val rate = SavingsMath.netRate(goal.interest)
            val thisMonth = YearMonth.from(today)
            val before = (goal.targetAmount - saved).let { if (it.isNegative() || it.isZero()) 0 else SavingsMath.monthsToReach(it, plan, rate) }
            val after = SavingsMath.monthsToReach(goal.targetAmount - saved + amount, plan, rate)
            return Withdraw(
                before?.let { thisMonth.plusMonths(it.toLong()) },
                after?.let { thisMonth.plusMonths(it.toLong()) },
                if (before != null && after != null) after - before else null,
                if (after == null) ProjectionReason.SLOW_SIDE_OPEN else null,
            )
        }

        private fun loan(principal: Money, annualRatePercent: BigDecimal, months: Int): Loan {
            val r = annualRatePercent.divide(HUNDRED, MC).divide(TWELVE, MC)
            val n = BigDecimal(months)
            val payment = if (r.signum() == 0) {
                principal.toDecimal().divide(n, MC)
            } else {
                val discount = BigDecimal.ONE - BigDecimal.ONE.divide((BigDecimal.ONE + r).pow(months, MC), MC)
                principal.toDecimal().multiply(r, MC).divide(discount, MC)
            }
            val monthly = Money.of(payment.setScale(0, java.math.RoundingMode.CEILING), principal.currency)
            val interest = Money.of((payment.multiply(n, MC) - principal.toDecimal()).setScale(0, java.math.RoundingMode.HALF_UP).max(BigDecimal.ZERO), principal.currency)
            val last = principal + interest - monthly.scale(BigDecimal(months - 1))
            // 아주 작은 돈을 긴 달로 나누면 올림만으로 원금을 넘는다(1원 · 120달) — 나눌 수 없다고 답한다
            if (last.isNegative() || last.isZero()) throw InvalidGoal("EMERGENCY_AMOUNT_TOO_SMALL", "amount is too small to split into loanMonths payments")
            return Loan(months, annualRatePercent, monthly, last, interest)
        }
    }
}
