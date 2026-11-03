package com.salt.savings.domain

import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.util.UUID

enum class ProjectionMethod(val key: String) {
    /** 월별 적립 기록 3개월 이상 — 월 적립의 10 · 90% 분위로 도달 월 구간 */
    EMPIRICAL_QUANTILE("empirical_quantile"),

    /** 기록이 모자라다 — 계획대로면 X월만 */
    PLAN_ONLY("plan_only"),
    ;

    companion object {
        fun fromKey(key: String): ProjectionMethod = entries.first { it.key == key }
    }
}

/** 구간을 못 낸 · 한쪽이 열린 이유 — 화면이 문장으로 옮긴다(`SRV-REQ-045` FR-5 · 6). 값은 키, 문장은 프론트 */
object ProjectionReason {
    /** 다 찬 달의 기록이 3개월 미만 */
    const val HISTORY_SHORT = "history_short"

    /** 이미 목표 금액 이상 */
    const val REACHED = "reached"

    /** 하위 10% 달의 적립이 0 — 늦은 쪽 끝을 정할 수 없다 */
    const val SLOW_SIDE_OPEN = "slow_side_open"

    /** 이 계획으로는 100년 안에 닿지 않는다(비상시 꺼내기 뒤 등) */
    const val NOT_REACHABLE = "not_reachable"

    /** 계획 월 적립액이 없다(만들 때 기한만 주고 계산도 못 한 경우) */
    const val NO_PLAN = "no_plan"

    /** 구간 계산이 실패했다 — 계획값만 준다(`BFF-REQ-047` 수용 기준 2). 발행 기록으로 남기지 않는다 */
    const val DEGRADED = "degraded"
}

/**
 * 도달 구간(`SRV-REQ-045` FR-5). **한 점 날짜를 내지 않는다**(ADR-003 정신) — 구간이 없으면 "계획대로면" 한 줄과 이유.
 *
 * @param early 빠른 쪽 끝(90% 분위 적립이 이어질 때)
 * @param late 늦은 쪽 끝(10% 분위 적립이 이어질 때). null = 열림([reason])
 * @param plan 계획 월 적립이 이어질 때
 */
data class Projection(
    val method: ProjectionMethod,
    val early: YearMonth?,
    val late: YearMonth?,
    val plan: YearMonth?,
    val reason: String?,
    /** 표본으로 쓴 다 찬 달 수 */
    val monthsOfHistory: Int,
)

/** 발행 기록 — 불변(`DB-REQ-037` FR-3, UPDATE · DELETE 트리거 차단). 채점(`FC-REQ-024`)의 근거 */
data class IssuedProjection(
    val id: UUID,
    val goalId: GoalId,
    val issuedAt: Instant,
    val projection: Projection,
)

object ProjectionEngine {
    const val MIN_HISTORY_MONTHS = 3
    private val P10 = BigDecimal("0.10")
    private val P90 = BigDecimal("0.90")
    private val MC = MathContext.DECIMAL128

    /**
     * @param history 월별 적립 합계(희소 — 넣지 않은 달은 없다). 이번 달은 아직 안 끝나 표본에서 뺀다
     * @param sampleShift 표본마다 더할 금액 — 저울만 쓴다
     */
    fun project(goal: Goal, saved: Money, history: List<MonthlyDeposit>, today: LocalDate, sampleShift: Money? = null): Projection {
        val remaining = goal.targetAmount - saved
        val thisMonth = YearMonth.from(today)
        if (remaining.isNegative() || remaining.isZero()) {
            return Projection(ProjectionMethod.PLAN_ONLY, null, null, null, ProjectionReason.REACHED, 0)
        }
        val rate = SavingsMath.netRate(goal.interest)
        val plan = goal.monthlyPlan?.let { SavingsMath.monthsToReach(remaining, it, rate) }?.let { thisMonth.plusMonths(it.toLong()) }

        // 저울(`Simulation`)이 계획을 Δ 옮겨 볼 때 — 다 찬 달 표본마다 Δ 를 더한다(0 아래는 0)
        val zero = Money.zero(goal.targetAmount.currency)
        val samples = fullMonths(history, thisMonth, goal.targetAmount).map { m -> sampleShift?.let { (m + it).let { v -> if (v.isNegative()) zero else v } } ?: m }
        if (samples.size < MIN_HISTORY_MONTHS) {
            return Projection(ProjectionMethod.PLAN_ONLY, null, null, plan, if (goal.monthlyPlan == null) ProjectionReason.NO_PLAN else ProjectionReason.HISTORY_SHORT, samples.size)
        }
        val sorted = samples.map { it.toDecimal() }.sorted()
        val fast = Money.of(quantile(sorted, P90), goal.targetAmount.currency)
        val slow = Money.of(quantile(sorted, P10), goal.targetAmount.currency)
        val early = SavingsMath.monthsToReach(remaining, fast, rate)?.let { thisMonth.plusMonths(it.toLong()) }
        val late = SavingsMath.monthsToReach(remaining, slow, rate)?.let { thisMonth.plusMonths(it.toLong()) }
        return Projection(
            ProjectionMethod.EMPIRICAL_QUANTILE,
            early,
            late,
            plan,
            // 늦은 쪽이 없는 이유는 둘 — 하위 10% 달이 0(건너뛴 달)이거나, 0 은 아니지만 100년 안에 닿지 않거나(리뷰 6차: 둘을 같은 문구로 보였다)
            when {
                late != null -> null
                slow.isZero() || slow.isNegative() -> ProjectionReason.SLOW_SIDE_OPEN
                else -> ProjectionReason.NOT_REACHABLE
            },
            samples.size,
        )
    }

