package com.salt.household.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import com.salt.kernel.Money
import java.time.LocalDate
import java.time.YearMonth

interface Expenses {
    fun add(expenses: List<Expense>)

    /** 본인 것만 지운다 — 지운 행 수(남의 것 · 없는 것은 0) */
    fun delete(id: ExpenseId, userId: String): Int

    /** 한 달 지출 — 날짜 최신순, [limit] 건까지(화면 목록) */
    fun inMonth(userId: String, month: YearMonth, limit: Int): List<Expense>

    /** 한 달 합 — 정확/대략 · 분류별을 **한 문장**으로 */
    fun monthSummary(userId: String, month: YearMonth): MonthSummary

    /** 날짜별 합 `[from, to]` — 착지 표본. 기록 없는 날은 빠진다(엔진이 0 으로 채운다) */
    fun dailyTotals(userId: String, from: LocalDate, to: LocalDate): Map<LocalDate, Money>

    /** 첫 기록 날짜 — 착지 표본 시작 */
    fun firstSpentOn(userId: String): LocalDate?

    /** 최근 [days] 일 가맹점 — 횟수 많은 순, 같은 가맹점은 마지막 분류 · 금액 */
    fun recentMerchants(userId: String, since: LocalDate, limit: Int): List<RecentMerchant>
}

data class MonthSummary(val totals: MonthTotals, val byCategory: Map<Category, Money>)

data class RecentMerchant(val merchant: String, val category: Category, val lastAmount: Money, val count: Int)

interface Budgets {
    fun find(userId: String): Budget?

    /** 지금 예산을 통째로 바꾼다(봉투 지우고 다시) — 한 트랜잭션 */
    fun replace(budget: Budget)
}

interface Landings {
    /** 하루 한 번 — 이미 그날 발행했으면 아무것도 쓰지 않고 false(`ON CONFLICT DO NOTHING`, 오류 코드 분기 0) */
    fun issueOncePerDay(issued: IssuedLanding): Boolean

    /** [month] 에 [onOrBefore] 까지 낸 마지막 발행 */
    fun lastIssued(userId: String, month: YearMonth, onOrBefore: LocalDate): IssuedLanding?
}

/** 발행 포트 — 구현은 아웃박스. 유스케이스와 같은 트랜잭션에서 불린다. 계약 `contracts/events/household.*.json` */
interface HouseholdEvents {
    fun expenseRecorded(expense: Expense)

    fun landingIssued(issued: IssuedLanding)
}

class ExpenseNotFound(id: String) : DomainError("EXPENSE_NOT_FOUND", ErrorKind.NOT_FOUND, "Expense not found", mapOf("expenseId" to id))

class InvalidExpense(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)

class InvalidBudget(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)
