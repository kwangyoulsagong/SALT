package com.salt.notification.application

import com.salt.notification.domain.NotificationPrefsStore
import com.salt.notification.domain.PendingPush
import com.salt.notification.domain.PushDisabled
import com.salt.notification.domain.PushMessage
import com.salt.notification.domain.PushOutcome
import com.salt.notification.domain.PushPolicy
import com.salt.notification.domain.PushQueue
import com.salt.notification.domain.PushSender
import com.salt.notification.domain.PushSubscription
import com.salt.notification.domain.PushSubscriptions
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

/**
 * 푸시 설정 — 서버 공개키(브라우저가 구독할 때 쓴다) · 켜졌나. 키가 없으면 꺼짐(`SRV-REQ-062` FR-4).
 * 공개키는 비밀이 아니다 — 브라우저가 `applicationServerKey` 로 들고 있는 값.
 */
data class PushConfig(val enabled: Boolean, val publicKey: String?)

/**
 * 이 기기 구독 넣기 · 빼기(`SRV-REQ-062` FR-1). 앱이 열릴 때마다 같은 넣기로 대조한다(`FE-REQ-078` FR-4) — 다시 불러도 행 하나.
 * 서버 푸시가 꺼져 있으면 넣지 않는다(503) — 받지 못할 구독을 쌓지 않는다.
 */
open class ManagePushSubscription(private val subscriptions: PushSubscriptions, private val config: PushConfig, private val clock: Clock) {
    @Transactional(transactionManager = NOTIFICATION_TX)
    open fun save(userId: String, endpoint: String, p256dh: String, auth: String) {
        if (!config.enabled) throw PushDisabled()
        subscriptions.save(userId, PushSubscription.of(endpoint, p256dh, auth), clock.instant())
    }

    /** 본인 것만 · 없어도 성공(다시 불러도 안전) */
    @Transactional(transactionManager = NOTIFICATION_TX)
    open fun remove(userId: String, endpoint: String) = subscriptions.remove(userId, endpoint)
}

/** 보낼 차례 한 묶음 — 알림 하나와 그 주인의 기기들 */
data class PushBatch(val items: List<Pair<PendingPush, List<PushSubscription>>>, val skipped: Int)

/** 짧은 쓰기 하나 — 오래된 것 건너뜀 · 표시 · 기기 읽기. 보내기(외부 I/O)는 이 트랜잭션 밖(`performance-server.md` §2) */
open class ClaimPushes(
    private val queue: PushQueue,
    private val subscriptions: PushSubscriptions,
    private val prefs: NotificationPrefsStore,
    private val clock: Clock,
) {
    @Transactional(transactionManager = NOTIFICATION_TX)
    open fun execute(): PushBatch {
        val now = clock.instant()
        val since = PushPolicy.cutoff(now)
        val skipped = queue.skipStale(since, now)
        val pending = queue.claim(since, now, PushPolicy.BATCH)
        // 보낼 때 다시 본다(불변식 6) — 알림이 생긴 뒤 끈 도메인은 기기 0(표시는 이미 됐으니 다시 오지 않는다)
        val on = pending.map { it.userId }.toSet().associateWith { prefs.of(it) }
        val live = pending.filter { on.getValue(it.userId).isOn(it.kind.domain) }
        val devices = subscriptions.of(live.map { it.userId }.toSet())
        return PushBatch(live.map { it to devices[it.userId].orEmpty() }, skipped + pending.size - live.size)
    }
}

open class DropGoneSubscriptions(private val subscriptions: PushSubscriptions) {
    @Transactional(transactionManager = NOTIFICATION_TX)
    open fun execute(endpoints: Set<String>) = subscriptions.removeGone(endpoints)
}

data class PushRun(val notifications: Int, val delivered: Int, val gone: Int, val failed: Int, val skipped: Int)

/**
 * 한 회차(`SRV-REQ-062` FR-2 · 3) — 표시(트랜잭션) → 기기마다 보내기(밖) → 사라진 구독 지우기(트랜잭션).
 * 표시가 먼저라 보내다 죽으면 그 회차 푸시는 잃는다(불변식 3 — 많아야 한 번).
 */
open class SendPendingPushes(private val claim: ClaimPushes, private val drop: DropGoneSubscriptions, private val sender: PushSender) {
    open fun execute(): PushRun {
        val batch = claim.execute()
        var delivered = 0
        var failed = 0
        val gone = mutableSetOf<String>()
        batch.items.forEach { (push, devices) ->
            val message = PushMessage.of(push.kind)
            devices.forEach { device ->
                // 기기 하나의 뜻밖 오류가 회차를 멈추지 않게 — 이미 표시한 남의 푸시를 잃는다
                when (runCatching { sender.send(device, message) }.getOrDefault(PushOutcome.FAILED)) {
                    PushOutcome.DELIVERED -> delivered++
                    PushOutcome.GONE -> gone += device.endpoint
                    PushOutcome.FAILED -> failed++
                }
            }
        }
        drop.execute(gone)
        return PushRun(batch.items.size, delivered, gone.size, failed, batch.skipped)
    }
}
