package com.salt.household.infrastructure

import com.salt.household.domain.Expense
import com.salt.household.domain.FixedCostIncrease
import com.salt.household.domain.HouseholdEvents
import com.salt.household.domain.IssuedLanding
import com.salt.household.domain.MonthClose
import com.salt.household.domain.MonthTotals
import com.salt.support.messaging.OutboxWriter

/**
 * 도메인 이벤트 → 계약 본문(`contracts/events/household.*.json`, `SRV-REQ-046` FR-21). 계약 모양은 여기 한 곳에서 만든다.
 * 금액은 브로커 안에서만(`msa-services.md` §5) — 로그 · 추적 속성에 싣지 않는다. 금액은 문자열(NUMERIC 그대로).
 * 가맹점 · 메모는 싣지 않는다 — 구독자(저축 지연 · 채점)가 쓰지 않는 개인 정보다.
 */
class OutboxHouseholdEvents(private val outbox: OutboxWriter) : HouseholdEvents {
    override fun expenseRecorded(expense: Expense) {
        outbox.append(
            EXPENSE_RECORDED,
            mapOf(
                "expenseId" to expense.id.toString(),
                "userId" to expense.userId,
                "amount" to expense.amount.toStorageString(),
                "spentOn" to expense.spentOn.toString(),
                "category" to expense.category.key,
                "precision" to expense.precision.key,
                "inputKind" to expense.inputKind.key,
                "recordedAt" to expense.createdAt.toString(),
            ),
        )
    }

    override fun landingIssued(issued: IssuedLanding) {
        val l = issued.landing
        outbox.append(
            LANDING_ISSUED,
            mapOf(
                "landingId" to issued.id.toString(),
                "userId" to issued.userId,
                "month" to l.month.toString(),
                "issuedOn" to issued.issuedOn.toString(),
                "method" to l.method.key,
                "low" to l.low?.toStorageString(),
                "high" to l.high?.toStorageString(),
                "spentSoFar" to l.spentSoFar.toStorageString(),
                "scheduled" to l.scheduled.toStorageString(),
                "reason" to l.reason,
                "daysOfHistory" to l.daysOfHistory,
            ),
        )
    }

    /** 답 글은 싣지 않는다(가계부 S1b 판단 7) — 숫자 · 달만 */
    override fun monthClosed(close: MonthClose, totals: MonthTotals) {
        outbox.append(
            MONTH_CLOSED,
            mapOf(
                "closeId" to close.id.toString(),
                "userId" to close.userId,
                "month" to close.month.toString(),
                "total" to totals.total.toStorageString(),
                "exact" to totals.exact.toStorageString(),
                "approx" to totals.approx.toStorageString(),
                "count" to totals.count,
                "budgetTotal" to close.budget?.total?.toStorageString(),
                "closedAt" to close.closedAt.toString(),
            ),
        )
    }

    /** 가맹점 · 메모 0 — 분류 · 금액 · 달만(가계부 S1e 판단 5). 구독 예정: content 때맞춘 팁(S2) */
    override fun fixedCostIncreased(increase: FixedCostIncrease) {
        outbox.append(
            FIXED_COST_INCREASED,
            mapOf(
                "increaseId" to increase.id.toString(),
                "userId" to increase.userId,
                "month" to increase.month.toString(),
                "category" to increase.category.key,
                "previous" to increase.previous.toStorageString(),
                "current" to increase.current.toStorageString(),
                "detectedAt" to increase.detectedAt.toString(),
            ),
        )
    }

    companion object {
        const val EXPENSE_RECORDED = "household.ExpenseRecorded"
        const val LANDING_ISSUED = "household.LandingIssued"
        const val MONTH_CLOSED = "household.MonthClosed"
        const val FIXED_COST_INCREASED = "household.FixedCostIncreased"
    }
}
