package com.salt.savings.domain

import com.salt.kernel.Money
import java.time.LocalDate

/**
 * 목표 저울(`SRV-REQ-045` FR-7 · FEATURE-012 FR-6) — 목표 사이 월 적립을 옮기면 목표마다 도달 구간이 어떻게 바뀌나. **저장하지 않는다.**
 *
 * 모형: 계획이 Δ 바뀌면 앞으로의 달마다 Δ 를 더 · 덜 넣는다고 본다 — 계획 도달 월은 새 계획으로, 경험 구간은 지난 다 찬 달 표본마다 Δ 를
 * 더해(0 아래는 0) 다시 계산한다. 표본을 그대로 두면 "계획만 바꾸고 구간은 그대로"가 되어 저울이 아무것도 보여 주지 않는다.
 */
data class SimulationRow(val goal: Goal, val before: Projection, val after: Projection, val monthlyBefore: Money?, val monthlyAfter: Money?)

object Simulation {
    /** 한 번에 옮겨 볼 목표 수 상한 — 목록 화면 하나 분량 */
    const val MAX_GOALS = 20

    fun row(goal: Goal, newMonthly: Money?, saved: Money, history: List<MonthlyDeposit>, today: LocalDate): SimulationRow {
        val before = ProjectionEngine.project(goal, saved, history, today)
        if (newMonthly == null || newMonthly == goal.monthlyPlan) return SimulationRow(goal, before, before, goal.monthlyPlan, goal.monthlyPlan)
        if (newMonthly.isNegative() || newMonthly.isZero()) throw InvalidGoal("GOAL_MONTHLY_INVALID", "monthly must be positive")
        val delta = newMonthly - (goal.monthlyPlan ?: Money.zero(newMonthly.currency))
        val after = ProjectionEngine.project(goal.withMonthlyPlan(newMonthly), saved, history, today, sampleShift = delta)
        return SimulationRow(goal, before, after, goal.monthlyPlan, newMonthly)
    }
}
