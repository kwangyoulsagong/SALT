package com.salt.support.messaging

import org.jooq.DSLContext
import org.jooq.JSONB
import org.jooq.impl.DSL
import org.springframework.transaction.support.TransactionSynchronizationManager
import tools.jackson.databind.json.JsonMapper
import java.time.Clock
import java.time.OffsetDateTime
import java.util.UUID

/**
 * 트랜잭셔널 아웃박스 쓰기 — 서비스 하나에 하나. 업무 행과 **같은 트랜잭션**에 `outbox` 행을 쓴다(`SRV-REQ-044` FR-1).
 * 롤백이면 이벤트도 0 이다. 브로커로 보내는 건 [OutboxRelay] 몫이고 여기서는 외부 I/O 가 없다.
 *
 * ## 왜 Spring Modulith 이벤트 발행 기록(`event_publication`)이 아닌가
 *
 * FR-1 은 Modulith 발행 기록 · 외부화를 쓰라고 적었다. 그 표는 **프로세스에 하나**이고 하나의 DataSource 트랜잭션에 묶인다.
 * 여기는 서비스마다 계정 · 스키마 · 트랜잭션 매니저가 따로라(`DB-REQ-036` FR-1), 업무 쓰기(서비스 계정)와 발행 기록(공용 계정)이
 * 같은 트랜잭션이 될 수 없다 — 그러면 아웃박스가 아니다. 그래서 표를 서비스 스키마마다 두고(`outbox`) 릴레이를 직접 둔다.
 * Modulith 는 경계 검증(`verify()`)에 쓴다. 정정은 `SRV-REQ-044` FR-1.
 */
class OutboxWriter(
    val service: String,
    private val dsl: DSLContext,
    private val schemas: EventSchemas,
    private val jsonMapper: JsonMapper,
    private val traceParent: TraceParent,
    private val clock: Clock,
) {
    /** @return 이벤트 ID — 구독자 멱등 키(`processed_event.event_id`)가 된다 */
    fun append(eventType: String, payload: Any): UUID {
        require(eventType.startsWith("$service.")) { "$service 는 자기 이벤트만 발행한다: $eventType" }
        check(TransactionSynchronizationManager.isActualTransactionActive()) {
            "아웃박스는 업무 트랜잭션 안에서만 쓴다 — 밖에서 쓰면 업무 행과 이벤트가 따로 남는다"
        }
        val body = jsonMapper.valueToTree<tools.jackson.databind.JsonNode>(payload)
        schemas.validate(eventType, body)

        val eventId = UUID.randomUUID()
        dsl.insertInto(DSL.table("outbox"))
            .columns(
                DSL.field("event_id"),
                DSL.field("event_type"),
                DSL.field("payload"),
                DSL.field("trace_parent"),
                DSL.field("occurred_at"),
            )
            .values(eventId, eventType, JSONB.valueOf(jsonMapper.writeValueAsString(body)), traceParent.current(), OffsetDateTime.now(clock))
            .execute()
        return eventId
    }
}
