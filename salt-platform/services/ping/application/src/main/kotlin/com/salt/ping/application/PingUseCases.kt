package com.salt.ping.application

import com.salt.ping.domain.PingCheck
import com.salt.ping.domain.PingCheckId
import com.salt.ping.domain.PingCheckNotFound
import com.salt.ping.domain.PingChecks
import com.salt.ping.domain.PingEcho
import com.salt.ping.domain.PingEchoes
import com.salt.ping.domain.PingEvents
import com.salt.ping.domain.PingRecorded
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.util.UUID

/** ping 서비스의 트랜잭션 매니저 이름 — 서비스마다 DB 계정이 달라 매니저도 따로다(`ServiceDatabase`). */
const val PING_TX = "pingTx"

/** 기록 하나 + 이벤트 하나를 **한 트랜잭션**에. 이벤트 쓰기가 실패하면 기록도 남지 않는다(아웃박스). */
open class RecordPing(
    private val checks: PingChecks,
    private val events: PingEvents,
    private val clock: Clock,
) {
    data class Result(val checkId: PingCheckId, val previousCount: Long)

    @Transactional(transactionManager = PING_TX)
    open fun execute(userId: String): Result {
        val previous = checks.countFor(userId)
        val check = PingCheck.record(userId, clock)
        checks.save(check)
        events.recorded(PingRecorded(check.id, check.checkedAt))
        return Result(check.id, previous)
    }
}

open class GetPing(
    private val checks: PingChecks,
    private val echoes: PingEchoes,
) {
    data class View(val check: PingCheck, val echo: PingEcho?)

    @Transactional(transactionManager = PING_TX, readOnly = true)
    open fun execute(userId: String, rawId: String): View {
        val id = PingCheckId.parse(rawId) ?: throw PingCheckNotFound(rawId)
        val check = checks.findOwned(id, userId) ?: throw PingCheckNotFound(rawId)
        return View(check, echoes.find(id))
    }
}

/** 구독 쪽 — `ping.PingRecorded` 를 받아 되울림을 남긴다. 같은 이벤트가 두 번 와도 한 번분(멱등). */
open class EchoPingRecorded(
    private val echoes: PingEchoes,
    private val clock: Clock,
) {
    @Transactional(transactionManager = PING_TX)
    open fun execute(eventId: UUID, eventType: String, checkId: PingCheckId, traceId: String?): Boolean =
        echoes.recordOnce(eventId, eventType, PingEcho(checkId, traceId, Instant.now(clock)))
}
