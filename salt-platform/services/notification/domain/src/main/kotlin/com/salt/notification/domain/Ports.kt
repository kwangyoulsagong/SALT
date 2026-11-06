package com.salt.notification.domain

import java.time.Instant
import java.util.UUID

/** 알림 저장(`notification.notification`). 조회 · 갱신은 **넘겨받은 종류로만** 좁힌다 — 끈 도메인 · 옛 종류 행을 건드리지 않는다. */
interface Notifications {
    /** 이벤트 하나에 한 번(`processed_event`) — 같은 이벤트가 두 번 와도 처리 1회분. @return 처음이면 true */
    fun firstTime(eventId: UUID, eventType: String): Boolean

    fun insert(draft: NotificationDraft, sourceEventId: UUID)

    /** 같은 원인(사용자 · 출처 · 종목 · 코드)의 알림이 [since] 뒤에 있었나 — 억제 창 */
    fun existsSince(draft: NotificationDraft, since: Instant): Boolean

    fun page(userId: String, kinds: Set<NotificationKind>, offset: Int, limit: Int): List<NotificationItem>

    fun count(userId: String, kinds: Set<NotificationKind>): Int

    fun countUnread(userId: String, kinds: Set<NotificationKind>): Int

    fun markRead(userId: String, id: String, kinds: Set<NotificationKind>)

    fun markAllRead(userId: String, kinds: Set<NotificationKind>)

    /** @return 지운 수 */
    fun deleteExpired(now: Instant): Int
}

/** 도메인별 켬/끔(`notification.notification_pref`). 행 없음 = 꺼짐. */
interface NotificationPrefsStore {
    fun of(userId: String): NotificationPrefs

    fun set(userId: String, domain: NotificationDomain, enabled: Boolean, at: Instant)
}
