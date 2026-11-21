package com.salt

import com.salt.notification.domain.PushMessage
import com.salt.notification.domain.PushOutcome
import com.salt.notification.domain.PushSender
import com.salt.notification.infrastructure.P256
import com.salt.support.persistence.ServiceDatabase
import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import java.security.interfaces.ECPublicKey
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * 웹 푸시 합격선(`SRV-REQ-062` 수용 기준) — 실 Postgres · RabbitMQ · 실제 회차(300ms). 밖으로 나가는 요청 0: 보내기 포트만 가짜.
 * 저축 적립 → `savings.GoalReached` → 알림 한 건 → 그 사람 기기마다 한 번 · 잠금 화면에 목표 이름 · 금액 0 · 410 이면 구독 삭제.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PushEndToEndTest : ContentHttp() {
    @Autowired @Qualifier("notificationDatabase")
    private lateinit var notificationDatabase: ServiceDatabase

    private val b64 = java.util.Base64.getUrlEncoder().withoutPadding()
    private fun device() = "https://fcm.googleapis.com/fcm/send/${UUID.randomUUID()}"
    private fun subscription(endpoint: String) =
        """{"endpoint":"$endpoint","keys":{"p256dh":"${b64.encodeToString(P256.raw(P256.generate().public as ECPublicKey))}","auth":"${b64.encodeToString(ByteArray(16) { 3 })}"}}"""

    private fun rows(endpoint: String): List<String> =
        notificationDatabase.dsl.fetch("SELECT user_id FROM push_subscription WHERE endpoint = ?", endpoint).map { it.get(0, String::class.java) }

    @Test
    fun `설정 · 구독 — 공개키 · 알려진 주소만 · 다시 넣어도 행 하나 · 주인 바뀜 · 빼기는 본인 것만`() {
        val user = "push-sub-${UUID.randomUUID()}"
        call("GET", "/api/notifications/push/config", null).statusCode() shouldBe 401
        val config = data(call("GET", "/api/notifications/push/config", user))
        config.path("enabled").asBoolean() shouldBe true
        config.path("publicKey").asString() shouldBe PUBLIC_KEY

        val endpoint = device()
        call("PUT", "/api/notifications/push/subscription", user, subscription(endpoint)).statusCode() shouldBe 200
        call("PUT", "/api/notifications/push/subscription", user, subscription(endpoint)).statusCode() shouldBe 200
        rows(endpoint) shouldBe listOf(user)

        listOf(
            subscription("https://localhost/x"),
            subscription("http://fcm.googleapis.com/fcm/send/x"),
            subscription("https://169.254.169.254/latest"),
            """{"endpoint":"$endpoint","keys":{"p256dh":"short","auth":"AAAAAAAAAAAAAAAAAAAAAA"}}""",
            """{"endpoint":"$endpoint"}""",
            "{}",
        ).forEach { call("PUT", "/api/notifications/push/subscription", user, it).statusCode() shouldBe 400 }

        val other = "push-other-${UUID.randomUUID()}"
        call("DELETE", "/api/notifications/push/subscription", other, """{"endpoint":"$endpoint"}""").statusCode() shouldBe 200
        rows(endpoint) shouldBe listOf(user)
        call("PUT", "/api/notifications/push/subscription", other, subscription(endpoint)).statusCode() shouldBe 200
        rows(endpoint) shouldBe listOf(other)
        call("DELETE", "/api/notifications/push/subscription", other, """{"endpoint":"$endpoint"}""").statusCode() shouldBe 200
        rows(endpoint) shouldBe emptyList()
    }

    @Test
    fun `기기 상한 10 — 열한 번째를 넣으면 가장 오래 안 연 기기가 빠진다 · 다시 넣은(연) 기기는 남는다`() {
        val user = "push-cap-${UUID.randomUUID()}"
        val devices = (1..11).map { device() }
        devices.take(10).forEach { call("PUT", "/api/notifications/push/subscription", user, subscription(it)).statusCode() shouldBe 200; Thread.sleep(5) }
        // 첫 기기를 다시 열었다(대조) — 이제 가장 오래 안 연 것은 둘째
        call("PUT", "/api/notifications/push/subscription", user, subscription(devices[0])).statusCode() shouldBe 200
        Thread.sleep(5)
        call("PUT", "/api/notifications/push/subscription", user, subscription(devices[10])).statusCode() shouldBe 200
        val left = notificationDatabase.dsl.fetch("SELECT endpoint FROM push_subscription WHERE user_id = ?", user).map { it.get(0, String::class.java) }.toSet()
        left.size shouldBe 10
        (devices[1] in left) shouldBe false
        (devices[0] in left && devices[10] in left) shouldBe true
    }

    @Test
    fun `저축 목표 도달 — 기기 둘에 한 번씩 · 문장에 이름 · 금액 0 · 410 기기는 지움 · 끈 사람 · 오래된 알림은 0`() {
        val user = "push-goal-${UUID.randomUUID()}"
        val (phone, gone) = device() to device()
        OUTCOME[gone] = PushOutcome.GONE
        call("PUT", "/api/notifications/push/subscription", user, subscription(phone)).statusCode() shouldBe 200
        call("PUT", "/api/notifications/push/subscription", user, subscription(gone)).statusCode() shouldBe 200
        data(call("PUT", "/api/notifications/prefs/savings", user, """{"enabled":true}"""))

        // 끈 사람 — 기기는 있어도 알림이 안 생겨 푸시 0
        val quiet = "push-quiet-${UUID.randomUUID()}"
        val quietDevice = device()
        call("PUT", "/api/notifications/push/subscription", quiet, subscription(quietDevice)).statusCode() shouldBe 200

        listOf(user, quiet).forEach { who ->
            val goal = data(call("POST", "/api/savings/goals", who, """{"title":"제주 여행","template":"travel","targetAmount":300000,"monthlyPlan":100000}""")).path("goal").path("id").asString()
            data(call("POST", "/api/savings/goals/$goal/deposits", who, """{"amount":300000}"""))
        }

        waitFor { SENT.filter { it.first == phone || it.first == gone }.takeIf { it.size == 2 } }
        waitFor { rows(gone).takeIf { it.isEmpty() } }
        val message = SENT.first { it.first == phone }.second
        message shouldBe PushMessage.of(com.salt.notification.domain.NotificationKind.GOAL_REACHED)
        listOf("제주", "300000", "300,000", "travel").forEach { (it in message.title + message.body + message.path) shouldBe false }
        rows(phone) shouldBe listOf(user)

        // 다음 회차들 — 같은 알림을 다시 보내지 않는다
        Thread.sleep(1_000)
        SENT.count { it.first == phone } shouldBe 1
        SENT.count { it.first == quietDevice } shouldBe 0

        // 오래된(30분 넘은) 미표시 알림 — 보내지 않고 표시만
        notificationDatabase.dsl.execute(
            "INSERT INTO notification (id, user_id, kind, source, message_code, params, created_at, expires_at) " +
                "VALUES (?, ?, 'goal_reached', 'savings', 'savings.goal_reached', '{}', now() - interval '31 minutes', now() + interval '1 day')",
            "stale-${UUID.randomUUID()}", user,
        )
        waitFor { notificationDatabase.dsl.fetchCount(notificationDatabase.dsl.selectFrom("notification").where("user_id = ? AND pushed_at IS NULL", user)).takeIf { it == 0 } }
        SENT.count { it.first == phone } shouldBe 1
    }

    private fun <T : Any> waitFor(block: () -> T?): T {
        val until = System.currentTimeMillis() + 15_000
        while (System.currentTimeMillis() < until) {
            runCatching(block).getOrNull()?.let { return it }
            Thread.sleep(100)
        }
        return block() ?: error("15초 안에 조건이 맞지 않았다")
    }

    private val SENT get() = TestPushSender.SENT
    private val OUTCOME get() = TestPushSender.OUTCOME
    private val PUBLIC_KEY get() = PlatformContainers.PUSH_PUBLIC_KEY

    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) = PlatformContainers.register(registry)
    }
}

/**
 * 보내기 포트 가짜 — 밖으로 나가는 요청 0. `@TestConfiguration` 이 아니라 평범한 `@Configuration` 이라 **모든 통합 테스트 컨텍스트가 같이 읽는다**:
 * 컨텍스트를 하나로 둬야 서비스 풀 × 컨텍스트 수가 Postgres 연결 상한을 넘지 않는다(`ContentEndToEndTest` 머리). 구독을 넣는 시험은 이 파일뿐이라 다른 시험엔 영향 0.
 */
@Configuration(proxyBeanMethods = false)
class TestPushSender {
    @Bean
    @Primary
    fun fakePushSender(): PushSender = PushSender { device, message ->
        SENT += device.endpoint to message
        OUTCOME[device.endpoint] ?: PushOutcome.DELIVERED
    }

    companion object {
        val SENT = CopyOnWriteArrayList<Pair<String, PushMessage>>()
        val OUTCOME = ConcurrentHashMap<String, PushOutcome>()
    }
}
