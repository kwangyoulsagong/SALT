package com.salt.ping.api

import com.salt.ping.application.EchoPingRecorded
import com.salt.ping.domain.PingCheckId
import com.salt.support.messaging.IncomingEvent
import com.salt.support.messaging.TraceParent
import org.springframework.amqp.AmqpRejectAndDontRequeueException
import org.springframework.amqp.core.Message
import org.springframework.amqp.rabbit.annotation.RabbitListener
import tools.jackson.databind.json.JsonMapper

/**
 * `ping.PingRecorded` 구독 — 다른 서비스가 이벤트를 받는 자리를 흉내 낸다. 리스너는 유스케이스 한 번 호출만(`kotlin-platform.md` §3 워커 줄).
 * 리스너 관측(`observation-enabled`)이 메시지의 traceparent 를 이어받아, 여기서 보이는 추적 ID 가 요청의 추적 ID 와 같다.
 */
class PingRecordedListener(
    private val echo: EchoPingRecorded,
    private val jsonMapper: JsonMapper,
    private val traceParent: TraceParent,
) {
    @RabbitListener(queues = [QUEUE])
    fun on(message: Message) {
        val event = IncomingEvent.from(message, jsonMapper)
        val checkId = event.payload.path("checkId").asString(null)?.let(PingCheckId::parse)
            ?: throw AmqpRejectAndDontRequeueException("checkId 없음 ${event.eventId}")
        echo.execute(event.eventId, event.eventType, checkId, traceParent.current()?.split("-")?.getOrNull(1))
    }

    companion object {
        const val SUBSCRIBER = "ping"
        const val EVENT_TYPE = "ping.PingRecorded"
        const val QUEUE = "$SUBSCRIBER.$EVENT_TYPE"
    }
}
