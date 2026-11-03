package com.salt.support.messaging

import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.amqp.AmqpRejectAndDontRequeueException
import org.springframework.amqp.core.Message
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.util.UUID

/** 받은 이벤트 — 메시지 속성에서 ID · 이름, 본문에서 payload. 모양이 틀리면 재시도 없이 데드레터로(고쳐질 일이 없다). */
data class IncomingEvent(val eventId: UUID, val eventType: String, val payload: JsonNode) {
    companion object {
        fun from(message: Message, jsonMapper: JsonMapper): IncomingEvent {
            val props = message.messageProperties
            val id = props.messageId?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: throw AmqpRejectAndDontRequeueException("message_id 없음")
            val type = props.type ?: throw AmqpRejectAndDontRequeueException("type 없음")
            val payload = runCatching { jsonMapper.readTree(message.body) }.getOrNull()
                ?: throw AmqpRejectAndDontRequeueException("본문이 JSON 이 아니다")
            return IncomingEvent(id, type, payload)
        }
    }
}

/**
 * 구독자 멱등 — `processed_event(event_id)` 에 먼저 넣어 본다(`SRV-REQ-044` FR-2). **처리와 같은 트랜잭션에서** 부른다.
 *
 * 중복은 오류 코드를 잡아 판단하지 않는다 — `ON CONFLICT DO NOTHING` 의 영향 행 수(1 = 처음, 0 = 이미 처리)로 정한다.
 */
object ProcessedEvents {
    fun firstTime(dsl: DSLContext, eventId: UUID, eventType: String): Boolean =
        dsl.insertInto(DSL.table("processed_event"))
            .columns(DSL.field("event_id"), DSL.field("event_type"))
            .values(eventId, eventType)
            .onConflictDoNothing()
            .execute() == 1
}
