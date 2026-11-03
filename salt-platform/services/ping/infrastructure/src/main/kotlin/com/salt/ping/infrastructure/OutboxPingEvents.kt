package com.salt.ping.infrastructure

import com.salt.ping.domain.PingEvents
import com.salt.ping.domain.PingRecorded
import com.salt.support.messaging.OutboxWriter

/** 도메인 이벤트 → 계약 본문(`contracts/events/ping.PingRecorded.json`). 계약 모양은 여기 한 곳에서 만든다. */
class OutboxPingEvents(private val outbox: OutboxWriter) : PingEvents {
    override fun recorded(event: PingRecorded) {
        outbox.append(EVENT_TYPE, mapOf("checkId" to event.checkId.toString(), "checkedAt" to event.checkedAt.toString()))
    }

    companion object {
        const val EVENT_TYPE = "ping.PingRecorded"
    }
}
