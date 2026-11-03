package com.salt.savings.domain

import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode
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
 * ② 빌리기: 원리금 균등 — 정확한 월 상환 P·r / (1 − (1+r)^−n)(r = 연 금리/12)로 이자 합을 원 단위로 정하고(금리 0 이면 0),
 *   **갚을 총액(원금 + 이자)을 n 달에 원 단위로 나눈다** — 나머지만큼의 앞 달이 1원 더(`처음 k개월 X원 · 나머지 Y원`). 숫자가 그대로 더해지고,
 *   총액이 달 수 이상이면 늘 나뉜다. 총액이 달 수보다 작으면 대출 칸만 `loan = null` + 이유(꺼내기 칸은 남는다). 상환은 목표 밖에서 낸다고 가정(가정 키).
 *   ~~이자 = 올린 상환 × n − 원금~~ → ~~마지막 달이 올림 차액~~ **정정 2026-11-03 두 번**(0% 이자 8원 · 나머지에 따라 거절되는 금액 · 1개월 두 금액 — 셸 실측 · 리뷰)
 */
class EmergencyComparison private constructor(
    val amount: Money,
    val withdraw: Withdraw,
    /** 나눌 수 없으면 null — 이유는 [loanReason] */
    val loan: Loan?,
    /** 대출 칸이 빈 이유. "대출 없음 ⇔ 이유 있음"을 생성 때 검사한다 — 이유가 늘어도 모순된 상태를 만들 수 없다(리뷰 3 · 4차) */
    val loanReason: String?,
) {
    init {
        // 생성자는 private — [of] 만 만든다. 그래서 이 검사는 사용자 입력이 아니라 코드 결함만 잡는다(리뷰 5차: 500 이 될 수 있는 외부 경로 없음)
        check((loan == null) == (loanReason != null)) { "loan and loanReason must be exclusive" }
    }

    /** 계산 가정 키 — 대출 칸이 있을 때만 대출 가정이 뜻을 갖는다(컨트롤러가 아니라 여기서 정한다, 리뷰) */
    val assumptions: List<String> get() = if (loan != null) listOf(LOAN_PAID_OUTSIDE_GOAL) else emptyList()

    /** 이동 달 수가 없으면 이유가 있다 — 대출 칸과 같은 규칙(리뷰 5차). 어기는 값은 만들 수 없다 */
    data class Withdraw(val planMonthBefore: YearMonth?, val planMonthAfter: YearMonth?, val delayMonths: Int?, val reason: String?) {
        init {
            check((delayMonths == null) == (reason != null)) { "withdraw delayMonths and reason must be exclusive" }
        }
    }

    /**
     * 갚을 총액 = 원금 + [totalInterest] = [firstPayment] × [firstMonths] + [restPayment] × [restMonths].
     * 나누어떨어지면 [restMonths] = 0(매달 같은 금액). 1개월이면 금액 하나
     */
    data class Loan(
        val months: Int,
        val annualRatePercent: BigDecimal,
        val firstPayment: Money,
        val firstMonths: Int,
        val restPayment: Money,
        val restMonths: Int,
        val totalInterest: Money,
    )

    companion object {
        const val LOAN_MONTHS_MAX = 120

        /** 갚을 총액이 달 수보다 작아 원 단위로 나눌 수 없다(예: 1원 · 120달) */
        const val LOAN_TOO_SMALL = "amount_too_small"

        /** 상환은 목표 적립과 따로 낸다고 본다 */
        const val LOAN_PAID_OUTSIDE_GOAL = "loan_paid_outside_goal"
        /** 대출 계산 정밀도 — DECIMAL128(34자리)이면 원금 · 기간이 클 때 꼬리 오차가 정리 자리까지 올라온다(리뷰 5차). 60자리 */
        private val MC = MathContext(60, RoundingMode.HALF_EVEN)

        /** 꼬리 오차 정리 자리 — 정밀도(60) 한참 아래이고 원 단위 한참 위. 금액 반올림이 아니라 계산 오차 제거다(`kotlin-platform.md` §3) */
        private const val NOISE_SCALE = 30
        private val TWELVE = BigDecimal(12)
        private val HUNDRED = BigDecimal(100)

        fun of(goal: Goal, saved: Money, amount: Money, loanRatePercent: BigDecimal, loanMonths: Int, today: LocalDate): EmergencyComparison {
            if (amount.isNegative() || amount.isZero()) throw InvalidGoal("EMERGENCY_AMOUNT_INVALID", "amount must be positive")
            if (amount > saved) throw InvalidGoal("EMERGENCY_AMOUNT_OVER_SAVED", "amount must not exceed saved")
            if (loanRatePercent.signum() < 0 || loanRatePercent > BigDecimal(30)) throw InvalidGoal("EMERGENCY_RATE_INVALID", "loanRate must be 0..30")
            if (loanMonths !in 1..LOAN_MONTHS_MAX) throw InvalidGoal("EMERGENCY_MONTHS_INVALID", "loanMonths must be 1..$LOAN_MONTHS_MAX")
            // 원화는 원 단위 — 소수 원금을 계산 안에서 따로 다루지 않게 입구에서 거절(리뷰 4차)
            if (amount.toDecimal().stripTrailingZeros().scale() > 0) throw InvalidGoal("EMERGENCY_AMOUNT_NOT_WHOLE", "amount must be whole won")
            val loan = loan(amount, loanRatePercent, loanMonths)
            return EmergencyComparison(amount, withdraw(goal, saved, amount, today), loan, if (loan == null) LOAN_TOO_SMALL else null)
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
                // 꺼내면 100년 안에 닿지 않는다 — "건너뛴 달" 이유(slow_side_open)가 아니다(리뷰 5차)
                if (after == null || before == null) ProjectionReason.NOT_REACHABLE else null,
            )
        }

        private fun loan(principal: Money, annualRatePercent: BigDecimal, months: Int): Loan? {
            val r = annualRatePercent.divide(HUNDRED, MC).divide(TWELVE, MC)
            val n = BigDecimal(months)
            val exactPayment = if (r.signum() == 0) {
                principal.toDecimal().divide(n, MC)
            } else {
                val discount = BigDecimal.ONE - BigDecimal.ONE.divide((BigDecimal.ONE + r).pow(months, MC), MC)
                principal.toDecimal().multiply(r, MC).divide(discount, MC)
            }
            // 원 단위로 정하는 것은 중간 반올림이 아니다 — 나눠 내는 계획 금액이 최종값이다(`kotlin-platform.md` §3 예외, 월 적립 올림과 같다).
            // 반올림은 총액 하나에 한 번: 총액 = 원금 + 정확한 이자를 원 단위로, 이자 = 총액 − 원금(리뷰 4차 — 이자 · 총액을 따로 반올림하면 두 번).
            // 그 전에 꼬리 오차만 소수 30자리([NOISE_SCALE])에서 정리한다 — 정확히 X.5원인 이자가 2.4999…985 로 계산돼 1원 모자랐다(3% · 1,000원 · 1달, 리뷰 4차 jshell 재현).
            // 60자리 정밀도의 오차는 원금 1조 · 120달에도 1e-40 아래, 실제 금액이 .5 에 1e-30 안으로 붙을 일은 없다 — 이 정리가 바꾸는 건 꼬리 오차뿐(금액 반올림으로 세지 않는다)
            val exactInterest = (exactPayment.multiply(n, MC) - principal.toDecimal()).max(BigDecimal.ZERO).setScale(NOISE_SCALE, RoundingMode.HALF_UP)
            val total = (principal.toDecimal() + exactInterest).setScale(0, RoundingMode.HALF_UP)
            val interest = total - principal.toDecimal()
            if (total < n) return null
            val base = total.divide(n, 0, RoundingMode.FLOOR)
            val extra = (total - base.multiply(n)).toInt()
            // 나머지 extra 달이 1원 더 — 결정은 한 곳에서. 나누어떨어지면 매달 같은 금액 · restMonths 0
            val (firstPayment, firstMonths) = if (extra == 0) base to months else (base + BigDecimal.ONE) to extra
            val currency = principal.currency
            return Loan(
                months = months,
                annualRatePercent = annualRatePercent,
                firstPayment = Money.of(firstPayment, currency),
                firstMonths = firstMonths,
                restPayment = Money.of(base, currency),
                restMonths = months - firstMonths,
                totalInterest = Money.of(interest, currency),
            )
        }
    }
}
