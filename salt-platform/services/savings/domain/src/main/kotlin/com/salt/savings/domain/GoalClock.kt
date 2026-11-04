package com.salt.savings.domain

import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.RoundingMode

/**
 * 목표 시계(`SRV-REQ-045` FR-17 · FEATURE-013 FR-8) — "이 지출만큼 덜 모으면 목표가 며칠 늦어지나". 가계부가 지출을 적을 때 BFF 가 묻는다
 * (가계부 슬라이스 판단 1 — 서비스끼리 부르지 않는다). **사실 한 줄**이다: 재촉 · 평가 상태가 없다.
 *
 * 늦어지는 날 = 지출 ÷ (월 적립 ÷ 한 달 평균 일수), 반올림 한 번. 월 적립은 계획 월 적립, 기한 모드면 지금 기준으로 다시 계산한 월 적립.
 */
object GoalClock {
    /** 365.25 ÷ 12 — 달마다 일수가 달라 평균으로 */
    val DAYS_PER_MONTH = BigDecimal("30.4375")

    const val NO_ACTIVE_GOAL = "no_active_goal"
    const val NO_PLAN = "no_plan"

    fun delayDays(amount: Money, monthlyPace: Money): Long =
        amount.toDecimal().multiply(DAYS_PER_MONTH).divide(monthlyPace.toDecimal(), 0, RoundingMode.HALF_UP).longValueExact()
}
