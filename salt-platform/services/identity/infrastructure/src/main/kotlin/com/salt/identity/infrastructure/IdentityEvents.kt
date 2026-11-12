package com.salt.identity.infrastructure

import com.salt.support.messaging.OutboxWriter
import java.time.Instant

/** 계약 본문(`contracts/events/identity.*.json`)은 여기 한 곳에서 만든다. 개인 식별 정보(이메일 · 별명) 0 */
class IdentityEvents(private val outbox: OutboxWriter) {
    fun userRegistered(userId: String, at: Instant) {
        outbox.append(USER_REGISTERED, mapOf("userId" to userId, "registeredAt" to at.toString()))
    }

    companion object {
        const val USER_REGISTERED = "identity.UserRegistered"
    }
}
