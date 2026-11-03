package com.salt.ping.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import java.time.Clock
import java.time.Instant
import java.util.UUID

/**
 * `ping` — **기능 없는 서비스**다(`SRV-REQ-043` FR-13). 인증 → DB 쓰기 · 읽기 → 아웃박스 → 브로커 → 구독 → 추적 ID 가
 * 실제 서비스와 같은 길로 지나가는지 보는 점검용. 새 서비스는 이 네 모듈을 본떠 만든다.
 */
@JvmInline
value class PingCheckId(val value: UUID) {
    override fun toString(): String = value.toString()

    companion object {
        fun parse(raw: String): PingCheckId? = runCatching { PingCheckId(UUID.fromString(raw)) }.getOrNull()
    }
}

class PingCheck(val id: PingCheckId, val userId: String, val checkedAt: Instant) {
    companion object {
        fun record(userId: String, clock: Clock): PingCheck = PingCheck(PingCheckId(UUID.randomUUID()), userId, clock.instant())
    }
}

/** 구독자가 받은 기록 — 이벤트가 실제로 돌아왔는지 · 어느 추적 아래였는지. */
data class PingEcho(val checkId: PingCheckId, val traceId: String?, val receivedAt: Instant)

/** 도메인 이벤트. 계약 파일 `contracts/events/ping.PingRecorded.json` 과 같은 두 값. */
data class PingRecorded(val checkId: PingCheckId, val checkedAt: Instant)

interface PingChecks {
    fun save(check: PingCheck)

    fun countFor(userId: String): Long

    /** 남의 기록은 없는 것과 같다 — 사용자 조건이 쿼리에 들어간다(`auth-security.md`). */
    fun findOwned(id: PingCheckId, userId: String): PingCheck?
}

interface PingEchoes {
    /** 처음 받은 이벤트면 기록하고 true, 이미 처리한 이벤트면 아무것도 하지 않고 false(`SRV-REQ-044` FR-2). */
    fun recordOnce(eventId: UUID, eventType: String, echo: PingEcho): Boolean

    fun find(checkId: PingCheckId): PingEcho?
}

/** 발행 포트 — 구현은 아웃박스. 유스케이스와 같은 트랜잭션에서 불린다. */
interface PingEvents {
    fun recorded(event: PingRecorded)
}

class PingCheckNotFound(id: String) : DomainError("PING_CHECK_NOT_FOUND", ErrorKind.NOT_FOUND, "Ping check not found", mapOf("checkId" to id))
