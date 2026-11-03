package com.salt

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import com.salt.support.persistence.ServiceDatabase
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import org.jooq.DSLContext
import org.jooq.ExecuteContext
import org.jooq.ExecuteListener
import org.jooq.impl.DefaultExecuteListenerProvider
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
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicLong

/**
 * S1a 합격선(`SRV-REQ-045` · `DB-REQ-037`) — 실 Postgres(서비스 계정 · Flyway) · RabbitMQ 로 저축 경로 전부.
 * 계산 경계는 도메인 단위 테스트(`SavingsMathSpec`)가, 여기는 경로 · 저장 · 이벤트 · 권한 · 쿼리 수를 본다.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SavingsEndToEndTest {
    @LocalServerPort
    private var port: Int = 0

    @Autowired private lateinit var jsonMapper: JsonMapper

    @Autowired @Qualifier("savingsDatabase")
    private lateinit var savingsDatabase: ServiceDatabase

    private val http = HttpClient.newHttpClient()

    @Test
    fun `만들기 — 기한만 주면 월 적립을 계산해 저장하고 GoalCreated · ProjectionIssued 를 같은 트랜잭션에 쓴다`() {
        val user = "maker-${UUID.randomUUID()}"
        val res = call("POST", "/api/savings/goals", user, """{"title":"제주 여행","template":"travel","targetAmount":1200000,"targetDate":"2099-01-01"}""")
        res.statusCode() shouldBe 201
        val goal = data(res).path("goal")
        goal.path("template").asString() shouldBe "travel"
        goal.path("status").asString() shouldBe "active"
        goal.path("saved").asLong() shouldBe 0
        goal.path("frame").asString() shouldBe "saved"
        (goal.path("monthlyPlan").asLong() > 0) shouldBe true
        goal.path("projection").path("method").asString() shouldBe "plan_only"
        goal.path("projection").path("reason").asString() shouldBe "history_short"
        // FR-6: 적중 이력이 없으면 이유가 늘 있다
        goal.path("projection").path("trackReason").asString() shouldBe "history_short"
        goal.path("milestone").path("state").asString() shouldBe "under_plan"
        goal.path("degraded").asBoolean() shouldBe false
        goal.path("degradedReasons").size() shouldBe 0

        val id = goal.path("id").asString()
        events(id).toSet() shouldBe setOf("savings.GoalCreated", "savings.ProjectionIssued")
    }

    @Test
    fun `계산 — 저장하지 않는다 · 양방향 · 이자 포함은 이율이 있어야 한다`() {
        val user = "calc-${UUID.randomUUID()}"
        val byMonthly = data(call("POST", "/api/savings/calculate", user, """{"targetAmount":10000000,"monthly":300000}"""))
        byMonthly.path("state").asString() shouldBe "ok"
        byMonthly.path("months").asInt() shouldBe 34
        byMonthly.path("assumptions").path("interestTaxRatePercent").asString() shouldBe "15.4"

        data(call("POST", "/api/savings/calculate", user, """{"targetAmount":1000000,"targetDate":"2000-01-01"}""")).path("state").asString() shouldBe "deadline_too_close"

        call("POST", "/api/savings/calculate", user, """{"targetAmount":1000000,"monthly":10000,"includeInterest":true}""").let {
            it.statusCode() shouldBe 400
            it.body() shouldContain "GOAL_RATE_REQUIRED"
        }
        call("POST", "/api/savings/calculate", user, """{"targetAmount":-1,"monthly":10000}""").statusCode() shouldBe 400
        savingsDatabase.dsl.fetchCount(savingsDatabase.dsl.selectFrom("goal").where("user_id = ?", user)) shouldBe 0
    }

    @Test
    fun `적립 — 달성하면 completed · GoalReached 한 번, 구간을 다시 발행한다`() {
        val user = "dep-${UUID.randomUUID()}"
        val id = create(user, 300_000)
        val first = data(call("POST", "/api/savings/goals/$id/deposits", user, """{"amount":100000}""")).path("goal")
        first.path("saved").asLong() shouldBe 100_000
        first.path("progressPercent").asDouble() shouldBe 33.3
        first.path("progressRatio").asDouble() shouldBe 0.3333
        first.path("milestone").path("deposited").asLong() shouldBe 100_000

        val done = data(call("POST", "/api/savings/goals/$id/deposits", user, """{"amount":250000,"note":"보너스"}"""))
        done.path("goal").path("status").asString() shouldBe "completed"
        done.path("goal").path("remaining").asLong() shouldBe 0
        done.path("goal").path("progressPercent").asDouble() shouldBe 100.0
        done.path("goal").path("frame").asString() shouldBe "remaining"
        done.path("deposits").size() shouldBe 2
        // 다 찬 뒤 넣어도 달성은 한 번
        call("POST", "/api/savings/goals/$id/deposits", user, """{"amount":1000}""").statusCode() shouldBe 201

        val types = events(id)
        types.count { it == "savings.GoalReached" } shouldBe 1
        types.count { it == "savings.ProjectionIssued" } shouldBe 4
    }

    @Test
    fun `동시 적립 두 건이 같이 목표를 채워도 GoalReached 는 한 번`() {
        val user = "race-${UUID.randomUUID()}"
        val id = create(user, 200_000)
        val pool = Executors.newFixedThreadPool(2)
        val results = pool.invokeAll(List(2) { Callable { call("POST", "/api/savings/goals/$id/deposits", user, """{"amount":150000}""").statusCode() } })
        pool.shutdown()
        results.map { it.get() } shouldBe listOf(201, 201)
        events(id).count { it == "savings.GoalReached" } shouldBe 1
    }

    @Test
    fun `나눠 넣기 — 합이 맞아야 하고 한 묶음 id 를 같이 쓴다`() {
        val user = "split-${UUID.randomUUID()}"
        val a = create(user, 1_000_000)
        val b = create(user, 1_000_000)
        call("POST", "/api/savings/deposits/split", user, """{"total":100000,"parts":[{"goalId":"$a","amount":60000},{"goalId":"$b","amount":30000}]}""").let {
            it.statusCode() shouldBe 400
            it.body() shouldContain "SPLIT_SUM_MISMATCH"
        }
        val ok = data(call("POST", "/api/savings/deposits/split", user, """{"total":100000,"parts":[{"goalId":"$a","amount":60000},{"goalId":"$b","amount":40000}]}"""))
        val group = ok.path("splitGroupId").asString()
        items(ok.path("goals")).map { it.path("goal").path("saved").asLong() } shouldBe listOf(60_000L, 40_000L)
        savingsDatabase.dsl.fetchCount(savingsDatabase.dsl.selectFrom("deposit").where("split_group_id = ?::uuid", group)) shouldBe 2
        // 실패한 첫 요청은 아무것도 남기지 않았다
        savingsDatabase.dsl.fetchCount(savingsDatabase.dsl.selectFrom("deposit").where("user_id = ?", user)) shouldBe 2
    }

    @Test
    fun `남의 목표는 없는 것과 같다 — 읽기 · 적립 · 나눠 넣기 모두 404`() {
        val owner = "owner-${UUID.randomUUID()}"
        val id = create(owner, 500_000)
        call("GET", "/api/savings/goals/$id", "intruder", null).statusCode() shouldBe 404
        call("POST", "/api/savings/goals/$id/deposits", "intruder", """{"amount":1000}""").statusCode() shouldBe 404
        call("GET", "/api/savings/goals/not-a-uuid", owner, null).statusCode() shouldBe 404
        data(call("GET", "/api/savings/goals", "intruder", null)).size() shouldBe 0
    }

    @Test
    fun `목록 · 홈 카드 — 목록은 쿼리 3회, 홈 카드는 진척이 가장 큰 진행 중 목표`() {
        val user = "list-${UUID.randomUUID()}"
        val small = create(user, 10_000_000)
        val near = create(user, 1_000_000)
        call("POST", "/api/savings/goals/$near/deposits", user, """{"amount":500000}""")
        call("POST", "/api/savings/goals/$small/deposits", user, """{"amount":100000}""")

        val list = data(call("GET", "/api/savings/goals", user, null))
        list.size() shouldBe 2
        val card = data(call("GET", "/api/savings/home-card", user, null))
        card.path("totalGoals").asInt() shouldBe 2
        card.path("activeGoals").asInt() shouldBe 2
        card.path("totalSaved").asLong() shouldBe 600_000
        card.path("nearest").path("goalId").asString() shouldBe near
        card.path("nearest").path("progressPercent").asDouble() shouldBe 50.0

        data(call("GET", "/api/savings/home-card", "nobody-${UUID.randomUUID()}", null)).path("totalSaved").isNull shouldBe true

        val before = statements()
        call("GET", "/api/savings/goals", user, null).statusCode() shouldBe 200
        (statements() - before) shouldBe 3L
    }

    @Test
    fun `템플릿 7종 — 기준선은 원문 대조 전이라 금액 없이 이유만`() {
        val templates = data(call("GET", "/api/savings/templates", "t", null))
        items(templates).map { it.path("key").asString() } shouldBe listOf("wedding", "housing", "first_car", "travel", "emergency", "childbirth", "other")
        items(templates).all { it.path("baseline").isNull && it.path("baselineReason").asString() == "unverified_source" } shouldBe true
    }

    @Test
    fun `구간 발행 기록은 고칠 수도 지울 수도 없다(DB-REQ-037 FR-3)`() {
        val id = create("immut-${UUID.randomUUID()}", 100_000)
        val update = shouldThrow<Exception> { savingsDatabase.dsl.execute("update projection_issued set reason = 'x' where goal_id = ?::uuid", id) }
        update.message!! shouldContain "append-only"
        shouldThrow<Exception> { savingsDatabase.dsl.execute("delete from projection_issued where goal_id = ?::uuid", id) }.message!! shouldContain "append-only"
    }

    @Test
    fun `savings 계정은 남의 스키마를, ping 계정은 savings 를 읽지 못한다`() {
        shouldThrow<SQLException> {
            DriverManager.getConnection(PlatformContainers.postgres.jdbcUrl, "svc_ping", PlatformContainers.PING_PASSWORD).use {
                it.createStatement().executeQuery("SELECT * FROM savings.goal")
            }
        }.sqlState shouldBe "42501"
        shouldThrow<SQLException> {
            DriverManager.getConnection(PlatformContainers.postgres.jdbcUrl, "svc_savings", PlatformContainers.SAVINGS_PASSWORD).use {
                it.createStatement().executeQuery("SELECT * FROM ping.ping_check")
            }
        }.sqlState shouldBe "42501"
    }

    // ---------- 도우미 ----------

    private fun create(user: String, target: Long): String =
        data(call("POST", "/api/savings/goals", user, """{"title":"목표","template":"other","targetAmount":$target,"monthlyPlan":100000}""")).path("goal").path("id").asString()

    /** 그 목표의 아웃박스 이벤트 종류(쓴 순서) */
    private fun events(goalId: String): List<String> =
        savingsDatabase.dsl.fetch("select event_type from outbox where payload->>'goalId' = ? order by seq", goalId).map { it.get(0, String::class.java) }

    /** savings DSL 이 실행한 SQL 문장 수 — jOOQ 실행 리스너를 처음 부를 때 한 번 단다(트랜잭션 BEGIN/COMMIT 은 세지 않는다) */
    private fun statements(): Long {
        QueryCounter.install(savingsDatabase.dsl)
        return QueryCounter.count.get()
    }

    private object QueryCounter : ExecuteListener {
        val count = AtomicLong()
        private var installed = false

        @Synchronized
        fun install(dsl: DSLContext) {
            if (installed) return
            val configuration = dsl.configuration()
            configuration.set(*(configuration.executeListenerProviders() + DefaultExecuteListenerProvider(this)))
            installed = true
        }

        override fun executeStart(ctx: ExecuteContext) {
            count.incrementAndGet()
        }
    }

    /** Jackson 3 JsonNode 의 map 은 컬렉션 map 이 아니다 — 배열을 리스트로 */
    private fun items(node: JsonNode): List<JsonNode> = (0 until node.size()).map { node.get(it) }

    private fun data(res: HttpResponse<String>): JsonNode {
        check(res.statusCode() in 200..299) { "${res.statusCode()} ${res.body()}" }
        return jsonMapper.readTree(res.body()).path("data")
    }

    private fun call(method: String, path: String, user: String, body: String?): HttpResponse<String> {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
            .method(method, body?.let { HttpRequest.BodyPublishers.ofString(it) } ?: HttpRequest.BodyPublishers.noBody())
            .header("Authorization", "Bearer ${token(user)}")
            .apply { if (body != null) header("Content-Type", "application/json") }
            .build()
        return http.send(request, HttpResponse.BodyHandlers.ofString())
    }

    private fun token(userId: String): String {
        val now = System.currentTimeMillis()
        val claims = JWTClaimsSet.Builder()
            .claim("userId", userId).claim("email", "$userId@example.com")
            .issueTime(Date(now - 20_000)).expirationTime(Date(now + 900_000)).build()
        return SignedJWT(JWSHeader(JWSAlgorithm.HS256), claims).apply { sign(MACSigner(PlatformContainers.JWT_SECRET)) }.serialize()
    }

    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) = PlatformContainers.register(registry)
    }
}
