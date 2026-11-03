package com.salt.support.messaging

import io.micrometer.core.instrument.Gauge
import io.micrometer.core.instrument.MeterRegistry
import org.jooq.impl.DSL
import org.springframework.amqp.core.AmqpAdmin

/**
 * 운영 점검 지표(`SRV-REQ-044` FR-8) — 쌓이면 사람이 봐야 하는 두 수.
 *
 * - `salt.events.dead_letters{queue}` — 구독이 3회 재시도 뒤 버린 메시지 수(데드레터 큐 깊이)
 * - `salt.outbox.dead{service}` — 릴레이가 포기한 아웃박스 이벤트 수(`dead_at`)
 *
 * 0 이 정상이다. 수집처 · 경보는 배포 환경 몫(`OPS-001`) — 지금은 `/actuator/metrics` 로 본다.
 */
object EventGauges {
    const val DEAD_LETTERS = "salt.events.dead_letters"
    const val OUTBOX_DEAD = "salt.outbox.dead"

    fun register(registry: MeterRegistry, admin: AmqpAdmin, deadLetterQueues: List<String>, sources: List<OutboxSource>) {
        deadLetterQueues.forEach { queue ->
            Gauge.builder(DEAD_LETTERS) { (admin.getQueueInfo(queue)?.messageCount ?: 0).toDouble() }
                .tag("queue", queue)
                .description("구독이 재시도 뒤 버린 메시지 수")
                .register(registry)
        }
        sources.forEach { source ->
            Gauge.builder(OUTBOX_DEAD) { source.dsl.fetchCount(DSL.table("outbox"), DSL.field("dead_at").isNotNull).toDouble() }
                .tag("service", source.service)
                .description("릴레이가 포기한 아웃박스 이벤트 수")
                .register(registry)
        }
    }
}
