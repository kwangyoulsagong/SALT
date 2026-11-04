package com.salt.household.application

import com.salt.household.domain.Budgets
import com.salt.household.domain.Expenses
import com.salt.household.domain.HouseholdEvents
import com.salt.household.domain.InvalidMonthClose
import com.salt.household.domain.MonthClose
import com.salt.household.domain.MonthCloseRules
import com.salt.household.domain.MonthCloses
import com.salt.household.domain.ReviewAnswers
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.YearMonth
import java.util.UUID

/**
 * 월 마감(`SRV-REQ-046` FR-9, 가계부 S1b 판단 6 · 7). 처음 닫으면 그달 예산을 붙잡고 `MonthClosed` 를 한 번. 다시 내면 답만 고친다.
 * 처음 닫기는 `ON CONFLICT DO NOTHING` — 두 탭이 동시에 닫아도 사본 · 이벤트는 하나(오류 코드 분기 0). 진 쪽은 답 고치기로 이어진다.
 */
open class CloseMonth(
    private val closes: MonthCloses,
    private val budgets: Budgets,
    private val expenses: Expenses,
    private val events: HouseholdEvents,
    private val clock: Clock,
) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, month: YearMonth, answers: ReviewAnswers): MonthClose {
        if (!MonthCloseRules.closable(month, clock.todayKst())) throw InvalidMonthClose("MONTH_NOT_CLOSABLE", "month cannot be closed yet")
        val now = clock.instant()
        val existing = closes.find(userId, month)
        if (existing == null) {
            val close = MonthClose(UUID.randomUUID(), userId, month, answers, budgets.find(userId), now, now)
            if (closes.insertIfAbsent(close)) {
                events.monthClosed(close, expenses.monthSummary(userId, month).totals)
                return close
            }
        }
        closes.updateAnswers(userId, month, answers, now)
        return closes.find(userId, month)!!
    }
}
