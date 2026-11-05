package com.salt

import com.salt.notification.application.CleanupExpired
import com.salt.support.persistence.ServiceDatabase
import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import java.sql.DriverManager
import java.sql.SQLException
import java.time.Instant
import java.util.UUID

/**
 * 서버 S2c 합격선(`SRV-REQ-048` FR-5 · 수용 기준 "알림 설정 없는 사용자 발송 0") — 실 Postgres(서비스 계정 · Flyway) · RabbitMQ.
 * 세 원천을 실제 길로 잇는다: 저축 적립 → `savings.GoalReached` · 가계부 지출 → `household.FixedCostIncreased` ·
 * **Express 처럼 `coach.outbox` 에 행** → 플랫폼 릴레이(svc_coach) → `coach.DecisionChanged`. 관문 경계는 `NotificationSpec`.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class NotificationEndToEndTest : ContentHttp() {
    @Autowired @Qualifier("notificationDatabase")
    private lateinit var notificationDatabase: ServiceDatabase

    @Autowired private lateinit var cleanup: CleanupExpired

    private val pg = PlatformContainers.postgres

    /** Express coach 가 하는 쓰기 그대로 — DB 소유자 계정 · 열 다섯(`salt-server` `OutboxDecisionChangeNotifier`) */
    private fun expressDecisionChanged(user: String, previous: String = "hold", next: String = "buy"): UUID {
        val id = UUID.randomUUID()
        val payload = """{"decisionId":"${UUID.randomUUID()}","userId":"$user","symbol":"BTC","mode":"scalp","previousAction":"$previous","nextAction":"$next","changedAt":"${Instant.now()}"}"""
        DriverManager.getConnection(pg.jdbcUrl, pg.username, pg.password).use { c ->
            c.prepareStatement("INSERT INTO coach.outbox (event_id, event_type, payload, occurred_at) VALUES (?, 'coach.DecisionChanged', ?::jsonb, now())").apply {
                setObject(1, id)
                setString(2, payload)
                executeUpdate()
            }
        }
        return id
    }

    private fun processed(eventType: String): Int =
        notificationDatabase.dsl.fetchCount(notificationDatabase.dsl.selectFrom("processed_event").where("event_type = ?", eventType))

    private fun prefs(user: String) = items(data(call("GET", "/api/notifications/prefs", user)).path("domains")).associate { it.path("domain").asString() to it.path("enabled").asBoolean() }

    @Test
    fun `설정 없음 — 기본 꺼짐 · 이벤트가 와도 0건 · 목록 · 안 읽은 수 0`() {
        val user = "nt-off-${UUID.randomUUID()}"
        call("GET", "/api/notifications", null).statusCode() shouldBe 401
        prefs(user) shouldBe mapOf("invest" to false, "savings" to false, "household" to false)

        val before = processed("coach.DecisionChanged")
        expressDecisionChanged(user)
        waitFor { processed("coach.DecisionChanged").takeIf { it > before } }
        data(call("GET", "/api/notifications", user)).path("total").asInt() shouldBe 0
        data(call("GET", "/api/notifications/unread-count", user)).path("unreadCount").asInt() shouldBe 0
        notificationDatabase.dsl.fetchCount(notificationDatabase.dsl.selectFrom("notification").where("user_id = ?", user)) shouldBe 0
    }

    @Test
    fun `투자를 켜면 — Express coach 아웃박스 → 릴레이 → signal_update · 2시간 억제 · 같은 이벤트 2회 = 1건 · 읽음`() {
        val user = "nt-invest-${UUID.randomUUID()}"
        data(call("PUT", "/api/notifications/prefs/invest", user, """{"enabled":true}""")).path("domains").get(0).path("enabled").asBoolean() shouldBe true
        call("PUT", "/api/notifications/prefs/nowhere", user, """{"enabled":true}""").statusCode() shouldBe 400
        call("PUT", "/api/notifications/prefs/invest", user, """{}""").statusCode() shouldBe 400

        expressDecisionChanged(user)
        val list = waitFor { data(call("GET", "/api/notifications", user)).takeIf { it.path("total").asInt() == 1 } }
        val item = list.path("items").get(0)
        item.path("kind").asString() shouldBe "signal_update"
        item.path("messageCode").asString() shouldBe "coach.decision_changed"
        item.path("params").path("nextAction").asString() shouldBe "buy"
        item.path("isRead").asBoolean() shouldBe false

        // 2시간 안에 또 바뀜 → 억제(옛 Express 와 같다)
        val before = processed("coach.DecisionChanged")
        expressDecisionChanged(user, "buy", "sell")
        waitFor { processed("coach.DecisionChanged").takeIf { it > before } }
        data(call("GET", "/api/notifications", user)).path("total").asInt() shouldBe 1

        data(call("GET", "/api/notifications/unread-count", user)).path("unreadCount").asInt() shouldBe 1
        data(call("PATCH", "/api/notifications/${item.path("id").asString()}/read", user)).asBoolean() shouldBe true
        data(call("GET", "/api/notifications/unread-count", user)).path("unreadCount").asInt() shouldBe 0
        // 남의 것은 안 보인다 · 끄면 목록에서 빠진다(행은 남는다)
        data(call("GET", "/api/notifications", "nt-other-${UUID.randomUUID()}")).path("total").asInt() shouldBe 0
        data(call("PUT", "/api/notifications/prefs/invest", user, """{"enabled":false}"""))
        data(call("GET", "/api/notifications", user)).path("total").asInt() shouldBe 0
    }

    @Test
    fun `저축 · 가계부를 켜면 — 목표 도달 · 고정비 증가가 코드만으로 · 금액 0`() {
        val user = "nt-money-${UUID.randomUUID()}"
        data(call("PUT", "/api/notifications/prefs/savings", user, """{"enabled":true}"""))
        data(call("PUT", "/api/notifications/prefs/household", user, """{"enabled":true}"""))

        val goal = data(call("POST", "/api/savings/goals", user, """{"title":"비상금","template":"emergency","targetAmount":100000,"monthlyPlan":50000}""")).path("goal").path("id").asString()
        data(call("POST", "/api/savings/goals/$goal/deposits", user, """{"amount":100000}"""))
        val reached = waitFor { data(call("GET", "/api/notifications", user)).path("items").let { n -> items(n).firstOrNull { it.path("kind").asString() == "goal_reached" } } }
        reached.path("params").path("template").asString() shouldBe "emergency"

        // 고정비 — 같은 가맹점 · 비슷한 금액 · 약 30일 간격 세 번, 마지막이 5% 이상 큼
        val today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))
        listOf(62L to 500000, 32L to 500000, 2L to 550000).forEach { (back, amount) ->
            call("POST", "/api/household/expenses", user, """{"amount":$amount,"category":"housing","merchant":"월세","spentOn":"${today.minusDays(back)}"}""").statusCode() shouldBe 201
        }
        val fixed = waitFor { data(call("GET", "/api/notifications", user)).path("items").let { n -> items(n).firstOrNull { it.path("kind").asString() == "fixed_cost_increased" } } }
        fixed.path("params").path("category").asString() shouldBe "housing"
        val body = call("GET", "/api/notifications", user).body()
        listOf("550000", "500000", "월세", "비상금").forEach { (it in body) shouldBe false }

        data(call("PATCH", "/api/notifications/read-all", user)).asBoolean() shouldBe true
        data(call("GET", "/api/notifications/unread-count", user)).path("unreadCount").asInt() shouldBe 0
    }

    @Test
    fun `만료 정리 · 서비스 계정은 남의 스키마를 못 읽는다`() {
        val dsl = notificationDatabase.dsl
        dsl.execute(
            "INSERT INTO notification (id, user_id, kind, source, message_code, params, created_at, expires_at) " +
                "VALUES ('old-1', 'nt-exp', 'signal_update', 'ai_coach', 'coach.decision_changed', '{}', now() - interval '2 days', now() - interval '1 day')",
        )
        (cleanup.execute() >= 1) shouldBe true
        dsl.fetchCount(dsl.selectFrom("notification").where("id = 'old-1'")) shouldBe 0
        val denied = runCatching { dsl.fetch("SELECT * FROM savings.goal LIMIT 1") }.exceptionOrNull()
        (denied?.cause is SQLException || denied is org.jooq.exception.DataAccessException) shouldBe true
    }

    private fun <T : Any> waitFor(block: () -> T?): T {
        val until = System.currentTimeMillis() + 15_000
        while (System.currentTimeMillis() < until) {
            runCatching(block).getOrNull()?.let { return it }
            Thread.sleep(200)
        }
        return block() ?: error("15초 안에 조건이 맞지 않았다")
    }

    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) = PlatformContainers.register(registry)
    }
}
