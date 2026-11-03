package com.salt.support.messaging

import net.javacrumbs.shedlock.core.DefaultLockingTaskExecutor
import net.javacrumbs.shedlock.core.LockConfiguration
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.slf4j.LoggerFactory
import org.springframework.amqp.core.MessageBuilder
import org.springframework.amqp.core.MessageProperties
import org.springframework.amqp.rabbit.connection.CorrelationData
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.scheduling.annotation.Scheduled
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.OffsetDateTime
import java.util.UUID
import java.util.concurrent.TimeUnit
import javax.sql.DataSource

/** 릴레이가 도는 서비스 하나 — 서비스의 `infrastructure` 가 빈으로 내놓는다. */
class OutboxSource(val service: String, val dsl: DSLContext, val dataSource: DataSource)

/**
 * 아웃박스 → RabbitMQ. 서비스마다 ShedLock 하나(`<service>` 스키마의 `shedlock` 표)라 인스턴스가 늘어도 한 곳만 보낸다(FR-8 · `SRV-REQ-043`).
 *
 * - **브로커 I/O 는 DB 트랜잭션 밖** — 읽고(짧게) → 보내고(확인 받고) → 표시(짧게)(`kotlin-platform.md` §3 트랜잭션 줄)
 * - 확인(confirm)을 받은 뒤에만 `published_at`. 보낸 뒤 표시 전에 죽으면 같은 이벤트가 한 번 더 간다 → 구독자가 멱등이다(FR-2)
 * - 실패하면 그 이벤트에서 멈춘다(순서 보존) · `attempts` 를 올린다. 다음 회차에 다시. **[maxAttempts] 번 실패하면 `dead_at`** 을 채우고
 *   건너뛴다(error 로그) — 영원히 실패하는 이벤트 하나가 그 서비스의 뒤 이벤트를 전부 막지 않게
 * - 순서 = `seq`(쓴 순서, identity). `occurred_at` 은 같은 트랜잭션 안에서 같을 수 있다
 * - 로그에 본문 0 — 이벤트 ID · 이름만(FR-5: 로그 · 추적 속성에 금액 0)
 */
class OutboxRelay(
    private val sources: List<OutboxSource>,
    private val rabbit: RabbitTemplate,
    private val traceParent: TraceParent,
    private val clock: Clock,
    private val batchSize: Int = 100,
    private val maxAttempts: Int = 10,
    private val confirmTimeout: Duration = Duration.ofSeconds(5),
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val locks = sources.associate { it.service to DefaultLockingTaskExecutor(JdbcTemplateLockProvider(it.dataSource)) }

    @Scheduled(fixedDelayString = "\${salt.outbox.relay-interval:500ms}")
    fun relayAll() {
        sources.forEach { source ->
            locks.getValue(source.service).executeWithLock(
                Runnable { relay(source) },
                LockConfiguration(Instant.now(clock), "outbox-relay", Duration.ofSeconds(30), Duration.ZERO),
            )
        }
    }

    /** @return 이번 회차에 보낸 수 */
    fun relay(source: OutboxSource): Int {
        val pending = source.dsl
            .select(DSL.field("event_id", UUID::class.java), DSL.field("event_type", String::class.java), DSL.field("payload::text", String::class.java), DSL.field("trace_parent", String::class.java), DSL.field("occurred_at", OffsetDateTime::class.java), DSL.field("attempts", Int::class.java))
            .from(DSL.table("outbox"))
            .where(DSL.field("published_at").isNull.and(DSL.field("dead_at").isNull))
            .orderBy(DSL.field("seq"))
            .limit(batchSize)
            .fetch()

        var sent = 0
        for (row in pending) {
            val eventId = row.value1()
            val eventType = row.value2()
            val ok = runCatching {
                traceParent.underParent(row.value4(), "outbox.publish $eventType") { publish(eventId, eventType, row.value3(), row.value5()) }
            }.onFailure { log.warn("Outbox publish failed {} {}: {}", eventType, eventId, it.message) }.isSuccess

            val update = source.dsl.update(DSL.table("outbox"))
            val attempts = DSL.field("attempts", Int::class.java)
            val giveUp = !ok && row.value6() + 1 >= maxAttempts
            val marked = when {
                ok -> update.set(DSL.field("published_at", OffsetDateTime::class.java), OffsetDateTime.now(clock))
                giveUp -> update.set(attempts, attempts.plus(1)).set(DSL.field("dead_at", OffsetDateTime::class.java), OffsetDateTime.now(clock))
                else -> update.set(attempts, attempts.plus(1))
            }
            marked.where(DSL.field("event_id", UUID::class.java).eq(eventId)).execute()
            if (giveUp) {
                log.error("Outbox event dead after {} attempts {} {} — 건너뛴다", maxAttempts, eventType, eventId)
                continue
            }
            if (!ok) break
            sent++
        }
        return sent
    }

    private fun publish(eventId: UUID, eventType: String, payload: String, occurredAt: OffsetDateTime) {
        val message = MessageBuilder.withBody(payload.toByteArray(Charsets.UTF_8))
            .setContentType(MessageProperties.CONTENT_TYPE_JSON)
            .setContentEncoding(Charsets.UTF_8.name())
            .setMessageId(eventId.toString())
            .setType(eventType)
            .setHeader(EventTopology.OCCURRED_AT_HEADER, occurredAt.toString())
            .build()
        val correlation = CorrelationData(eventId.toString())
        rabbit.send(EventTopology.EXCHANGE, eventType, message, correlation)
        val confirm = correlation.future.get(confirmTimeout.toMillis(), TimeUnit.MILLISECONDS)
        check(confirm.ack) { "브로커가 받지 않았다(nack) $eventType $eventId" }
    }
}
