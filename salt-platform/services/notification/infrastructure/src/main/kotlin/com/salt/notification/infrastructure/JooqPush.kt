package com.salt.notification.infrastructure

import com.salt.notification.domain.NotificationKind
import com.salt.notification.domain.PendingPush
import com.salt.notification.domain.PushPolicy
import com.salt.notification.domain.PushQueue
import com.salt.notification.domain.PushSubscription
import com.salt.notification.domain.PushSubscriptions
import com.salt.notification.infrastructure.jooq.Tables.NOTIFICATION
import com.salt.notification.infrastructure.jooq.Tables.PUSH_SUBSCRIPTION
import org.jooq.DSLContext
import java.time.Instant
import java.time.ZoneOffset

private fun Instant.utc() = atOffset(ZoneOffset.UTC)

/** `push_subscription`(`SRV-REQ-062` FR-1) — 주소 하나에 행 하나. 넣기는 한 문장 upsert(경합에도 행 하나 · 주인이 바뀌면 키도 새 것) */
class JooqPushSubscriptions(private val dsl: DSLContext) : PushSubscriptions {
    override fun save(userId: String, subscription: PushSubscription, at: Instant) {
        dsl.insertInto(PUSH_SUBSCRIPTION)
            .set(PUSH_SUBSCRIPTION.ENDPOINT, subscription.endpoint)
            .set(PUSH_SUBSCRIPTION.USER_ID, userId)
            .set(PUSH_SUBSCRIPTION.P256DH, subscription.p256dh)
            .set(PUSH_SUBSCRIPTION.AUTH, subscription.auth)
            .set(PUSH_SUBSCRIPTION.CREATED_AT, at.utc())
            .set(PUSH_SUBSCRIPTION.LAST_SEEN_AT, at.utc())
            .onConflict(PUSH_SUBSCRIPTION.ENDPOINT)
            .doUpdate()
            .set(PUSH_SUBSCRIPTION.USER_ID, userId)
            .set(PUSH_SUBSCRIPTION.P256DH, subscription.p256dh)
            .set(PUSH_SUBSCRIPTION.AUTH, subscription.auth)
            .set(PUSH_SUBSCRIPTION.LAST_SEEN_AT, at.utc())
            .execute()
        // 상한(불변식 5) — 방금 넣은 것은 last_seen 이 가장 새로워 남는다
        val keep = dsl.select(PUSH_SUBSCRIPTION.ENDPOINT).from(PUSH_SUBSCRIPTION)
            .where(PUSH_SUBSCRIPTION.USER_ID.eq(userId))
            .orderBy(PUSH_SUBSCRIPTION.LAST_SEEN_AT.desc(), PUSH_SUBSCRIPTION.ENDPOINT)
            .limit(PushPolicy.DEVICES_PER_USER)
        dsl.deleteFrom(PUSH_SUBSCRIPTION)
            .where(PUSH_SUBSCRIPTION.USER_ID.eq(userId).and(PUSH_SUBSCRIPTION.ENDPOINT.notIn(keep)))
            .execute()
    }

    override fun remove(userId: String, endpoint: String) {
        dsl.deleteFrom(PUSH_SUBSCRIPTION).where(PUSH_SUBSCRIPTION.USER_ID.eq(userId).and(PUSH_SUBSCRIPTION.ENDPOINT.eq(endpoint))).execute()
    }

    override fun of(userIds: Set<String>): Map<String, List<PushSubscription>> {
        if (userIds.isEmpty()) return emptyMap()
        return dsl.selectFrom(PUSH_SUBSCRIPTION)
            .where(PUSH_SUBSCRIPTION.USER_ID.`in`(userIds))
            .fetch()
            .groupBy({ it.userId }, { PushSubscription.stored(it.endpoint, it.p256dh, it.auth) })
    }

    override fun removeGone(endpoints: Set<String>) {
        if (endpoints.isEmpty()) return
        dsl.deleteFrom(PUSH_SUBSCRIPTION).where(PUSH_SUBSCRIPTION.ENDPOINT.`in`(endpoints)).execute()
    }
}

/**
 * 보낼 차례 알림(`SRV-REQ-062` FR-2) — 표시와 읽기가 한 문장(`UPDATE … RETURNING`). 회차는 ShedLock 으로 하나라 잠금 경합은 없지만,
 * 문장이 하나라 두 회차가 겹쳐도 같은 행을 두 번 돌려주지 않는다(`FOR UPDATE SKIP LOCKED`).
 */
class JooqPushQueue(private val dsl: DSLContext) : PushQueue {
    override fun claim(since: Instant, now: Instant, limit: Int): List<PendingPush> {
        val due = dsl.select(NOTIFICATION.ID)
            .from(NOTIFICATION)
            .where(NOTIFICATION.PUSHED_AT.isNull.and(NOTIFICATION.CREATED_AT.gt(since.utc())))
            .orderBy(NOTIFICATION.CREATED_AT)
            .limit(limit)
            .forUpdate()
            .skipLocked()
        return dsl.update(NOTIFICATION)
            .set(NOTIFICATION.PUSHED_AT, now.utc())
            .where(NOTIFICATION.ID.`in`(due))
            .returning(NOTIFICATION.ID, NOTIFICATION.USER_ID, NOTIFICATION.KIND)
            .fetch()
            .mapNotNull { r -> NotificationKind.parse(r.kind)?.let { PendingPush(r.id, r.userId, it) } }
    }

    override fun skipStale(since: Instant, now: Instant): Int =
        dsl.update(NOTIFICATION).set(NOTIFICATION.PUSHED_AT, now.utc())
            .where(NOTIFICATION.PUSHED_AT.isNull.and(NOTIFICATION.CREATED_AT.le(since.utc())))
            .execute()
}
