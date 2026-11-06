package com.salt.notification.api

import com.salt.notification.application.CleanupExpired
import com.salt.notification.application.DeliverNotification
import com.salt.notification.domain.Deliveries
import com.salt.notification.domain.NotificationDraft
import com.salt.support.messaging.IncomingEvent
import net.javacrumbs.shedlock.core.LockConfiguration
import net.javacrumbs.shedlock.core.LockingTaskExecutor
import org.slf4j.LoggerFactory
import org.springframework.amqp.AmqpRejectAndDontRequeueException
import org.springframework.amqp.core.Message
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.scheduling.annotation.Scheduled
import tools.jackson.databind.json.JsonMapper
import java.time.Clock
import java.time.Duration
import java.time.Instant

/**
 * 이벤트 구독(`SRV-REQ-048` FR-5) — notification 은 **구독만** 한다. 도메인마다 하나:
 * `coach.DecisionChanged`(투자) · `savings.GoalReached`(저축) · `household.FixedCostIncreased`(가계부).
 * 리스너는 본문에서 코드만 꺼내 유스케이스 한 번(`kotlin-platform.md` §3). 금액 · 목표 이름 · 가맹점은 읽지 않는다. 본문 모양이 틀리면 데드레터.
 *
 * `household.MonthClosed` 는 구독하지 않는다 — 사용자가 직접 닫은 일을 사용자에게 다시 알리는 셈이다(판단은 슬라이스 MONEY-S2c).
 */
class NotificationEventsListener(private val deliver: DeliverNotification, private val jsonMapper: JsonMapper) {
    @RabbitListener(queues = [DECISION_CHANGED_QUEUE])
    fun onDecisionChanged(message: Message) = handle(message) { e ->
        Deliveries.decisionChanged(e.text("userId"), e.text("symbol"), e.text("mode"), e.text("previousAction"), e.text("nextAction"), e.instant("changedAt"))
    }

    @RabbitListener(queues = [GOAL_REACHED_QUEUE])
    fun onGoalReached(message: Message) = handle(message) { e -> Deliveries.goalReached(e.text("userId"), e.text("template"), e.instant("reachedAt")) }

    @RabbitListener(queues = [FIXED_COST_INCREASED_QUEUE])
    fun onFixedCostIncreased(message: Message) = handle(message) { e ->
        Deliveries.fixedCostIncreased(e.text("userId"), e.text("category"), e.instant("detectedAt"))
    }

    private fun handle(message: Message, draft: (IncomingEvent) -> NotificationDraft) {
        val event = IncomingEvent.from(message, jsonMapper)
        // 코드 · 금액 관문에 걸리는 본문은 고쳐질 일이 없다 — 재시도 없이 데드레터
        val built = runCatching { draft(event) }.getOrElse { throw AmqpRejectAndDontRequeueException("알림으로 못 바꾼다 ${event.eventType} ${event.eventId}: ${it.javaClass.simpleName}") }
        deliver.execute(event.eventId, event.eventType, built)
    }

    private fun IncomingEvent.text(field: String): String =
        payload.path(field).asString(null)?.takeIf { it.isNotEmpty() } ?: throw AmqpRejectAndDontRequeueException("$field 없음 $eventId")

    private fun IncomingEvent.instant(field: String): Instant =
        payload.path(field).asString(null)?.let { runCatching { Instant.parse(it) }.getOrNull() } ?: throw AmqpRejectAndDontRequeueException("$field 없음 $eventId")

    companion object {
        const val SUBSCRIBER = "notification"
        const val DECISION_CHANGED = "coach.DecisionChanged"
        const val GOAL_REACHED = "savings.GoalReached"
        const val FIXED_COST_INCREASED = "household.FixedCostIncreased"
        const val DECISION_CHANGED_QUEUE = "$SUBSCRIBER.$DECISION_CHANGED"
        const val GOAL_REACHED_QUEUE = "$SUBSCRIBER.$GOAL_REACHED"
        const val FIXED_COST_INCREASED_QUEUE = "$SUBSCRIBER.$FIXED_COST_INCREASED"
        val SUBSCRIPTIONS = listOf(DECISION_CHANGED, GOAL_REACHED, FIXED_COST_INCREASED)
    }
}

/** 만료 정리 — 매시 정각(KST) · 멱등 · 락은 notification 스키마 `shedlock`(옛 Express `notification-cleanup.worker`). 로그엔 건수만. */
class NotificationCleanupWorker(private val cleanup: CleanupExpired, private val lock: LockingTaskExecutor, private val clock: Clock) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(cron = "\${salt.notification.cleanup-cron:0 0 * * * *}", zone = "Asia/Seoul")
    fun run() {
        lock.executeWithLock(
            Runnable {
                val n = cleanup.execute()
                if (n > 0) log.info("Notification cleanup deleted={}", n)
            },
            LockConfiguration(clock.instant(), "notification-cleanup", Duration.ofMinutes(10), Duration.ofSeconds(30)),
        )
    }
}
