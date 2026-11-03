package com.salt

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import com.salt.ping.api.PingRecordedListener
import com.salt.ping.application.PING_TX
import com.salt.support.messaging.EventSchemaViolation
import com.salt.support.messaging.OutboxWriter
import com.salt.support.persistence.ServiceDatabase
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import org.junit.jupiter.api.Test
import org.springframework.amqp.core.MessageBuilder
import org.springframework.amqp.rabbit.connection.ConnectionFactory
import org.springframework.amqp.rabbit.core.RabbitAdmin
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.support.TransactionTemplate
import tools.jackson.databind.json.JsonMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.file.Files
import java.nio.file.Path
import java.sql.DriverManager
import java.sql.SQLException
import java.util.Date
import java.util.UUID

/**
 * S0 합격선 — 빈 서비스 `ping` 이 인증 → DB → 아웃박스 → 브로커 → 구독 → 추적 ID 연결을 통과한다(`SRV-REQ-043` FR-13).
 * 이벤트 세 수용 기준(`SRV-REQ-044`) · 서비스 계정 권한(`DB-REQ-036`) · Express 골든 오류 바디(`SRV-REQ-043`)도 여기서.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PlatformEndToEndTest {
    @LocalServerPort
    private var port: Int = 0

    @Autowired private lateinit var jsonMapper: JsonMapper

    @Autowired private lateinit var rabbit: RabbitTemplate

    @Autowired private lateinit var connectionFactory: ConnectionFactory

    @Autowired private lateinit var pingDatabase: ServiceDatabase

    @Autowired private lateinit var pingOutbox: OutboxWriter

    @Autowired @Qualifier(PING_TX)
    private lateinit var pingTx: PlatformTransactionManager

    private val http = HttpClient.newHttpClient()

    @Test
    fun `종단 — 요청의 추적 ID 가 구독 쪽까지 이어진다`() {
        val traceId = randomHex(32)
        val created = call("POST", "/api/platform/ping", token("user-e2e"), "00-$traceId-${randomHex(16)}-01")
        created.statusCode() shouldBe 201
        val data = jsonMapper.readTree(created.body()).path("data")
        data.path("traceId").asString() shouldBe traceId
        data.path("previousCount").asLong() shouldBe 0L
        val checkId = data.path("checkId").asString()

        val echo = eventually { jsonMapper.readTree(call("GET", "/api/platform/ping/$checkId", token("user-e2e")).body()).path("data").path("echo").takeIf { !it.isNull && !it.isMissingNode } }
        echo.path("traceId").asString() shouldBe traceId
    }

    @Test
    fun `남의 점검 기록은 없는 것과 같다 — 도메인 오류 바디`() {
        val created = jsonMapper.readTree(call("POST", "/api/platform/ping", token("owner")).body())
        val checkId = created.path("data").path("checkId").asString()
        val response = call("GET", "/api/platform/ping/$checkId", token("someone-else"))
        response.statusCode() shouldBe 404
        // Express 도메인 오류와 같은 순서: details 먼저, success · code · message 가 뒤에서 덮는다
        response.body() shouldBe """{"checkId":"$checkId","success":false,"code":"PING_CHECK_NOT_FOUND","message":"Ping check not found"}"""
    }

    @Test
    fun `오류 바디가 Express 골든과 바이트까지 같다`() {
        call("GET", "/api/platform/ping/x", null).let { it.statusCode() shouldBe 401; it.body() shouldBe golden("401-no-token") }
        call("GET", "/api/platform/ping/x", "abc.def.ghi").let { it.statusCode() shouldBe 401; it.body() shouldBe golden("401-invalid-token") }
        call("GET", "/api/platform/ping/x", token("u", expiresInSeconds = -10)).let { it.statusCode() shouldBe 401; it.body() shouldBe golden("401-expired-token") }
        call("GET", "/api/no-such-route?x=1", token("u")).let { it.statusCode() shouldBe 404; it.body() shouldBe golden("404-no-route") }
    }

    @Test
    fun `트랜잭션이 롤백되면 이벤트도 0`() {
        val before = outboxCount()
        shouldThrow<IllegalStateException> {
            TransactionTemplate(pingTx).executeWithoutResult {
                pingOutbox.append("ping.PingRecorded", mapOf("checkId" to UUID.randomUUID().toString(), "checkedAt" to "2026-11-03T00:00:00Z"))
                error("업무 실패")
            }
        }
        outboxCount() shouldBe before
    }

    @Test
    fun `계약과 다른 본문은 발행되지 않는다`() {
        val before = outboxCount()
        shouldThrow<EventSchemaViolation> {
            TransactionTemplate(pingTx).executeWithoutResult {
                pingOutbox.append("ping.PingRecorded", mapOf("checkId" to "not-a-uuid", "checkedAt" to "2026-11-03T00:00:00Z", "amount" to 1000))
            }
        }
        outboxCount() shouldBe before
    }

    @Test
    fun `아웃박스는 트랜잭션 밖에서 쓰지 못한다`() {
        shouldThrow<IllegalStateException> {
            pingOutbox.append("ping.PingRecorded", mapOf("checkId" to UUID.randomUUID().toString(), "checkedAt" to "2026-11-03T00:00:00Z"))
        }
    }

    @Test
    fun `같은 이벤트가 두 번 와도 구독 결과는 한 번분`() {
        val checkId = jsonMapper.readTree(call("POST", "/api/platform/ping", token("dup")).body()).path("data").path("checkId").asString()
        eventually { echoRows(checkId).takeIf { it == 1 } }

        // 릴레이가 이미 보낸 것과 같은 event_id 로 한 번 더 — 재전송 흉내
        val eventId = pingDatabase.dsl.fetchValue("select event_id from outbox where payload->>'checkId' = ?", checkId) as UUID
        repeat(2) { send(eventId, """{"checkId":"$checkId","checkedAt":"2026-11-03T00:00:00Z"}""") }
        Thread.sleep(1_500)

        echoRows(checkId) shouldBe 1
        pingDatabase.dsl.fetchCount(pingDatabase.dsl.selectFrom("processed_event").where("event_id = ?", eventId)) shouldBe 1
    }

    @Test
    fun `처리 실패는 3회 재시도 뒤 데드레터로`() {
        val dlq = "${PingRecordedListener.QUEUE}.dlq"
        val before = dlqDepth(dlq)
        // 없는 checkId — 되울림 FK 가 실패한다(고쳐질 일이 없는 메시지)
        send(UUID.randomUUID(), """{"checkId":"${UUID.randomUUID()}","checkedAt":"2026-11-03T00:00:00Z"}""")
        eventually { dlqDepth(dlq).takeIf { it == before + 1 } }
    }

    @Test
    fun `서비스 계정은 남의 스키마를 읽지 못한다`() {
        val error = shouldThrow<SQLException> {
            DriverManager.getConnection(PlatformContainers.postgres.jdbcUrl, "svc_ping", PlatformContainers.PING_PASSWORD).use {
                it.createStatement().executeQuery("SELECT * FROM savings.probe")
            }
        }
        error.sqlState shouldBe "42501"
        error.message!! shouldContain "permission denied"
    }

    @Test
    fun `서비스 계정은 자기 스키마 밖에 표를 만들지 못한다`() {
        val error = shouldThrow<SQLException> {
            DriverManager.getConnection(PlatformContainers.postgres.jdbcUrl, "svc_ping", PlatformContainers.PING_PASSWORD).use {
                it.createStatement().execute("CREATE TABLE public.sneaky (id int)")
            }
        }
        error.sqlState shouldBe "42501"
    }

    private fun send(eventId: UUID, body: String) {
        val message = MessageBuilder.withBody(body.toByteArray())
            .setContentType("application/json").setMessageId(eventId.toString()).setType("ping.PingRecorded").build()
        rabbit.send("salt.events", "ping.PingRecorded", message)
    }

    private fun dlqDepth(queue: String): Int = RabbitAdmin(connectionFactory).getQueueInfo(queue)?.messageCount?.toInt() ?: 0

    private fun outboxCount(): Int = pingDatabase.dsl.fetchCount(pingDatabase.dsl.selectFrom("outbox"))

    private fun echoRows(checkId: String): Int =
        pingDatabase.dsl.fetchCount(pingDatabase.dsl.selectFrom("ping_echo").where("check_id = ?::uuid", checkId))

    private fun call(method: String, path: String, bearer: String?, traceParent: String? = null): HttpResponse<String> {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
            .method(method, HttpRequest.BodyPublishers.noBody())
            .apply { bearer?.let { header("Authorization", "Bearer $it") } }
            .apply { traceParent?.let { header("traceparent", it) } }
            .build()
        return http.send(request, HttpResponse.BodyHandlers.ofString())
    }

    /** Express `JwtUtil.generateAccessToken` 과 같은 모양 — HS256 · `userId` · `email` 클레임. */
    private fun token(userId: String, expiresInSeconds: Long = 900): String {
        val now = System.currentTimeMillis()
        val claims = JWTClaimsSet.Builder()
            .claim("userId", userId).claim("email", "$userId@example.com")
            .issueTime(Date(now - 20_000)).expirationTime(Date(now + expiresInSeconds * 1000)).build()
        return SignedJWT(JWSHeader(JWSAlgorithm.HS256), claims).apply { sign(MACSigner(PlatformContainers.JWT_SECRET)) }.serialize()
    }

    private fun golden(name: String): String = Files.readString(Path.of("src/test/resources/golden/express/$name.json"))

    private fun <T : Any> eventually(timeoutMs: Long = 15_000, probe: () -> T?): T {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            probe()?.let { return it }
            Thread.sleep(100)
        }
        return probe() ?: error("${timeoutMs}ms 안에 조건이 맞지 않았다")
    }

    private fun randomHex(length: Int): String = UUID.randomUUID().toString().replace("-", "").repeat(2).take(length)

    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) = PlatformContainers.register(registry)
    }
}
