package com.salt.savings.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import java.time.Instant
import java.time.YearMonth

interface Goals {
    fun save(goal: Goal)

    /** 남의 목표는 없는 것과 같다 — 사용자 조건이 쿼리에 들어간다(`auth-security.md`) */
    fun findOwned(id: GoalId, userId: String): Goal?

    /** [findOwned] + 행 잠금(`FOR UPDATE`) — 쓰기 트랜잭션에서만. 동시 적립이 "달성"을 두 번 내지 않게 */
    fun lockOwned(id: GoalId, userId: String): Goal?

    /** 보관하지 않은 목표 — 진행 중 먼저, 만든 순서 */
    fun listOwned(userId: String): List<Goal>

    fun markCompleted(id: GoalId, at: Instant)
}

interface Deposits {
    fun add(deposit: Deposit)

    /** 목표마다 집계 — 쿼리 한 번(`SRV-REQ-045` FR-19). 기록 없는 목표는 결과에 없다 */
    fun totalsByGoal(userId: String, thisMonth: YearMonth): Map<GoalId, DepositTotals>

    /** 월별 적립 합 — 구간 표본. 가져온 잔액(`IMPORTED_BALANCE`)은 빼고 */
    fun monthly(goalId: GoalId): List<MonthlyDeposit>

    /** 최근 적립 — 상세 화면 목록 */
    fun recent(goalId: GoalId, limit: Int): List<Deposit>
}

interface Projections {
    fun issue(issued: IssuedProjection)

    /** 목표마다 가장 최근 발행 하나 — 쿼리 한 번 */
    fun latestByGoal(userId: String): Map<GoalId, IssuedProjection>
}

/** 발행 포트 — 구현은 아웃박스. 유스케이스와 같은 트랜잭션에서 불린다. 계약 `contracts/events/savings.*.json` */
interface SavingsEvents {
    fun goalCreated(goal: Goal)

    fun goalReached(goal: Goal, reachedAt: Instant)

    fun projectionIssued(issued: IssuedProjection)
}

class GoalNotFound(id: String) : DomainError("GOAL_NOT_FOUND", ErrorKind.NOT_FOUND, "Goal not found", mapOf("goalId" to id))

class InvalidGoal(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)
