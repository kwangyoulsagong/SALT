package com.salt

import com.salt.support.persistence.PersonalData
import com.salt.support.persistence.ServiceDatabase
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContainExactlyInAnyOrder
import io.kotest.matchers.maps.shouldBeEmpty
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import tools.jackson.databind.JsonNode
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.UUID

/**
 * 서버 S3c 합격선(`SRV-REQ-048` FR-3 · 4 · `DB-REQ-040` FR-4) — 실 Postgres(서비스 계정 · Flyway) · 실 HTTP.
 *
 * 불변식 셋
 * 1. **스키마의 모든 표는 "사람 행" 이거나 "개인 데이터 아님(이유)"이다** — 새 표를 적지 않으면 여기서 깬다
 * 2. **접근 토큰 하나로는 아무것도 지울 수 없다** — 비밀번호를 다시 친 지우기 허가(같은 사람)가 같이 와야 한다
 * 3. **지운 뒤 그 사람 행 0 · 남의 행 그대로 · 지운 계정은 토큰을 다시 못 받는다**
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class MyDataEndToEndTest : ContentHttp() {
    @Autowired private lateinit var sources: List<PersonalData>

    @Autowired @Qualifier("identityDatabase")
    private lateinit var identityDatabase: ServiceDatabase

    @Autowired @Qualifier("householdDatabase")
    private lateinit var householdDatabase: ServiceDatabase

    @Autowired @Qualifier("savingsDatabase")
    private lateinit var savingsDatabase: ServiceDatabase

    @Autowired private lateinit var identityRecords: com.salt.identity.infrastructure.IdentityPersonalRecords

    private val http = HttpClient.newHttpClient()
    private val identityRows by lazy { com.salt.identity.infrastructure.IdentityUserRows.of(identityDatabase.dsl) }

    private data class Person(val id: String, val email: String, val access: String, val refresh: String)

    private fun raw(method: String, path: String, bearer: String?, body: String? = null, grant: String? = null): HttpResponse<String> {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
            .method(method, body?.let { HttpRequest.BodyPublishers.ofString(it) } ?: HttpRequest.BodyPublishers.noBody())
            .apply { if (bearer != null) header("Authorization", "Bearer $bearer") }
            .apply { if (body != null) header("Content-Type", "application/json") }
            .apply { if (grant != null) header("X-Salt-Erase", grant) }
            .build()
        return http.send(request, HttpResponse.BodyHandlers.ofString())
    }

    private fun ok(res: HttpResponse<String>): JsonNode {
        check(res.statusCode() in 200..299) { "${res.statusCode()} ${res.body()}" }
        return jsonMapper.readTree(res.body()).path("data")
    }

    private fun register(): Person {
        val code = UUID.randomUUID().toString().replace("-", "").take(8).uppercase()
        identityDatabase.dsl.execute(
            "INSERT INTO invite_codes (id, code, expires_at, created_at) VALUES (?, ?, now() + interval '1 hour', now())",
            UUID.randomUUID().toString(), code,
        )
        val email = "s3c-${UUID.randomUUID()}@example.com"
        val data = ok(raw("POST", "/api/auth/invite/accept", null, """{"code":"$code","email":"$email","nickname":"지우기","password":"password-123"}"""))
        return Person(data.path("user").path("id").asString(), email, data.path("accessToken").asString(), data.path("refreshToken").asString())
    }

    /** 서비스마다 사람 행을 하나 이상 — 덧붙이기만 원장(전망 · 착지)과 아웃박스까지 생기는 경로로 */
    private fun fill(p: Person) {
        val goal = ok(raw("POST", "/api/savings/goals", p.access, """{"title":"여행","template":"travel","targetAmount":1000000,"targetDate":"2099-01-01"}""")).path("goal").path("id").asString()
        ok(raw("POST", "/api/savings/goals/$goal/deposits", p.access, """{"amount":10000}"""))
        ok(raw("GET", "/api/savings/goals/$goal", p.access))
        ok(raw("POST", "/api/household/expenses", p.access, """{"amount":12000,"category":"food","merchant":"김밥"}"""))
        ok(raw("POST", "/api/content/me/tips/housing-subscription-deduction/dismiss", p.access))
        ok(raw("PUT", "/api/notifications/prefs/savings", p.access, """{"enabled":true}"""))
        ok(raw("PUT", "/api/identity/shell/domains", p.access, """{"domains":["savings","household"]}"""))
    }

    private fun services(): List<String> = sources.map { it.service }

    private fun grantFor(p: Person): String = ok(raw("POST", "/api/identity/me/erase-grant", p.access, """{"password":"password-123"}""")).path("eraseToken").asString()

    @Test
    fun `모든 표는 사람 행이거나 이유가 적힌 개인 데이터 아님이다 — 서비스마다 · identity 포함`() {
        services() shouldContainExactlyInAnyOrder listOf("ping", "savings", "household", "content", "notification", "coach")
        for (source in sources) {
            withClue(source.service) { source.rows.uncovered().shouldBeEmpty() }
        }
        identityRows.uncovered().shouldBeEmpty()
    }

    @Test
    fun `내보내기 — 서비스마다 내 행만 · 비밀번호 해시 0 · 남의 행 0`() {
        val me = register()
        val other = register()
        fill(me)
        fill(other)

        val savings = ok(raw("GET", "/api/savings/me/data", me.access))
        savings.path("service").asString() shouldBe "savings"
        val goalTable = savings.path("tables").first { it.path("name").asString() == "goal" }
        goalTable.path("rows").size() shouldBe 1
        val userCol = items(goalTable.path("columns")).map { it.asString() }.indexOf("user_id")
        goalTable.path("rows").get(0).get(userCol).asString() shouldBe me.id
        // 시각은 UTC(README 가 그렇게 적는다) — DB 세션 시간대가 붙어 나오지 않는다
        val createdCol = items(goalTable.path("columns")).map { it.asString() }.indexOf("created_at")
        goalTable.path("rows").get(0).get(createdCol).asString().endsWith("Z") shouldBe true
        // 금액은 글자 — JSON 숫자 변환에서 정밀도가 바뀌지 않게
        val depositTable = savings.path("tables").first { it.path("name").asString() == "deposit" }
        depositTable.path("rows").get(0).get(items(depositTable.path("columns")).map { it.asString() }.indexOf("amount")).isString shouldBe true
        // 아웃박스는 내보내지 않는다(사람이 읽는 기록이 아니다)
        ("outbox" in items(savings.path("tables")).map { it.path("name").asString() }) shouldBe false

        for (service in services()) {
            val body = raw("GET", "/api/$service/me/data", me.access).body()
            body shouldNotContain2 other.id
        }
        val identity = ok(raw("GET", "/api/identity/me/data", me.access))
        val users = identity.path("tables").first { it.path("name").asString() == "users" }
        ("password_hash" in items(users.path("columns")).map { it.asString() }) shouldBe false
        users.path("rows").get(0).get(1).asString() shouldBe me.email
        raw("GET", "/api/identity/me/data", me.access).body() shouldNotContain2 "\$2"

        raw("GET", "/api/nowhere/me/data", me.access).statusCode() shouldBe 404
        raw("GET", "/api/savings/me/data", null).statusCode() shouldBe 401
    }

    @Test
    fun `지우기 — 허가 없이는 403 · 비밀번호 틀리면 403 · 남의 허가 403 · 접근 토큰을 허가로 403`() {
        val me = register()
        val other = register()
        fill(me)
        raw("DELETE", "/api/savings/me/data", me.access).let {
            it.statusCode() shouldBe 403
            jsonMapper.readTree(it.body()).path("code").asString() shouldBe "ERASE_GRANT_REQUIRED"
        }
        raw("DELETE", "/api/savings/me/data", me.access, grant = me.access).statusCode() shouldBe 403
        raw("DELETE", "/api/savings/me/data", me.access, grant = me.refresh).statusCode() shouldBe 403
        raw("DELETE", "/api/savings/me/data", me.access, grant = grantFor(other)).statusCode() shouldBe 403
        raw("POST", "/api/identity/me/erase-grant", me.access, """{"password":"wrong-pass"}""").let {
            it.statusCode() shouldBe 403
            jsonMapper.readTree(it.body()).path("code").asString() shouldBe "REAUTH_FAILED"
        }
        // 허가는 API 경로를 지나지 못한다(받는 쪽이 다르다)
        raw("GET", "/api/savings/me/data", grantFor(me)).statusCode() shouldBe 401
        raw("DELETE", "/api/identity/me", me.access, """{"deleted":{}}""").statusCode() shouldBe 403
        // 아무것도 안 지워졌다
        sources.first { it.service == "savings" }.rows.remaining(me.id).isEmpty() shouldBe false
    }

    @Test
    fun `계정 삭제 — 서비스마다 지우고 마지막에 계정 · 행 0 · 남의 행 그대로 · 기록에 사람 칸 0 · 토큰 갱신 401`() {
        val me = register()
        val other = register()
        fill(me)
        fill(other)
        val otherBefore = sources.associate { it.service to it.rows.remaining(other.id) }
        householdDatabase.dsl.fetchCount(householdDatabase.dsl.selectFrom("landing_issued").where("user_id = ?", me.id)) shouldBe 1

        val grant = grantFor(me)
        val counts = services().associateWith { service ->
            ok(raw("DELETE", "/api/$service/me/data", me.access, grant = grant)).path("deleted").let { node ->
                node.propertyNames().associateWith { node.path(it).asInt() }
            }
        }
        (counts.getValue("savings").getValue("projection_issued") >= 1) shouldBe true
        counts.getValue("household").getValue("landing_issued") shouldBe 1
        counts.getValue("household").getValue("expense") shouldBe 1
        (counts.getValue("savings").getValue("outbox") >= 2) shouldBe true
        // 다시 불러도 안전 — 두 번째는 0
        services().forEach { service ->
            ok(raw("DELETE", "/api/$service/me/data", me.access, grant = grant)).path("deleted").let { node ->
                node.propertyNames().map { node.path(it).asInt() }.sum() shouldBe 0
            }
        }
        // 덧붙이기만 원장은 허가된 지우기 밖에서는 여전히 못 고치고 못 지운다
        shouldThrow<Exception> { householdDatabase.dsl.execute("DELETE FROM landing_issued WHERE user_id = ?", other.id) }.message!! shouldContain "append-only"
        shouldThrow<Exception> { savingsDatabase.dsl.execute("UPDATE projection_issued SET reason = 'x'") }.message!! shouldContain "append-only"
        // 지우기 표지를 켠 트랜잭션에서도 고치기는 막힌다 — 예외는 DELETE 하나뿐
        for (db in listOf(savingsDatabase to "UPDATE projection_issued SET reason = 'x'", householdDatabase to "UPDATE landing_issued SET reason = 'x'")) {
            shouldThrow<Exception> {
                db.first.dsl.transaction { tx ->
                    tx.dsl().execute("SET LOCAL salt.erase = 'on'")
                    tx.dsl().execute(db.second)
                }
            }.message!! shouldContain "append-only"
        }

        val identity = ok(raw("DELETE", "/api/identity/me", me.access, """{"deleted":${jsonMapper.writeValueAsString(counts)}}""", grant)).path("deleted")
        identity.path("users").asInt() shouldBe 1
        identity.path("invite_codes").asInt() shouldBe 1
        identity.path("outbox").asInt() shouldBe 1

        for (source in sources) withClue(source.service) { source.rows.remaining(me.id).shouldBeEmpty() }
        identityRows.remaining(me.id).shouldBeEmpty()
        sources.associate { it.service to it.rows.remaining(other.id) } shouldBe otherBefore
        identityRecords.export(other.id).first { it.name == "users" }.rows.size shouldBe 1

        val log = identityDatabase.dsl.fetch("SELECT counts::text FROM account_deletion_log ORDER BY deleted_at DESC LIMIT 1").first().get(0, String::class.java)
        log shouldNotContain2 me.id
        log shouldNotContain2 me.email
        jsonMapper.readTree(log).path("household").path("landing_issued").asInt() shouldBe 1
        jsonMapper.readTree(log).path("identity").path("users").asInt() shouldBe 1

        raw("POST", "/api/auth/refresh", null, """{"refreshToken":"${me.refresh}"}""").statusCode() shouldBe 401
        raw("POST", "/api/auth/login", null, """{"email":"${me.email}","password":"password-123"}""").statusCode() shouldBe 401
        raw("POST", "/api/identity/me/erase-grant", me.access, """{"password":"password-123"}""").statusCode() shouldBe 401
        // 남은 사람은 그대로 갱신된다
        raw("POST", "/api/auth/refresh", null, """{"refreshToken":"${other.refresh}"}""").statusCode() shouldBe 200
    }

    @Test
    fun `삭제 기록 모양 — 이름 · 행 수가 아니면 400 · 아무것도 안 지운다`() {
        val me = register()
        fill(me)
        val grant = grantFor(me)
        raw("DELETE", "/api/identity/me", me.access, """{"deleted":{"Bad Name":{"x":1}}}""", grant).statusCode() shouldBe 400
        raw("DELETE", "/api/identity/me", me.access, """{"deleted":{"savings":{"goal":-1}}}""", grant).statusCode() shouldBe 400
        identityRecords.export(me.id).first { it.name == "users" }.rows.size shouldBe 1
    }

    private infix fun String.shouldNotContain2(part: String) {
        (this.contains(part)) shouldBe false
    }

    private fun <T> withClue(clue: String, block: () -> T): T = io.kotest.assertions.withClue(clue, block)

    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) = PlatformContainers.register(registry)
    }
}
