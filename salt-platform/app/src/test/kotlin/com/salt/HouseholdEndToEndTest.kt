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
import io.kotest.matchers.string.shouldNotContain
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.system.CapturedOutput
import org.springframework.boot.test.system.OutputCaptureExtension
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
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.util.Date
import java.util.UUID

/**
 * 가계부 S1a 합격선(`SRV-REQ-046` · `DB-REQ-038`) — 실 Postgres(서비스 계정 · Flyway) · RabbitMQ 로 가계부 경로 전부.
 * 파싱 · 착지 계산 경계는 도메인 단위 테스트(`ParsingSpec` · `HouseholdMathSpec`)가, 여기는 경로 · 저장 · 이벤트 · 권한 · 원문 0 을 본다.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ExtendWith(OutputCaptureExtension::class)
class HouseholdEndToEndTest {
    @LocalServerPort
    private var port: Int = 0

    @Autowired private lateinit var jsonMapper: JsonMapper

    @Autowired @Qualifier("householdDatabase")
    private lateinit var householdDatabase: ServiceDatabase

    private val http = HttpClient.newHttpClient()
    private val today: LocalDate get() = LocalDate.now(ZoneId.of("Asia/Seoul"))

    @Test
    fun `적기 — 행 · ExpenseRecorded · 그날 첫 지출이면 LandingIssued 한 번(두 번째 지출은 발행 0)`() {
        val user = "rec-${UUID.randomUUID()}"
        val first = call("POST", "/api/household/expenses", user, """{"amount":12000,"category":"food","merchant":"김밥천국"}""")
        first.statusCode() shouldBe 201
        val body = data(first)
        body.path("expenses").get(0).path("amount").asLong() shouldBe 12_000
        body.path("expenses").get(0).path("spentOn").asString() shouldBe today.toString()
        body.path("expenses").get(0).path("precision").asString() shouldBe "exact"
        body.path("monthTotal").asLong() shouldBe 12_000
        // 예산이 없으면 봉투도 없다
        body.path("envelope").isNull shouldBe true

        data(call("POST", "/api/household/expenses", user, """{"amount":4500,"category":"cafe","inputKind":"line"}""")).path("monthTotal").asLong() shouldBe 16_500

        val types = eventTypes(user)
        types.count { it == "household.ExpenseRecorded" } shouldBe 2
        types.count { it == "household.LandingIssued" } shouldBe 1
        householdDatabase.dsl.fetchCount(householdDatabase.dsl.selectFrom("landing_issued").where("user_id = ?", user)) shouldBe 1
    }

    @Test
    fun `여러 건 — 한 트랜잭션 · 하나라도 틀리면 0건`() {
        val user = "batch-${UUID.randomUUID()}"
        val ok = call(
            "POST", "/api/household/expenses/batch", user,
            """{"expenses":[{"amount":12000,"category":"cafe","merchant":"스타벅스","inputKind":"paste"},{"amount":35000,"category":"shopping","merchant":"쿠팡","installmentMonths":3,"inputKind":"paste"}]}""",
        )
        ok.statusCode() shouldBe 201
        data(ok).path("expenses").size() shouldBe 2
        data(ok).path("savedTotal").asLong() shouldBe 47_000
        data(ok).path("expenses").get(1).path("installmentMonths").asInt() shouldBe 3

        val bad = call("POST", "/api/household/expenses/batch", user, """{"expenses":[{"amount":1000,"category":"food"},{"amount":1000,"category":"nope"}]}""")
        bad.statusCode() shouldBe 400
        bad.body() shouldContain "EXPENSE_CATEGORY_UNKNOWN"
        householdDatabase.dsl.fetchCount(householdDatabase.dsl.selectFrom("expense").where("user_id = ?", user)) shouldBe 2
    }

    @Test
    fun `대략 합계 — 대략 입력에서만 · 월 합에서 정확과 따로`() {
        val user = "approx-${UUID.randomUUID()}"
        call("POST", "/api/household/expenses", user, """{"amount":10000,"category":"food"}""").statusCode() shouldBe 201
        call("POST", "/api/household/expenses", user, """{"amount":40000,"category":"other","precision":"approx","inputKind":"approx"}""").statusCode() shouldBe 201
        call("POST", "/api/household/expenses", user, """{"amount":1,"category":"other","precision":"approx","inputKind":"quick"}""").body() shouldContain "EXPENSE_PRECISION_INVALID"
        call("POST", "/api/household/expenses", user, """{"amount":0.4,"category":"food"}""").body() shouldContain "EXPENSE_AMOUNT_INVALID"
        val totals = data(call("GET", "/api/household/month/${YearMonth.from(today)}", user, null)).path("totals")
        totals.path("total").asLong() shouldBe 50_000
        totals.path("exact").asLong() shouldBe 10_000
        totals.path("approx").asLong() shouldBe 40_000
    }

    @Test
    fun `예산 넘침 — remaining 음수 · 하루 가용 0 · 경고 · 차단 필드 0(수용 기준 2)`() {
        val user = "budget-${UUID.randomUUID()}"
        val put = data(call("PUT", "/api/household/budget", user, """{"method":"envelope","envelopes":{"cafe":10000,"food":300000}}"""))
        put.path("method").asString() shouldBe "envelope"
        put.path("total").asLong() shouldBe 310_000
        put.path("envelopes").get(0).path("key").asString() shouldBe "food"

        val saved = call("POST", "/api/household/expenses", user, """{"amount":13000,"category":"cafe"}""")
        saved.statusCode() shouldBe 201
        data(saved).path("envelope").path("remaining").asLong() shouldBe -3_000

        val res = call("GET", "/api/household/month/${YearMonth.from(today)}", user, null)
        val month = data(res)
        val cafe = month.path("envelopes").first { it.path("key").asString() == "cafe" }
        cafe.path("remaining").asLong() shouldBe -3_000
        month.path("remaining").asLong() shouldBe 297_000
        month.path("current").asBoolean() shouldBe true
        // 응답 어디에도 경고 · 차단 · 초과 상태 이름이 없다
        listOf("warn", "block", "exceed", "overBudget", "alert").forEach { res.body() shouldNotContain it }

        // 50/30/20 — 저축 몫은 봉투가 아니다
        val fifty = data(call("PUT", "/api/household/budget", user, """{"method":"50_30_20","income":3000000}"""))
        fifty.path("envelopes").items { it.path("key").asString() } shouldBe listOf("needs", "wants")
        fifty.path("savingsShare").asLong() shouldBe 600_000
        call("PUT", "/api/household/budget", user, """{"method":"50_30_20"}""").body() shouldContain "BUDGET_INCOME_REQUIRED"
    }

    @Test
    fun `파싱 — 후보만 돌려주고 저장 0 · 원문이 DB · 로그 · 오류 바디에 0(수용 기준 1)`(output: CapturedOutput) {
        val user = "parse-${UUID.randomUUID()}"
        val marker = "ZQX${UUID.randomUUID().toString().take(8)}"
        val sms = "[Web발신]\\n신한카드(9876)승인 홍*동 12,000원(일시불)10/31 12:34 스타벅스$marker 누적1,234,567원\\n\\n[Web발신]\\n신한카드(9876)취소 홍*동 5,000원 10/31 12:40 편의점"
        val res = call("POST", "/api/household/parse", user, """{"mode":"messages","text":"$sms"}""")
        res.statusCode() shouldBe 200
        val parsed = data(res)
        parsed.path("candidates").size() shouldBe 1
        parsed.path("candidates").get(0).path("amount").asLong() shouldBe 12_000
        parsed.path("candidates").get(0).path("categorySource").asString() shouldBe "rule"
        parsed.path("skipped").items { it.asString() } shouldBe listOf("cancelled")
        res.body() shouldNotContain "9876"
        res.body() shouldNotContain "1,234,567"

        // 너무 긴 원문 — 오류 바디가 원문을 되돌려 주지 않는다
        val long = "$marker ".repeat(1_000)
        val tooLong = call("POST", "/api/household/parse", user, """{"mode":"messages","text":"$long"}""")
        tooLong.statusCode() shouldBe 400
        tooLong.body() shouldContain "PARSE_TEXT_TOO_LONG"
        tooLong.body() shouldNotContain marker

        // 저장 0 · 로그 0
        householdDatabase.dsl.fetchCount(householdDatabase.dsl.selectFrom("expense").where("user_id = ?", user)) shouldBe 0
        output.all shouldNotContain marker
        output.all shouldNotContain "9876"
    }

    @Test
    fun `파싱 분류 — 최근 같은 가맹점에 사용자가 고른 분류가 낱말 표를 이긴다`() {
        val user = "hist-${UUID.randomUUID()}"
        call("POST", "/api/household/expenses", user, """{"amount":3000,"category":"food","merchant":"GS25"}""").statusCode() shouldBe 201
        val c = data(call("POST", "/api/household/parse", user, """{"mode":"line","text":"GS25 4000"}""")).path("candidates").get(0)
        c.path("category").asString() shouldBe "food"
        c.path("categorySource").asString() shouldBe "history"
        call("POST", "/api/household/parse", user, """{"mode":"other","text":"x"}""").body() shouldContain "PARSE_MODE_INVALID"
    }

    @Test
    fun `제안 — 최근 가맹점 횟수 순 · 마지막 분류 · 분류 12개`() {
        val user = "sug-${UUID.randomUUID()}"
        listOf("""{"amount":4500,"category":"cafe","merchant":"스타벅스"}""", """{"amount":5000,"category":"cafe","merchant":"스타벅스"}""", """{"amount":9000,"category":"food","merchant":"김밥천국"}""")
            .forEach { call("POST", "/api/household/expenses", user, it).statusCode() shouldBe 201 }
        val s = data(call("GET", "/api/household/suggestions", user, null))
        s.path("merchants").get(0).path("merchant").asString() shouldBe "스타벅스"
        s.path("merchants").get(0).path("count").asInt() shouldBe 2
        s.path("merchants").get(0).path("lastAmount").asLong() shouldBe 5_000
        s.path("categories").size() shouldBe 12
    }

    @Test
    fun `월 화면 · 홈 카드 — 착지는 기록 14일 전엔 구간 없이 이유 · 지난달 적중은 발행이 없으면 not_issued · 미래 달 거절`() {
        val user = "month-${UUID.randomUUID()}"
        call("POST", "/api/household/expenses", user, """{"amount":20000,"category":"food"}""").statusCode() shouldBe 201
        val m = data(call("GET", "/api/household/month/${YearMonth.from(today)}", user, null))
        m.path("expenses").size() shouldBe 1
        m.path("byCategory").get(0).path("key").asString() shouldBe "food"
        m.path("landing").path("reason").asString() shouldBe "history_short"
        m.path("landing").path("low").isNull shouldBe true
        // 오늘 시작 기준 — 오늘 적은 2만 원은 "어제까지"에 들지 않는다
        m.path("landing").path("spentSoFar").asLong() shouldBe 0
        // 지난날로 적은 대략 합계가 표본을 늘리지 않는다(첫 기록 = 저장한 날, 리뷰 2026-11-04)
        call("POST", "/api/household/expenses", user, """{"amount":40000,"category":"other","precision":"approx","inputKind":"approx","spentOn":"${today.minusDays(60)}"}""").statusCode() shouldBe 201
        data(call("GET", "/api/household/month/${YearMonth.from(today)}", user, null)).path("landing").path("daysOfHistory").asInt() shouldBe 0
        m.path("track").path("reason").asString() shouldBe "not_issued"

        val past = data(call("GET", "/api/household/month/${YearMonth.from(today).minusMonths(1)}", user, null))
        past.path("current").asBoolean() shouldBe false
        past.path("landing").isNull shouldBe true
        past.path("landingReason").asString() shouldBe "not_current_month"
        call("GET", "/api/household/month/${YearMonth.from(today).plusMonths(1)}", user, null).body() shouldContain "MONTH_IN_FUTURE"
        call("GET", "/api/household/month/2026-13", user, null).body() shouldContain "MONTH_INVALID"

        val card = data(call("GET", "/api/household/home-card", user, null))
        card.path("spent").asLong() shouldBe 20_000
        card.path("count").asInt() shouldBe 1
        card.path("remaining").isNull shouldBe true
    }

    @Test
    fun `지우기 — 본인 것만 · 남의 것은 404`() {
        val owner = "del-${UUID.randomUUID()}"
        val id = data(call("POST", "/api/household/expenses", owner, """{"amount":1000,"category":"food"}""")).path("expenses").get(0).path("id").asString()
        call("DELETE", "/api/household/expenses/$id", "other-${UUID.randomUUID()}", null).statusCode() shouldBe 404
        call("DELETE", "/api/household/expenses/$id", owner, null).statusCode() shouldBe 200
        call("DELETE", "/api/household/expenses/not-a-uuid", owner, null).statusCode() shouldBe 404
    }

    @Test
    fun `원장 — landing_issued 는 고치거나 지울 수 없다 · 원문 열 0 · 남의 스키마 권한 없음`() {
        val user = "ledger-${UUID.randomUUID()}"
        call("POST", "/api/household/expenses", user, """{"amount":1000,"category":"food"}""").statusCode() shouldBe 201
        shouldThrow<Exception> { householdDatabase.dsl.execute("UPDATE landing_issued SET reason = 'x' WHERE user_id = ?", user) }.message!! shouldContain "append-only"
        shouldThrow<Exception> { householdDatabase.dsl.execute("DELETE FROM landing_issued WHERE user_id = ?", user) }.message!! shouldContain "append-only"

        // DB-REQ-038 FR-13 — 결제 문자 원문을 담을 열이 스키마에 없다
        val suspicious = householdDatabase.dsl.fetch(
            "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'household' AND column_name ~ '(raw|sms|message|original|text_body)'",
        )
        suspicious.size shouldBe 0

        val error = shouldThrow<SQLException> {
            DriverManager.getConnection(PlatformContainers.postgres.jdbcUrl, "svc_household", PlatformContainers.HOUSEHOLD_PASSWORD).use {
                it.createStatement().executeQuery("SELECT * FROM savings.goal")
            }
        }
        error.sqlState shouldBe "42501"
    }

    @Test
    fun `목표 시계 — 저축 서비스가 가장 가까운 목표의 지연 일수를 답한다(목표 없으면 이유)`() {
        val user = "clock-${UUID.randomUUID()}"
        data(call("GET", "/api/savings/goal-clock?amount=30000", user, null)).path("reason").asString() shouldBe "no_active_goal"
        call("POST", "/api/savings/goals", user, """{"title":"결혼","template":"wedding","targetAmount":30000000,"monthlyPlan":304375}""").statusCode() shouldBe 201
        val clock = data(call("GET", "/api/savings/goal-clock?amount=30000", user, null))
        clock.path("title").asString() shouldBe "결혼"
        clock.path("template").asString() shouldBe "wedding"
        // 30,000 × 30.4375 ÷ 304,375 = 3.0
        clock.path("delayDays").asLong() shouldBe 3
        clock.path("reason").isNull shouldBe true
        call("GET", "/api/savings/goal-clock?amount=0", user, null).statusCode() shouldBe 400
        // 상한 — 넘치는 금액은 500 이 아니라 400(리뷰 2026-11-04)
        call("GET", "/api/savings/goal-clock?amount=1e30", user, null).statusCode() shouldBe 400
    }

    // ---------- 도움 ----------

    private fun eventTypes(user: String): List<String> =
        householdDatabase.dsl.fetch("SELECT event_type FROM outbox WHERE payload->>'userId' = ? ORDER BY seq", user).map { it.get(0, String::class.java) }

    private fun data(res: HttpResponse<String>): JsonNode {
        check(res.statusCode() in 200..299) { "${res.statusCode()} ${res.body()}" }
        return jsonMapper.readTree(res.body()).path("data")
    }

    private fun JsonNode.first(predicate: (JsonNode) -> Boolean): JsonNode = (0 until size()).map { get(it) }.first(predicate)

    /** Jackson 3 JsonNode 의 map 은 컬렉션 map 이 아니다 — 배열을 리스트로 */
    private fun <T> JsonNode.items(f: (JsonNode) -> T): List<T> = (0 until size()).map { f(get(it)) }

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
