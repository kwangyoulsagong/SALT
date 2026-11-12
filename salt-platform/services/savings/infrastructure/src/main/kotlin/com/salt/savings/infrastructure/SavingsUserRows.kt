package com.salt.savings.infrastructure

import com.salt.support.persistence.UserRowSet
import com.salt.support.persistence.UserRows
import org.jooq.DSLContext

/**
 * 저축의 그 사람 행(`SRV-REQ-048` FR-3 · 4, 서버 S3c) — 자식 먼저(목표 FK 가 연쇄가 아니다).
 * 전망 원장(`projection_issued`)은 덧붙이기만이지만 계정 삭제 때는 지운다(V4 예외 — `salt.erase`).
 * 아웃박스: `ProjectionIssued` 본문엔 사용자 id 가 없고 목표 id 만 있다 — 목표로 고른다(목표보다 먼저).
 */
object SavingsUserRows {
    private const val MY_GOALS = "SELECT id FROM goal WHERE user_id = ?"

    fun of(dsl: DSLContext): UserRows = UserRows(
        service = "savings",
        dsl = dsl,
        sets = listOf(
            UserRowSet("deposit"),
            UserRowSet("item_unit"),
            UserRowSet("projection_issued", "goal_id IN ($MY_GOALS)"),
            UserRows.outbox(
                "EXISTS (SELECT 1 FROM (SELECT ?::text AS u) me WHERE payload->>'userId' = me.u " +
                    "OR payload->>'goalId' IN (SELECT id::text FROM goal WHERE user_id = me.u))",
            ),
            UserRowSet("goal"),
        ),
        notPersonal = UserRows.TECHNICAL,
    )
}
