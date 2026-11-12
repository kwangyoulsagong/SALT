package com.salt.ping.infrastructure

import com.salt.support.persistence.UserRowSet
import com.salt.support.persistence.UserRows
import org.jooq.DSLContext

/** 종단 확인 서비스의 그 사람 행(`SRV-REQ-048` FR-3 · 4, 서버 S3c) — 확인 요청 · 그 메아리 */
object PingUserRows {
    fun of(dsl: DSLContext): UserRows = UserRows(
        service = "ping",
        dsl = dsl,
        sets = listOf(
            UserRowSet("ping_echo", "check_id IN (SELECT id FROM ping_check WHERE user_id = ?)"),
            UserRows.outbox("payload->>'checkId' IN (SELECT id::text FROM ping_check WHERE user_id = ?)"),
            UserRowSet("ping_check"),
        ),
        notPersonal = UserRows.TECHNICAL,
    )
}
