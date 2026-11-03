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

    /** 목표가 하나라도 있나 — 온보딩 `set_plan` 프로브용(보관한 것 포함, 쿼리 1) */
    fun existsFor(userId: String): Boolean
}

interface Deposits {
    fun add(deposit: Deposit)

    /** 목표마다 집계 — 쿼리 한 번(`SRV-REQ-045` FR-19). 기록 없는 목표는 결과에 없다 */
    fun totalsByGoal(userId: String, thisMonth: YearMonth): Map<GoalId, DepositTotals>

    /** 목표 하나의 집계 — 상세 · 쓰기 응답이 사용자 전체를 훑지 않게(코드 리뷰 2026-11-03) */
    fun totalsFor(goalId: GoalId, thisMonth: YearMonth): DepositTotals?

    /** 사용자 목표 전부의 월별 적립 — 목록이 구간을 지금 기준으로 계산하는 데 쓴다(쿼리 1) */
    fun monthlyByGoal(userId: String): Map<GoalId, List<MonthlyDeposit>>

    /** 월별 적립 합 — 구간 표본. 가져온 잔액(`IMPORTED_BALANCE`)은 빼고 */
    fun monthly(goalId: GoalId): List<MonthlyDeposit>

    /** 최근 적립 — 상세 화면 목록 */
    fun recent(goalId: GoalId, limit: Int): List<Deposit>
}

interface Projections {
    /** 발행 기록은 채점(`FC-REQ-024`) 보관용 — 화면은 읽지 않고 늘 지금 기준으로 다시 계산한다(코드 리뷰 2026-11-03: 발행본은 시간이 지나면 낡는다) */
    fun issue(issued: IssuedProjection)
}

/** 발행 포트 — 구현은 아웃박스. 유스케이스와 같은 트랜잭션에서 불린다. 계약 `contracts/events/savings.*.json` */
interface SavingsEvents {
    fun goalCreated(goal: Goal)

    fun goalReached(goal: Goal, reachedAt: Instant)

    fun projectionIssued(issued: IssuedProjection)
}

class GoalNotFound(id: String) : DomainError("GOAL_NOT_FOUND", ErrorKind.NOT_FOUND, "Goal not found", mapOf("goalId" to id))

class InvalidGoal(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)
