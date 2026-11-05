package com.salt

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import com.salt.content.application.SyncCatalog
import com.salt.support.persistence.ServiceDatabase
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.matchers.collections.shouldContainAll
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.sql.DriverManager
import java.sql.SQLException
import java.util.Date
import java.util.UUID

/** 두 테스트 클래스가 같이 쓰는 HTTP · 토큰 */
abstract class ContentHttp {
    @LocalServerPort
    protected var port: Int = 0

    @Autowired protected lateinit var jsonMapper: JsonMapper

    private val http = HttpClient.newHttpClient()

    protected fun call(method: String, path: String, user: String?, body: String? = null): HttpResponse<String> {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
            .method(method, body?.let { HttpRequest.BodyPublishers.ofString(it) } ?: HttpRequest.BodyPublishers.noBody())
            .apply { if (user != null) header("Authorization", "Bearer ${token(user)}") }
            .apply { if (body != null) header("Content-Type", "application/json") }
            .build()
        return http.send(request, HttpResponse.BodyHandlers.ofString())
    }

    protected fun data(res: HttpResponse<String>): JsonNode {
        check(res.statusCode() in 200..299) { "${res.statusCode()} ${res.body()}" }
        return jsonMapper.readTree(res.body()).path("data")
    }

    protected fun items(node: JsonNode): List<JsonNode> = (0 until node.size()).map { node.get(it) }

    private fun token(userId: String): String {
        val now = System.currentTimeMillis()
        val claims = JWTClaimsSet.Builder()
            .claim("userId", userId).claim("email", "$userId@example.com")
            .issueTime(Date(now - 20_000)).expirationTime(Date(now + 900_000)).build()
        return SignedJWT(JWSHeader(JWSAlgorithm.HS256), claims).apply { sign(MACSigner(PlatformContainers.JWT_SECRET)) }.serialize()
    }
}

