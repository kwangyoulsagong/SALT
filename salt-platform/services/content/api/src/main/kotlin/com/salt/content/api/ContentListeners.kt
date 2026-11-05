package com.salt.content.api

import com.salt.content.application.RecordSignal
import com.salt.content.application.RunValidityCheck
import com.salt.content.application.SyncCatalog
import com.salt.content.domain.TriggerKind
import com.salt.support.messaging.IncomingEvent
import net.javacrumbs.shedlock.core.LockConfiguration
import net.javacrumbs.shedlock.core.LockingTaskExecutor
import org.slf4j.LoggerFactory
import org.springframework.amqp.AmqpRejectAndDontRequeueException
import org.springframework.amqp.core.Message
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Scheduled
import tools.jackson.databind.json.JsonMapper
import java.time.Clock
import java.time.Duration
import java.time.Instant

/**
 * 저축 이벤트 구독(`SRV-REQ-047` FR-4) — `savings.GoalCreated`(결혼 · 주거) · `savings.GoalReached` → 사용자 신호.
 * 리스너는 유스케이스 한 번 호출만(`kotlin-platform.md` §3). 본문 모양이 틀리면 재시도 없이 데드레터. 로그에 사용자 · 금액 0.
 */
class SavingsEventsListener(private val record: RecordSignal, private val jsonMapper: JsonMapper) {
    @RabbitListener(queues = [GOAL_CREATED_QUEUE])
    fun onGoalCreated(message: Message) {
        val event = IncomingEvent.from(message, jsonMapper)
        val template = event.payload.path("template").asString(null) ?: throw AmqpRejectAndDontRequeueException("template 없음 ${event.eventId}")
        record.execute(event.eventId, event.eventType, userId(event), TriggerKind.forGoalTemplate(template), instant(event, "createdAt"))
    }

    @RabbitListener(queues = [GOAL_REACHED_QUEUE])
    fun onGoalReached(message: Message) {
        val event = IncomingEvent.from(message, jsonMapper)
        record.execute(event.eventId, event.eventType, userId(event), TriggerKind.GOAL_REACHED, instant(event, "reachedAt"))
    }

    private fun userId(event: IncomingEvent): String =
        event.payload.path("userId").asString(null)?.takeIf { it.isNotEmpty() } ?: throw AmqpRejectAndDontRequeueException("userId 없음 ${event.eventId}")

    private fun instant(event: IncomingEvent, field: String): Instant =
        event.payload.path(field).asString(null)?.let { runCatching { Instant.parse(it) }.getOrNull() }
            ?: throw AmqpRejectAndDontRequeueException("$field 없음 ${event.eventId}")

    companion object {
        const val SUBSCRIBER = "content"
        const val GOAL_CREATED = "savings.GoalCreated"
        const val GOAL_REACHED = "savings.GoalReached"
        const val GOAL_CREATED_QUEUE = "$SUBSCRIBER.$GOAL_CREATED"
        const val GOAL_REACHED_QUEUE = "$SUBSCRIBER.$GOAL_REACHED"
    }
}

/**
 * 원문 동기화(기동 때 한 번) + 유효기한 점검 워커(`SRV-REQ-047` FR-1 · FR-2). 원문이 발행 검사를 못 넘으면 동기화가 던져 기동이 멈춘다 —
 * 틀린 글이 공개되느니 서버가 안 뜨는 편이 낫다(검사는 `./gradlew check` 가 먼저 한다).
 * 점검은 매시 15분(KST) · 멱등 · 락은 content 스키마 `shedlock`. 로그엔 건수만.
 */
class ContentWorker(
    private val sync: SyncCatalog,
    private val validity: RunValidityCheck,
    private val lock: LockingTaskExecutor,
    private val clock: Clock,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @EventListener(ApplicationReadyEvent::class)
    fun syncOnStart() {
        sync.load()
        lock.executeWithLock(
            Runnable {
                val r = sync.execute()
                log.info("Content catalog tips={} revised={} retired={} paramsChanged={}", r.tips, r.revised, r.retired, r.paramsChanged)
            },
            LockConfiguration(clock.instant(), "content-sync", Duration.ofMinutes(5), Duration.ZERO),
        )
    }

    @Scheduled(cron = "\${salt.content.validity-cron:0 15 * * * *}", zone = "Asia/Seoul")
    fun checkValidity() {
        lock.executeWithLock(
            Runnable {
                val n = validity.execute()
                if (n > 0) log.info("Content validity needsCheck={}", n)
            },
            LockConfiguration(clock.instant(), "content-validity", Duration.ofMinutes(10), Duration.ofSeconds(30)),
        )
    }
}
