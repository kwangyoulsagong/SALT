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
        // 대소문자만 다른 같은 목표 — 파싱한 id 로 비교해 거부(코드 리뷰)
        call("POST", "/api/savings/deposits/split", user, """{"total":2,"parts":[{"goalId":"$a","amount":1},{"goalId":"${a.uppercase()}","amount":1}]}""").let {
            it.statusCode() shouldBe 400
            it.body() shouldContain "SPLIT_DUPLICATE_GOAL"
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
    fun `목록 · 홈 카드 — 목록은 쿼리 3회(실물 단위 포함), 홈 카드는 진척이 가장 큰 진행 중 목표`() {
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

        // 목록과 상세가 같은 구간을 보인다 — 둘 다 지금 기준으로 다시 계산(코드 리뷰: 목록은 빈 기록, 상세는 실제 기록이었다)
        val listed = items(list).first { it.path("id").asString() == near }.path("projection")
        val detailed = data(call("GET", "/api/savings/goals/$near", user, null)).path("goal").path("projection")
        listed shouldBe detailed
        listed.has("issuedAt") shouldBe false

        // 온보딩 프로브용 존재 확인
        data(call("GET", "/api/savings/goals/exists", user, null)).path("exists").asBoolean() shouldBe true
        data(call("GET", "/api/savings/goals/exists", "nobody-${UUID.randomUUID()}", null)).path("exists").asBoolean() shouldBe false

        // 한 문장 집계(overviewByGoal, 목록 · 저울)가 목표 하나 집계(상세 · 쓰기)와 같은 값 — FR-19 를 지키려 합친 것, 값이 갈라지면 안 된다
        val deposits = com.salt.savings.infrastructure.JooqDeposits(savingsDatabase.dsl)
        val month = java.time.YearMonth.now(java.time.ZoneId.of("Asia/Seoul"))
        val overview = deposits.overviewByGoal(user, month)
        listOf(small, near).forEach { raw ->
            val id = com.salt.savings.domain.GoalId.parse(raw)!!
            overview.totals[id] shouldBe deposits.totalsFor(id, month)
            overview.monthly[id] shouldBe deposits.monthly(id)
        }

        val before = statements()
        call("GET", "/api/savings/goals", user, null).statusCode() shouldBe 200
        (statements() - before) shouldBe 3L
    }

    @Test
    fun `재미 — 첫 도장 · 장면 단계 · 실물 환산 한 줄 · 다 차면 엽서`() {
        val user = "fun-${UUID.randomUUID()}"
        val id = data(call("POST", "/api/savings/goals", user, """{"title":"제주","template":"travel","targetAmount":1000000,"monthlyPlan":100000}"""))
            .path("goal").path("id").asString()
        val fresh = data(call("GET", "/api/savings/goals/$id", user, null))
        fresh.path("goal").path("stampCount").asInt() shouldBe 1
        fresh.path("goal").path("scene").path("kind").asString() shouldBe "trip"
        fresh.path("goal").path("scene").path("step").asInt() shouldBe 0
        fresh.path("goal").path("scene").path("steps").asInt() shouldBe 10
        fresh.path("goal").path("postcard").isNull shouldBe true
        fresh.path("goal").path("unitLine").isNull shouldBe true
        fresh.path("missedMonths").path("skippedMonths").asInt() shouldBe 0

        call("POST", "/api/savings/goals/$id/deposits", user, """{"amount":350000}""").statusCode() shouldBe 201
        val unit = call("POST", "/api/savings/goals/$id/units", user, """{"name":"제주 왕복","unitPrice":120000}""")
        unit.statusCode() shouldBe 201
        val withUnit = data(unit)
        withUnit.path("units").size() shouldBe 1
        withUnit.path("unitLimit").asInt() shouldBe 3
        withUnit.path("units").get(0).path("count").asLong() shouldBe 2
        withUnit.path("goal").path("unitLine").path("name").asString() shouldBe "제주 왕복"
        withUnit.path("goal").path("stampCount").asInt() shouldBe 2
        withUnit.path("goal").path("scene").path("step").asInt() shouldBe 3

        // 단위는 목표 하나에 3개까지 — 넷째는 409
        repeat(2) { call("POST", "/api/savings/goals/$id/units", user, """{"name":"단위$it","unitPrice":1000}""").statusCode() shouldBe 201 }
        val over = call("POST", "/api/savings/goals/$id/units", user, """{"name":"넷째","unitPrice":1000}""")
        over.statusCode() shouldBe 409
        over.body() shouldContain "UNIT_LIMIT"
        val unitId = withUnit.path("units").get(0).path("id").asString()
        // 남의 단위는 지울 수 없다
        call("DELETE", "/api/savings/goals/$id/units/$unitId", "other-${UUID.randomUUID()}", null).statusCode() shouldBe 404
        data(call("DELETE", "/api/savings/goals/$id/units/$unitId", user, null)).path("units").size() shouldBe 2

        val done = data(call("POST", "/api/savings/goals/$id/deposits", user, """{"amount":650000}""")).path("goal")
        done.path("status").asString() shouldBe "completed"
        done.path("scene").path("step").asInt() shouldBe 10
        done.path("postcard").path("depositCount").asInt() shouldBe 2
        done.path("postcard").path("daysTaken").asLong() shouldBe 0
    }

    @Test
    fun `저울 — 저장하지 않고 목표마다 구간 변화, 확정하면 진행 중 목표 계획만 바꾸고 구간을 다시 발행한다`() {
        val user = "scale-${UUID.randomUUID()}"
        val a = create(user, 2_000_000)
        val b = create(user, 1_200_000)
        val sim = data(call("POST", "/api/savings/simulate", user, """{"changes":[{"goalId":"$a","monthly":200000},{"goalId":"$b","monthly":50000}]}"""))
        sim.path("totalMonthlyBefore").asLong() shouldBe 200_000
        sim.path("totalMonthlyAfter").asLong() shouldBe 250_000
        val rowA = items(sim.path("rows")).first { it.path("goalId").asString() == a }
        // 남은 200만 — 월 10만 20달 → 월 20만 10달: 10달 당겨짐
        rowA.path("planShiftMonths").asLong() shouldBe -10
        val rowB = items(sim.path("rows")).first { it.path("goalId").asString() == b }
        rowB.path("planShiftMonths").asLong() shouldBe 12
        // 저장하지 않았다
        data(call("GET", "/api/savings/goals/$a", user, null)).path("goal").path("monthlyPlan").asLong() shouldBe 100_000

        val issuedBefore = events(a).count { it == "savings.ProjectionIssued" }
        val updated = data(call("PUT", "/api/savings/goals/plans", user, """{"changes":[{"goalId":"$a","monthly":200000}]}"""))
        items(updated).first { it.path("id").asString() == a }.path("monthlyPlan").asLong() shouldBe 200_000
        items(updated).first { it.path("id").asString() == b }.path("monthlyPlan").asLong() shouldBe 100_000
        events(a).count { it == "savings.ProjectionIssued" } shouldBe issuedBefore + 1

        // 기한 목표 — 저울은 막지 않고 기한을 맞추는지 사실로. 확정하면 목표 응답에도 같은 사실
        val due = data(call("POST", "/api/savings/goals", user, """{"title":"기한","template":"other","targetAmount":1200000,"targetDate":"2099-01-01"}""")).path("goal")
        due.path("planMeetsDeadline").asBoolean() shouldBe true
        val dueId = due.path("id").asString()
        val dueRow = items(data(call("POST", "/api/savings/simulate", user, """{"changes":[{"goalId":"$dueId","monthly":1}]}""")).path("rows"))
            .first { it.path("goalId").asString() == dueId }
        dueRow.path("deadlineMonth").asString() shouldBe "2099-01"
        dueRow.path("afterMeetsDeadline").asBoolean() shouldBe false
        items(data(call("PUT", "/api/savings/goals/plans", user, """{"changes":[{"goalId":"$dueId","monthly":1}]}""")))
            .first { it.path("id").asString() == dueId }.path("planMeetsDeadline").asBoolean() shouldBe false

        // 남의 목표 · 없는 목표는 404, 같은 목표 두 번은 400
        call("POST", "/api/savings/simulate", "other-${UUID.randomUUID()}", """{"changes":[{"goalId":"$a","monthly":1000}]}""").statusCode() shouldBe 404
        call("PUT", "/api/savings/goals/plans", "other-${UUID.randomUUID()}", """{"changes":[{"goalId":"$a","monthly":1000}]}""").statusCode() shouldBe 404
        call("POST", "/api/savings/simulate", user, """{"changes":[{"goalId":"$a","monthly":1000},{"goalId":"$a","monthly":2000}]}""").statusCode() shouldBe 400
    }

    @Test
    fun `비상시 비교 — 저장하지 않는다 · 꺼내기 이동 달 · 대출 상환은 올림 · 모은 돈보다 많이 꺼낼 수 없다`() {
        val user = "emergency-${UUID.randomUUID()}"
        val id = create(user, 3_000_000)
        call("POST", "/api/savings/goals/$id/deposits", user, """{"amount":1000000}""")
        val c = data(call("POST", "/api/savings/goals/$id/emergency-compare", user, """{"amount":1000000,"loanRate":6,"loanMonths":12}"""))
        c.path("withdraw").path("delayMonths").asInt() shouldBe 10
        c.path("loan").path("firstPayment").asLong() shouldBe 86_067
        c.path("loan").path("firstMonths").asInt() shouldBe 5
        c.path("loan").path("restPayment").asLong() shouldBe 86_066
        c.path("loan").path("restMonths").asInt() shouldBe 7
        c.path("loan").path("totalInterest").asLong() shouldBe 32_797
        // 나눌 수 없는 작은 금액 — 요청은 성공, 대출 칸만 비고 꺼내기 칸은 남는다(리뷰)
        val tiny = data(call("POST", "/api/savings/goals/$id/emergency-compare", user, """{"amount":1,"loanRate":0,"loanMonths":120}"""))
        tiny.path("loan").isNull shouldBe true
        tiny.path("loanReason").asString() shouldBe "amount_too_small"
        tiny.path("withdraw").path("delayMonths").isNumber shouldBe true
        tiny.path("assumptions").size() shouldBe 0
        c.path("loan").path("annualRate").asString() shouldBe "6"
        items(c.path("assumptions")).map { it.asString() } shouldBe listOf("loan_paid_outside_goal")
        data(call("GET", "/api/savings/goals/$id", user, null)).path("goal").path("saved").asLong() shouldBe 1_000_000

        val over = call("POST", "/api/savings/goals/$id/emergency-compare", user, """{"amount":1000001,"loanRate":6,"loanMonths":12}""")
        over.statusCode() shouldBe 400
        over.body() shouldContain "EMERGENCY_AMOUNT_OVER_SAVED"
        // 범위는 도메인이 사유 코드로 — 일반 VALIDATION 이 아니다(화면이 사유 문장을 고른다)
        call("POST", "/api/savings/goals/$id/emergency-compare", user, """{"amount":1000,"loanRate":35,"loanMonths":12}""").body() shouldContain "EMERGENCY_RATE_INVALID"
        call("POST", "/api/savings/goals/$id/emergency-compare", user, """{"amount":1000,"loanRate":5,"loanMonths":121}""").body() shouldContain "EMERGENCY_MONTHS_INVALID"
        call("POST", "/api/savings/goals/$id/emergency-compare", "other-${UUID.randomUUID()}", """{"amount":1,"loanRate":6,"loanMonths":12}""")
            .statusCode() shouldBe 404
    }

    @Test
    fun `100년 못 닿는 구간(not_reachable)도 발행 이벤트 계약을 통과한다 — 적립이 롤백되지 않는다`() {
        val user = "far-${UUID.randomUUID()}"
        val id = data(call("POST", "/api/savings/goals", user, """{"title":"먼 목표","template":"other","targetAmount":2000000000,"monthlyPlan":1000}""")).path("goal").path("id").asString()
        val thisMonth = java.time.YearMonth.now(java.time.ZoneId.of("Asia/Seoul"))
        (1..3).forEach { back ->
            val day = thisMonth.minusMonths(back.toLong()).atDay(1)
            call("POST", "/api/savings/goals/$id/deposits", user, """{"amount":1000,"depositedOn":"$day"}""").statusCode() shouldBe 201
        }
        val res = call("POST", "/api/savings/goals/$id/deposits", user, """{"amount":1000}""")
        res.statusCode() shouldBe 201
        data(res).path("goal").path("projection").path("reason").asString() shouldBe "not_reachable"
        events(id).last() shouldBe "savings.ProjectionIssued"
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