/**
 * 금융 팁 S2a 합격선(`SRV-REQ-047` · `DB-REQ-039`) — 공개 플래그를 켠 실행(`PlatformContainers.register` — 테스트 컨텍스트를 하나로 두려고
 * 모든 통합 테스트가 켠다. 문맥을 하나 더 띄우면 서비스 풀 5개 × 컨텍스트 수가 Postgres 연결 상한을 넘는다). 꺼짐 기본값은 `ContentSettingsSpec`. 실 Postgres(서비스 계정 · Flyway) · RabbitMQ.
 * 발행 검사 · 법적 선 · 유효기한 경계 · 고르기 순서는 도메인 단위 테스트(`ContentSpec`)가, 여기는 경로 · 저장 · 구독 · 권한 · 제약을 본다.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ContentEndToEndTest : ContentHttp() {
    @Autowired @Qualifier("contentDatabase")
    private lateinit var contentDatabase: ServiceDatabase

    @Autowired private lateinit var syncCatalog: SyncCatalog

    @Test
    fun `공개 목록 · 글 — 인증 없이 200 · 메타 전부 · 본문 구조 · 첫 판 이력 · 사용자 데이터 0`() {
        val list = data(call("GET", "/api/content/tips", null))
        list.path("public").asBoolean() shouldBe true
        val slugs = items(list.path("tips")).map { it.path("slug").asString() }
        slugs shouldContainAll listOf("marriage-tax-credit", "housing-subscription-deduction", "deposit-protection-limit", "income-tax-may", "year-end-preview")
        items(list.path("tips")).forEach { tip ->
            listOf("sourceUrl", "sourceName", "writtenOn", "reviewedOn", "baseYear", "validUntil").forEach { tip.path("meta").path(it).isMissingNode shouldBe false }
        }

        val res = call("GET", "/api/content/tips/marriage-tax-credit", null)
        res.statusCode() shouldBe 200
        res.body().contains("userId") shouldBe false
        val tip = data(res)
        tip.path("meta").path("validUntil").asString() shouldBe "2026-12-31"
        items(tip.path("body")).map { it.path("type").asString() }.toSet() shouldBe setOf("heading", "paragraph", "bullets")
        items(tip.path("revisions")).last().path("summary").asString() shouldBe "첫 판"

        call("GET", "/api/content/tips/no-such-tip", null).statusCode() shouldBe 404
        jsonMapper.readTree(call("GET", "/api/content/tips/no-such-tip", null).body()).path("code").asString() shouldBe "TIP_NOT_FOUND"
    }

    @Test
    fun `때맞춘 팁 — 비로그인 401 · 맥락 검사 · 주거 목표를 만들면 주거 글 · 닫으면 다시 안 뜬다`() {
        call("GET", "/api/content/me/tip?context=savings", null).statusCode() shouldBe 401
        call("GET", "/api/content/me/tip?context=nowhere", "u-${UUID.randomUUID()}").statusCode() shouldBe 400

        val user = "tip-${UUID.randomUUID()}"
        val before = data(call("GET", "/api/content/me/tip?context=savings", user)).path("tip")
        if (!before.isNull) before.path("slug").asString() shouldNotBe "housing-subscription-deduction"

        // 저축 서비스에 주거 목표 → savings.GoalCreated → 릴레이 → content 구독 → 신호. 이벤트 트리거가 달 트리거보다 먼저다
        data(call("POST", "/api/savings/goals", user, """{"title":"첫 집","template":"housing","targetAmount":50000000,"monthlyPlan":500000}"""))
        val picked = waitFor { data(call("GET", "/api/content/me/tip?context=savings", user)).path("tip").takeIf { !it.isNull && it.path("slug").asString() == "housing-subscription-deduction" } }
        picked.path("trigger").asString() shouldBe "goal_created:housing"
        picked.path("sourceUrl").asString() shouldContain "law.go.kr"
        // 가계부 맥락엔 그 글이 없다
        data(call("GET", "/api/content/me/tip?context=household", user)).path("tip").let { if (!it.isNull) it.path("slug").asString() shouldNotBe "housing-subscription-deduction" }

        // 닫기 — 두 번 닫아도 같고, 다시 안 뜬다. 남의 신호 · 닫기는 안 보인다
        repeat(2) { data(call("POST", "/api/content/me/tips/housing-subscription-deduction/dismiss", user)).path("dismissed").asBoolean() shouldBe true }
        data(call("GET", "/api/content/me/tip?context=savings", user)).path("tip").let { if (!it.isNull) it.path("slug").asString() shouldNotBe "housing-subscription-deduction" }
        call("POST", "/api/content/me/tips/no-such-tip/dismiss", user).statusCode() shouldBe 404
        contentDatabase.dsl.fetchCount(contentDatabase.dsl.selectFrom("tip_dismissal").where("user_id = ?", user)) shouldBe 1
        contentDatabase.dsl.fetchCount(contentDatabase.dsl.selectFrom("user_signal").where("user_id = ?", user)) shouldBe 1
    }

    @Test
    fun `제도 파라미터 — 기준일 경계 · 없는 키 404 · 틀린 날짜 400 · 인증 없음`() {
        data(call("GET", "/api/content/policy-params/deposit_protection_limit?on=2025-08-31", null)).path("value").asString() shouldBe "50000000"
        data(call("GET", "/api/content/policy-params/deposit_protection_limit?on=2025-09-01", null)).path("value").asString() shouldBe "100000000"
        data(call("GET", "/api/content/policy-params/marriage_tax_credit_per_person?on=2026-12-31", null)).path("validTo").asString() shouldBe "2026-12-31"
        call("GET", "/api/content/policy-params/marriage_tax_credit_per_person?on=2027-01-01", null).statusCode() shouldBe 404
        call("GET", "/api/content/policy-params/deposit_protection_limit?on=2025-13-01", null).statusCode() shouldBe 400
    }

    @Test
    fun `원문 동기화 — 다시 돌려도 이력 · 이벤트 0 · 첫 동기화는 파라미터 줄마다 PolicyParamChanged`() {
        val dsl = contentDatabase.dsl
        val revisions = dsl.fetchCount(dsl.selectFrom("tip_revision"))
        val events = dsl.fetchCount(dsl.selectFrom("outbox").where("event_type = 'content.PolicyParamChanged'"))
        events shouldBe 6
        val again = syncCatalog.execute()
        again.revised shouldBe 0
        again.paramsChanged shouldBe 0
        dsl.fetchCount(dsl.selectFrom("tip_revision")) shouldBe revisions
        dsl.fetchCount(dsl.selectFrom("outbox").where("event_type = 'content.PolicyParamChanged'")) shouldBe events
        dsl.fetchCount(dsl.selectFrom("trigger_rule").where("active")) shouldBe 8
    }

    @Test
    fun `DB 제약 — 메타 빠진 글 INSERT 실패 · 같은 키 구간 겹침 INSERT 실패 · 남의 스키마 읽기 실패`() {
        val c = PlatformContainers.postgres
        DriverManager.getConnection(c.jdbcUrl, "svc_content", PlatformContainers.CONTENT_PASSWORD).use { conn ->
            val missing = shouldThrow<SQLException> {
                conn.createStatement().execute(
                    "INSERT INTO content.tip (slug, title, source_url, source_name, written_on, reviewed_on, base_year, status, content_hash, updated_at) " +
                        "VALUES ('x-tip', 't', 'https://a.go.kr', 's', '2026-01-01', '2026-01-01', 2026, 'published', repeat('a', 64), now())",
                )
            }
            missing.sqlState shouldBe "23502" // valid_until NOT NULL
            val overlap = shouldThrow<SQLException> {
                conn.createStatement().execute(
                    "INSERT INTO content.policy_param (param_key, valid_from, valid_to, num_value, unit, source_url, as_of) " +
                        "VALUES ('deposit_protection_limit', '2025-08-01', '2025-10-01', 1, 'KRW', 'https://www.kdic.or.kr/', '2026-11-05')",
                )
            }
            overlap.sqlState shouldBe "23P01"
            val foreign = shouldThrow<SQLException> { conn.createStatement().executeQuery("SELECT * FROM savings.goal") }
            foreign.sqlState shouldBe "42501"
        }
    }

    private fun <T : Any> waitFor(block: () -> T?): T {
        repeat(60) {
            block()?.let { return it }
            Thread.sleep(250)
        }
        error("15초 안에 조건이 맞지 않았다")
    }

    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) = PlatformContainers.register(registry)
    }
}
