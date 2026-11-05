package com.salt.notification.application

import com.salt.notification.domain.NotificationDomain
import com.salt.notification.domain.NotificationDomainUnknown
import com.salt.notification.domain.NotificationDraft
import com.salt.notification.domain.NotificationItem
import com.salt.notification.domain.NotificationKind
import com.salt.notification.domain.NotificationPrefs
import com.salt.notification.domain.NotificationPrefsStore
import com.salt.notification.domain.Notifications
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID

/** notification 서비스의 트랜잭션 매니저 이름(`ServiceDatabase` — 서비스마다 따로). */
const val NOTIFICATION_TX = "notificationTx"

/**
 * 이벤트 → 알림 한 건(`SRV-REQ-048` FR-5). **한 트랜잭션에** 처리 기록 · 설정 확인 · 억제 확인 · 넣기.
 * 받을 때 그 도메인이 꺼져 있으면 쌓지 않는다(처리 기록만) — 나중에 켜도 지난 이벤트를 되살리지 않는다.
 *
 * @return 알림을 넣었으면 true
 */
open class DeliverNotification(private val notifications: Notifications, private val prefs: NotificationPrefsStore) {
    @Transactional(transactionManager = NOTIFICATION_TX)
    open fun execute(eventId: UUID, eventType: String, draft: NotificationDraft): Boolean {
        if (!notifications.firstTime(eventId, eventType)) return false
        if (!prefs.of(draft.userId).isOn(draft.kind.domain)) return false
        draft.kind.suppressFor?.let { window -> if (notifications.existsSince(draft, draft.createdAt.minus(window))) return false }
        notifications.insert(draft, eventId)
        return true
    }
}

/** 이벤트 모양은 맞았지만 알림이 아닌 것 — 처리 기록만(다시 와도 다시 보지 않게). */
open class SkipEvent(private val notifications: Notifications) {
    @Transactional(transactionManager = NOTIFICATION_TX)
    open fun execute(eventId: UUID, eventType: String) {
        notifications.firstTime(eventId, eventType)
    }
}

data class NotificationPage(val page: Int, val size: Int, val total: Int, val items: List<NotificationItem>)

/**
 * 목록 · 안 읽은 수 · 읽음 · 모두 읽음 — **켠 도메인의 종류만** 본다. 안 읽은 수가 목록에 보이는 것과 같아야 한다(옛 Express 와 같은 불변식).
 * 쪽 크기 기본 20 · 상한 50(옛 Express 그대로).
 */
open class ReadNotifications(private val notifications: Notifications, private val prefs: NotificationPrefsStore) {
    private fun kinds(userId: String): Set<NotificationKind> = NotificationKind.of(prefs.of(userId).enabled)

    @Transactional(transactionManager = NOTIFICATION_TX, readOnly = true)
    open fun list(userId: String, page: Int?, size: Int?): NotificationPage {
        val p = page?.takeIf { it > 0 } ?: 1
        val s = minOf(size?.takeIf { it > 0 } ?: DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
        val kinds = kinds(userId)
        if (kinds.isEmpty()) return NotificationPage(p, s, 0, emptyList())
        return NotificationPage(p, s, notifications.count(userId, kinds), notifications.page(userId, kinds, (p - 1) * s, s))
    }

    @Transactional(transactionManager = NOTIFICATION_TX, readOnly = true)
    open fun unreadCount(userId: String): Int = kinds(userId).let { if (it.isEmpty()) 0 else notifications.countUnread(userId, it) }

    @Transactional(transactionManager = NOTIFICATION_TX)
    open fun markRead(userId: String, id: String) {
        kinds(userId).takeIf { it.isNotEmpty() }?.let { notifications.markRead(userId, id, it) }
    }

    @Transactional(transactionManager = NOTIFICATION_TX)
    open fun markAllRead(userId: String) {
        kinds(userId).takeIf { it.isNotEmpty() }?.let { notifications.markAllRead(userId, it) }
    }

    companion object {
        const val DEFAULT_PAGE_SIZE = 20
        const val MAX_PAGE_SIZE = 50
    }
}

/** 도메인별 알림 설정(`SRV-REQ-048` FR-5 · `DB-REQ-040` FR-3 — 주인은 notification). 기본 꺼짐. */
open class NotificationSettings(private val prefs: NotificationPrefsStore, private val clock: Clock) {
    @Transactional(transactionManager = NOTIFICATION_TX, readOnly = true)
    open fun get(userId: String): NotificationPrefs = prefs.of(userId)

    @Transactional(transactionManager = NOTIFICATION_TX)
    open fun set(userId: String, domainKey: String, enabled: Boolean): NotificationPrefs {
        val domain = NotificationDomain.parse(domainKey) ?: throw NotificationDomainUnknown(domainKey)
        prefs.set(userId, domain, enabled, clock.instant())
        return prefs.of(userId)
    }
}

/** 만료 정리(옛 Express `notification-cleanup.worker` — 매시). @return 지운 수 */
open class CleanupExpired(private val notifications: Notifications, private val clock: Clock) {
    @Transactional(transactionManager = NOTIFICATION_TX)
    open fun execute(): Int = notifications.deleteExpired(clock.instant())
}