    /**
     * 구간 계산을 감싼다 — 실패하면 500 이 아니라 그 칸만 `degraded` + 계획대로면 X월(`msa-services.md` §10 · `ddd-presentation.md` §5).
     * 계산은 순수 함수라 실패는 결함뿐이지만, 목표 화면 전체를 그 결함 하나로 잃지 않는다. [compute] 는 테스트가 실패를 주입하는 자리
     */
    fun safely(goal: Goal, saved: Money, today: LocalDate, compute: () -> Projection): Projection =
        try {
            compute()
        } catch (e: RuntimeException) {
            degraded(goal, saved, today)
        }

    fun degraded(goal: Goal, saved: Money, today: LocalDate): Projection {
        val plan = runCatching {
            goal.monthlyPlan
                ?.let { SavingsMath.monthsToReach(goal.targetAmount - saved, it, SavingsMath.netRate(goal.interest)) }
                ?.let { YearMonth.from(today).plusMonths(it.toLong()) }
        }.getOrNull()
        return Projection(ProjectionMethod.PLAN_ONLY, null, null, plan, ProjectionReason.DEGRADED, 0)
    }

    /** 첫 적립 달부터 지난달까지 — 빈 달은 0 으로 채운다(건너뛴 달도 기록이다) */
    private fun fullMonths(history: List<MonthlyDeposit>, thisMonth: YearMonth, template: Money): List<Money> {
        val past = history.filter { it.month < thisMonth }
        val first = past.minOfOrNull { it.month } ?: return emptyList()
        val byMonth = past.groupBy { it.month }.mapValues { (_, v) -> v.map { it.amount }.reduce(Money::plus) }
        return generateSequence(first) { it.plusMonths(1) }
            .takeWhile { it < thisMonth }
            .map { byMonth[it] ?: Money.zero(template.currency) }
            .toList()
    }

    /** 분위수 — 선형 보간(R type 7). [sorted] 는 오름차순 */
    fun quantile(sorted: List<BigDecimal>, p: BigDecimal): BigDecimal {
        require(sorted.isNotEmpty())
        if (sorted.size == 1) return sorted[0]
        val h = p.multiply(BigDecimal(sorted.size - 1), MC)
        val lo = h.setScale(0, RoundingMode.FLOOR).toInt()
        val frac = h - BigDecimal(lo)
        val hi = (lo + 1).coerceAtMost(sorted.size - 1)
        return sorted[lo] + (sorted[hi] - sorted[lo]).multiply(frac, MC)
    }
}

enum class MilestoneState(val key: String) {
    /** 계획 월 적립이 없다 */
    NO_PLAN("no_plan"),

    /** 이번 달 넣은 돈이 계획보다 적다 — 사실만. 재촉 문구로 옮기지 않는다 */
    UNDER_PLAN("under_plan"),

    /** 계획 이상 */
    PLAN_MET("plan_met"),

    /** 이미 목표 금액에 닿았다 — 계획 비교를 하지 않는다(다 찬 목표에 "적게 넣었어요"를 띄우지 않는다, 코드 리뷰 2026-11-03) */
    REACHED("reached"),
}

/** 이번 달 이정표(`SRV-REQ-045` FR-8) — 넣은 돈 · 계획 · 차이만 */
data class Milestone(
    val month: YearMonth,
    val deposited: Money,
    val plan: Money?,
    /** 넣은 돈 − 계획. 계획이 없으면 null */
    val difference: Money?,
    val state: MilestoneState,
) {
    companion object {
        fun of(goal: Goal, thisMonthDeposited: Money, today: LocalDate, saved: Money): Milestone {
            val plan = goal.monthlyPlan
            val month = YearMonth.from(today)
            if (goal.status == GoalStatus.COMPLETED || saved >= goal.targetAmount) {
                return Milestone(month, thisMonthDeposited, plan, null, MilestoneState.REACHED)
            }
            if (plan == null) return Milestone(month, thisMonthDeposited, null, null, MilestoneState.NO_PLAN)
            val diff = thisMonthDeposited - plan
            return Milestone(month, thisMonthDeposited, plan, diff, if (diff.isNegative()) MilestoneState.UNDER_PLAN else MilestoneState.PLAN_MET)
        }
    }
}

/** 프레임(`SRV-REQ-045` FR-9) — 진척 50% 전엔 "모은 돈", 뒤엔 "남은 돈"을 앞에. 진척 비율을 화면이 계산하지 않게 서버가 정한다 */
enum class Frame(val key: String) {
    SAVED("saved"),
    REMAINING("remaining"),
    ;

    companion object {
        private val HALF = BigDecimal("0.5")

        fun of(progress: BigDecimal): Frame = if (progress < HALF) SAVED else REMAINING
    }
}

/** 진척 비율(0~1, 넘치면 1) — 소수 그대로. 퍼센트 반올림은 응답 직전(api) */
fun progressOf(saved: Money, target: Money): BigDecimal {
    val ratio = saved.toDecimal().divide(target.toDecimal(), MathContext.DECIMAL64)
    return ratio.min(BigDecimal.ONE).max(BigDecimal.ZERO)
}
