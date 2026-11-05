package com.salt.notification.infrastructure

import com.salt.notification.domain.NotificationDomain
import com.salt.notification.domain.NotificationDraft
import com.salt.notification.domain.NotificationItem
import com.salt.notification.domain.NotificationKind
import com.salt.notification.domain.NotificationPrefs
import com.salt.notification.domain.NotificationPrefsStore
import com.salt.notification.domain.Notifications
import com.salt.notification.infrastructure.jooq.Tables.NOTIFICATION
import com.salt.notification.infrastructure.jooq.Tables.NOTIFICATION_PREF
import com.salt.support.messaging.ProcessedEvents
import org.jooq.DSLContext
import org.jooq.JSON
import tools.jackson.databind.json.JsonMapper
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID

private fun Instant.utc() = atOffset(ZoneOffset.UTC)

/** `notification` 표(`SRV-REQ-048` FR-5). 인자(params)는 jsonb 객체(생성기가 JSON 으로 읽는다 — 넣을 때 json → jsonb 대입 변환) — 읽을 때 문자열 값만 남긴다(옛 행의 숫자가 새어 나가지 않게). */
class JooqNotifications(private val dsl: DSLContext, private val jsonMapper: JsonMapper) : Notifications {
    override fun firstTime(eventId: UUID, eventType: String): Boolean = ProcessedEvents.firstTime(dsl, eventId, eventType)

    override fun insert(draft: NotificationDraft, sourceEventId: UUID) {
        dsl.insertInto(NOTIFICATION)
            .set(NOTIFICATION.ID, UUID.randomUUID().toString())
            .set(NOTIFICATION.USER_ID, draft.userId)
            .set(NOTIFICATION.KIND, draft.kind.key)
            .set(NOTIFICATION.SOURCE, draft.source)
            .set(NOTIFICATION.SYMBOL, draft.symbol)
            .set(NOTIFICATION.MESSAGE_CODE, draft.messageCode)
            .set(NOTIFICATION.PARAMS, JSON.valueOf(jsonMapper.writeValueAsString(draft.params)))
            .set(NOTIFICATION.CREATED_AT, draft.createdAt.utc())
            .set(NOTIFICATION.EXPIRES_AT, draft.expiresAt.utc())
            .set(NOTIFICATION.SOURCE_EVENT_ID, sourceEventId)
            .execute()
    }

    override fun existsSince(draft: NotificationDraft, since: Instant): Boolean =
        dsl.fetchExists(
            dsl.selectFrom(NOTIFICATION).where(
                NOTIFICATION.USER_ID.eq(draft.userId)
                    .and(NOTIFICATION.SOURCE.eq(draft.source))
                    .and(if (draft.symbol == null) NOTIFICATION.SYMBOL.isNull else NOTIFICATION.SYMBOL.eq(draft.symbol))
                    .and(NOTIFICATION.MESSAGE_CODE.eq(draft.messageCode))
                    .and(NOTIFICATION.CREATED_AT.gt(since.utc())),
            ),
        )

    private fun scope(userId: String, kinds: Set<NotificationKind>) = NOTIFICATION.USER_ID.eq(userId).and(NOTIFICATION.KIND.`in`(kinds.map { it.key }))

    override fun page(userId: String, kinds: Set<NotificationKind>, offset: Int, limit: Int): List<NotificationItem> =
        dsl.selectFrom(NOTIFICATION)
            .where(scope(userId, kinds))
            .orderBy(NOTIFICATION.CREATED_AT.desc(), NOTIFICATION.ID.desc())
            .offset(offset)
            .limit(limit)
            .fetch()
            .mapNotNull { r ->
                NotificationKind.parse(r.kind)?.let { kind ->
                    NotificationItem(r.id, kind, r.symbol, r.messageCode, params(r.params), r.isRead, r.createdAt.toInstant())
                }
            }

    private fun params(value: JSON?): Map<String, String> {
        val node = value?.data()?.let { runCatching { jsonMapper.readTree(it) }.getOrNull() } ?: return emptyMap()
        if (!node.isObject) return emptyMap()
        return node.properties().filter { it.value.isString }.associate { it.key to it.value.asString() }
    }

    override fun count(userId: String, kinds: Set<NotificationKind>): Int = dsl.fetchCount(NOTIFICATION, scope(userId, kinds))

    override fun countUnread(userId: String, kinds: Set<NotificationKind>): Int =
        dsl.fetchCount(NOTIFICATION, scope(userId, kinds).and(NOTIFICATION.IS_READ.isFalse))

    override fun markRead(userId: String, id: String, kinds: Set<NotificationKind>) {
        dsl.update(NOTIFICATION).set(NOTIFICATION.IS_READ, true).where(scope(userId, kinds).and(NOTIFICATION.ID.eq(id))).execute()
    }

    override fun markAllRead(userId: String, kinds: Set<NotificationKind>) {
        dsl.update(NOTIFICATION).set(NOTIFICATION.IS_READ, true).where(scope(userId, kinds).and(NOTIFICATION.IS_READ.isFalse)).execute()
    }

    override fun deleteExpired(now: Instant): Int = dsl.deleteFrom(NOTIFICATION).where(NOTIFICATION.EXPIRES_AT.lt(now.utc())).execute()
}

/** `notification_pref` — 행 없음 = 꺼짐. 켬/끔은 한 문장 upsert(경합에도 행 하나 — 오류 코드로 가르지 않는다). */
class JooqNotificationPrefs(private val dsl: DSLContext) : NotificationPrefsStore {
    override fun of(userId: String): NotificationPrefs =
        NotificationPrefs(
            dsl.selectFrom(NOTIFICATION_PREF)
                .where(NOTIFICATION_PREF.USER_ID.eq(userId).and(NOTIFICATION_PREF.ENABLED.isTrue))
                .fetch()
                .mapNotNull { NotificationDomain.parse(it.domain) }
                .toSet(),
        )

    override fun set(userId: String, domain: NotificationDomain, enabled: Boolean, at: Instant) {
        dsl.insertInto(NOTIFICATION_PREF)
            .set(NOTIFICATION_PREF.USER_ID, userId)
            .set(NOTIFICATION_PREF.DOMAIN, domain.key)
            .set(NOTIFICATION_PREF.ENABLED, enabled)
            .set(NOTIFICATION_PREF.UPDATED_AT, at.utc())
            .onConflict(NOTIFICATION_PREF.USER_ID, NOTIFICATION_PREF.DOMAIN)
            .doUpdate()
            .set(NOTIFICATION_PREF.ENABLED, enabled)
            .set(NOTIFICATION_PREF.UPDATED_AT, at.utc())
            .execute()
    }
}
