package com.salt.ping.infrastructure

import com.salt.ping.domain.PingCheck
import com.salt.ping.domain.PingCheckId
import com.salt.ping.domain.PingChecks
import com.salt.ping.domain.PingEcho
import com.salt.ping.domain.PingEchoes
import com.salt.ping.infrastructure.jooq.Tables.PING_CHECK
import com.salt.ping.infrastructure.jooq.Tables.PING_ECHO
import com.salt.support.messaging.ProcessedEvents
import org.jooq.DSLContext
import java.time.ZoneOffset
import java.util.UUID

class JooqPingChecks(private val dsl: DSLContext) : PingChecks {
    override fun save(check: PingCheck) {
        dsl.insertInto(PING_CHECK)
            .set(PING_CHECK.ID, check.id.value)
            .set(PING_CHECK.USER_ID, check.userId)
            .set(PING_CHECK.CHECKED_AT, check.checkedAt.atOffset(ZoneOffset.UTC))
            .execute()
    }

    override fun countFor(userId: String): Long =
        dsl.fetchCount(PING_CHECK, PING_CHECK.USER_ID.eq(userId)).toLong()

    override fun findOwned(id: PingCheckId, userId: String): PingCheck? =
        dsl.selectFrom(PING_CHECK)
            .where(PING_CHECK.ID.eq(id.value).and(PING_CHECK.USER_ID.eq(userId)))
            .fetchOne { PingCheck(PingCheckId(it.id), it.userId, it.checkedAt.toInstant()) }
}

class JooqPingEchoes(private val dsl: DSLContext) : PingEchoes {
    /** 멱등 키 먼저(`processed_event`), 처음일 때만 되울림 — 두 쓰기가 유스케이스 트랜잭션 하나에 든다. */
    override fun recordOnce(eventId: UUID, eventType: String, echo: PingEcho): Boolean {
        val first = ProcessedEvents.firstTime(dsl, eventId, eventType)
        if (!first) return false
        dsl.insertInto(PING_ECHO)
            .set(PING_ECHO.CHECK_ID, echo.checkId.value)
            .set(PING_ECHO.TRACE_ID, echo.traceId)
            .set(PING_ECHO.RECEIVED_AT, echo.receivedAt.atOffset(ZoneOffset.UTC))
            .execute()
        return true
    }

    override fun find(checkId: PingCheckId): PingEcho? =
        dsl.selectFrom(PING_ECHO)
            .where(PING_ECHO.CHECK_ID.eq(checkId.value))
            .fetchOne { PingEcho(PingCheckId(it.checkId), it.traceId, it.receivedAt.toInstant()) }
}
