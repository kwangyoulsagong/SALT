package com.salt.notification.application

import com.salt.notification.domain.NotificationKind
import com.salt.notification.domain.PendingPush
import com.salt.notification.domain.PushDisabled
import com.salt.notification.domain.PushMessage
import com.salt.notification.domain.PushOutcome
import com.salt.notification.domain.PushQueue
import com.salt.notification.domain.PushSubscription
import com.salt.notification.domain.PushSubscriptions
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

/**
 * 보내기 회차(`SRV-REQ-062` FR-2 · 3) — 기기마다 한 번 · 사라짐만 지움 · 실패는 지우지 않음 · 기기 없는 사람은 0 · 꺼져 있으면 구독 0.
 */
class SendPendingPushesSpec : StringSpec({
    val clock = Clock.fixed(Instant.parse("2026-11-21T00:00:00Z"), ZoneOffset.UTC)
    val key = "B" + "A".repeat(86)

    class FakeSubs : PushSubscriptions {
        val rows = linkedMapOf<String, Pair<String, PushSubscription>>()
        val removed = mutableListOf<Set<String>>()
        override fun save(userId: String, subscription: PushSubscription, at: Instant) { rows[subscription.endpoint] = userId to subscription }
        override fun remove(userId: String, endpoint: String) { if (rows[endpoint]?.first == userId) rows.remove(endpoint) }
        override fun of(userIds: Set<String>) = rows.values.filter { it.first in userIds }.groupBy({ it.first }, { it.second })
        override fun removeGone(endpoints: Set<String>) { removed += endpoints; endpoints.forEach { rows.remove(it) } }
    }

    fun device(name: String) = PushSubscription.stored("https://fcm.googleapis.com/fcm/send/$name", key, "AAAAAAAAAAAAAAAAAAAAAA")

    "기기마다 한 번 · 410 은 지우고 실패는 남긴다 · 기기 없는 사람은 보내지 않는다" {
        val subs = FakeSubs().apply {
            save("u1", device("a"), clock.instant())
            save("u1", device("b"), clock.instant())
            save("u2", device("c"), clock.instant())
        }
        val queue = object : PushQueue {
            var skippedSince: Instant? = null
            override fun claim(since: Instant, now: Instant, limit: Int) = listOf(
                PendingPush("n1", "u1", NotificationKind.GOAL_REACHED),
                PendingPush("n2", "u2", NotificationKind.SIGNAL_UPDATE),
                PendingPush("n3", "u3", NotificationKind.FIXED_COST_INCREASED),
            )
            override fun skipStale(since: Instant, now: Instant): Int { skippedSince = since; return 4 }
        }
        val sent = mutableListOf<Pair<String, PushMessage>>()
        val outcome = mapOf("a" to PushOutcome.DELIVERED, "b" to PushOutcome.GONE, "c" to PushOutcome.FAILED)
        val run = SendPendingPushes(ClaimPushes(queue, subs, clock), DropGoneSubscriptions(subs)) { d, m ->
            sent += d.endpoint.substringAfterLast('/') to m
            outcome.getValue(d.endpoint.substringAfterLast('/'))
        }.execute()

        run shouldBe PushRun(notifications = 3, delivered = 1, gone = 1, failed = 1, skipped = 4)
        sent.map { it.first } shouldBe listOf("a", "b", "c")
        sent.first().second shouldBe PushMessage.of(NotificationKind.GOAL_REACHED)
        subs.removed shouldBe listOf(setOf("https://fcm.googleapis.com/fcm/send/b"))
        subs.rows.keys.map { it.substringAfterLast('/') } shouldBe listOf("a", "c")
        queue.skippedSince shouldBe Instant.parse("2026-11-20T23:30:00Z")
    }

    "구독 — 꺼져 있으면 넣지 않는다 · 같은 주소를 다른 사람이 넣으면 주인이 바뀐다 · 빼기는 본인 것만" {
        val subs = FakeSubs()
        shouldThrow<PushDisabled> { ManagePushSubscription(subs, PushConfig(false, null), clock).save("u1", device("a").endpoint, key, "AAAAAAAAAAAAAAAAAAAAAA") }
        subs.rows.size shouldBe 0

        val manage = ManagePushSubscription(subs, PushConfig(true, "pk"), clock)
        val realKey = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(byteArrayOf(4) + ByteArray(64))
        manage.save("u1", device("a").endpoint, realKey, "AAAAAAAAAAAAAAAAAAAAAA")
        manage.save("u2", device("a").endpoint, realKey, "AAAAAAAAAAAAAAAAAAAAAA")
        subs.rows.values.single().first shouldBe "u2"
        manage.remove("u1", device("a").endpoint)
        subs.rows.size shouldBe 1
        manage.remove("u2", device("a").endpoint)
        subs.rows.size shouldBe 0
    }
})
