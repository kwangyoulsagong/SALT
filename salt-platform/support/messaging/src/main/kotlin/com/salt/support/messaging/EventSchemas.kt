package com.salt.support.messaging

import com.networknt.schema.Schema
import com.networknt.schema.SchemaRegistry
import com.networknt.schema.SpecificationVersion
import tools.jackson.databind.JsonNode
import java.util.concurrent.ConcurrentHashMap

/**
 * 이벤트 본문 검증 — 루트 `contracts/events/<service>.<Event>.json`(JSON Schema 2020-12) 한 곳이 계약이다(`SRV-REQ-044` FR-3).
 * 빌드가 그 파일을 클래스패스 `events/` 에 싣는다(`support/messaging/build.gradle.kts`).
 *
 * **쓰기 시점에 검증한다** — 테스트에서만 보면 운영에서 스키마 밖 본문이 브로커로 나가고, BFF · Python 구독자가 먼저 깨진다.
 * 어긋나면 던져서 아웃박스 쓰기와 함께 업무 트랜잭션이 롤백된다.
 */
class EventSchemas {
    private val registry = SchemaRegistry.withDefaultDialect(SpecificationVersion.DRAFT_2020_12)
    private val cache = ConcurrentHashMap<String, Schema>()

    fun validate(eventType: String, payload: JsonNode) {
        val schema = cache.computeIfAbsent(eventType, ::load)
        val errors = schema.validate(payload)
        if (errors.isNotEmpty()) {
            throw EventSchemaViolation(eventType, errors.joinToString("; ") { "${it.instanceLocation}: ${it.message}" })
        }
    }

    private fun load(eventType: String): Schema {
        require(eventType.matches(EVENT_TYPE)) { "이벤트 이름은 <service>.<Event>: $eventType" }
        val stream = javaClass.classLoader.getResourceAsStream("events/$eventType.json")
            ?: throw EventSchemaViolation(eventType, "스키마 파일 없음 — contracts/events/$eventType.json 을 먼저 만든다")
        return stream.use { registry.getSchema(it) }
    }

    companion object {
        val EVENT_TYPE = Regex("[a-z]+\\.[A-Z][A-Za-z]+")
    }
}

class EventSchemaViolation(eventType: String, reason: String) :
    IllegalArgumentException("이벤트 $eventType 본문이 계약과 다르다: $reason")
