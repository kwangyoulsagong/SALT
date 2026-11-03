package com.salt.savings.infrastructure

import com.salt.savings.domain.Goal
import com.salt.savings.domain.IssuedProjection
import com.salt.savings.domain.SavingsEvents
import com.salt.support.messaging.OutboxWriter
import java.time.Instant

/**
 * 도메인 이벤트 → 계약 본문(`contracts/events/savings.*.json`, `SRV-REQ-045` FR-18). 계약 모양은 여기 한 곳에서 만든다.
 * 금액은 브로커 안에서만(`msa-services.md` §5) — 로그 · 추적 속성에 싣지 않는다. 금액은 문자열(NUMERIC 그대로, 지수 표기 없이).
 */
class OutboxSavingsEvents(private val outbox: OutboxWriter) : SavingsEvents {
    override fun goalCreated(goal: Goal) {
        outbox.append(
            GOAL_CREATED,
            mapOf(
                "goalId" to goal.id.toString(),
                "userId" to goal.userId,
                "template" to goal.template.key,
                "targetAmount" to goal.targetAmount.toStorageString(),
                "targetDate" to goal.targetDate?.toString(),
                "createdAt" to goal.createdAt.toString(),
            ),
        )
    }

    override fun goalReached(goal: Goal, reachedAt: Instant) {
        outbox.append(
            GOAL_REACHED,
            mapOf("goalId" to goal.id.toString(), "userId" to goal.userId, "template" to goal.template.key, "reachedAt" to reachedAt.toString()),
        )
    }

    override fun projectionIssued(issued: IssuedProjection) {
        val p = issued.projection
        outbox.append(
            PROJECTION_ISSUED,
            mapOf(
                "projectionId" to issued.id.toString(),
                "goalId" to issued.goalId.toString(),
                "issuedAt" to issued.issuedAt.toString(),
                "method" to p.method.key,
                "earlyMonth" to p.early?.toString(),
                "lateMonth" to p.late?.toString(),
                "planMonth" to p.plan?.toString(),
                "reason" to p.reason,
                "monthsOfHistory" to p.monthsOfHistory,
            ),
        )
    }

    companion object {
        const val GOAL_CREATED = "savings.GoalCreated"
        const val GOAL_REACHED = "savings.GoalReached"
        const val PROJECTION_ISSUED = "savings.ProjectionIssued"
    }
}
