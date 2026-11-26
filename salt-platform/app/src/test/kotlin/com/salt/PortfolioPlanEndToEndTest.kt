package com.salt

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import com.salt.support.persistence.ServiceDatabase
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.BeforeEach
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
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters
import java.util.Date
import java.util.UUID

/**
 * 서버 S4a 합격선(`SRV-REQ-049` FR-1 — 밴드 적립 plan 을 Express 에서 Kotlin portfolio 로) — 실 Postgres(svc_portfolio · Flyway · 운영과 같은
 * 예측 마이그레이션 + GRANT)로 `/api/plan` 다섯 경로. 금액 · 경계는 `PlanPolicySpec`(옛 시험 기대값 그대로), 여기는 경로 · 저장 · 응답 모양 · 오류 코드 · 권한.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PortfolioPlanEndToEndTest {
    @LocalServerPort
    private var port: Int = 0

    @Autowired private lateinit var jsonMapper: JsonMapper

    @Autowired @Qualifier("portfolioDatabase")
    private lateinit var portfolioDatabase: ServiceDatabase

    private val http = HttpClient.newHttpClient()
    private val kst = ZoneId.of("Asia/Seoul")
    private val currentWeek: LocalDate get() = LocalDate.now(kst).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

    /** 이번 주 BTC 예측 행 하나(관문 통과 · 2배 · 3종 다 있음) — 코스피는 일부러 없다(예측 회차 전) */
    @BeforeEach
    fun bandRow() {
        PlatformContainers.admin().use { c ->
            c.prepareStatement(
                """
                INSERT INTO forecast.accumulation_band (asset, plan_week, prereg_key, indicator, indicator_value, percentile, estimated, basis_observed,
                  secondary_value, band_key, band_multiplier, gate_passed, blocked_reason, multiplier, closed_weeks, excess, ci_low, ci_high, years_total,
                  years_positive, window_from, window_to, failure_cases, failure_count, kimchi_premium, kimchi_as_of, computed_at, bands)
                VALUES ('btc', (?::date)::timestamp AT TIME ZONE 'UTC', 'band-accumulation@2', 'mvrv_z', 0.33, null, false, now() - interval '2 days',
                  null, 'low', 2, true, null, 2, 748, 0.115, 0.01, 0.4, 14, 9, null, null,
                  '[{"decidedAt":"2021-11-15T00:00:00+00:00","kind":"missed_drop","band":"neutral","multiplier":1,"return52w":-0.75},{"bad":true}]'::jsonb,
                  18, 0.0294, now(), now(), '[{"key":"low","below":0.5,"multiplier":2},{"key":"high","below":null,"multiplier":0.5}]'::jsonb)
                ON CONFLICT DO NOTHING
                """.trimIndent(),
            ).apply { setString(1, currentWeek.toString()) }.executeUpdate()
        }
    }

    @Test
    fun `설정 전 — 200 configured false · 금액 null · 기본액 없이도 3종 · 코스피는 band_unavailable`() {
        val user = "plan-${UUID.randomUUID()}"
        val weekly = data(call("GET", "/api/plan/weekly", user, null))
        weekly.path("weekOf").asString() shouldBe currentWeek.toString()
        weekly.path("configured").asBoolean() shouldBe false
        weekly.path("totalKrw").isNull shouldBe true
        val btc = weekly.path("items").get(0)
        btc.path("asset").asString() shouldBe "btc"
        btc.path("amountKrw").isNull shouldBe true
        btc.path("multiplier").asDouble() shouldBe 2.0
        btc.path("reasonCode").asString() shouldBe "band_applied"
        btc.path("renderable").asBoolean() shouldBe true
        // jsonb 의 모양이 틀린 실패 사례 줄은 버린다(옛것과 같은 거르기)
        btc.path("failureCases").path("items").size() shouldBe 1
        btc.path("basis").path("bands").size() shouldBe 2
        btc.path("basis").path("bands").get(1).path("below").isNull shouldBe true
        // 시각은 JS toISOString 모양(밀리초 3자리 · Z)
        btc.path("basis").path("computedAt").asString().matches(Regex("""\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z""")) shouldBe true
        val kospi = weekly.path("items").get(1)
        kospi.path("reasonCode").asString() shouldBe "band_unavailable"
        kospi.path("renderable").asBoolean() shouldBe false
        kospi.path("blockedReason").asString() shouldBe "band_missing"
        weekly.path("degradedReasons").items { it.asString() } shouldBe listOf("band_unavailable")
        // 옛 응답과 같은 키 · 같은 순서(BFF 무변경)
        weekly.propertyNames().toList() shouldBe listOf("weekOf", "configured", "totalKrw", "items", "kimchiPremium", "streak", "degraded", "degradedReasons")
        btc.propertyNames().toList() shouldBe listOf(
            "asset", "indicator", "weeklyBaseKrw", "multiplier", "amountKrw", "status", "executedKrw", "fixed", "fallback", "reasonCode",
            "basis", "trackRecord", "failureCases", "renderable", "blockedReason",
        )
        val settings = data(call("GET", "/api/plan/settings", user, null))
        settings.path("configured").asBoolean() shouldBe false
        settings.path("limits").path("unitKrw").asLong() shouldBe 1_000
        settings.path("bands").get(0).path("reasonCode").asString() shouldBe "hit_rate_on_default_band"
    }

    @Test
    fun `첫 저장 → 이번 주 BTC 스냅샷 · 체크 → 연속 1 · 이번 달 합계 — 금액은 원 정수 1,000원 단위`() {
        val user = "plan-${UUID.randomUUID()}"
        val saved = data(call("PATCH", "/api/plan/settings", user, """{"monthlyBaseKrw":1300000}"""))
        saved.path("configured").asBoolean() shouldBe true
        saved.path("startedWeek").asString() shouldBe currentWeek.toString()
        saved.path("allocation").get(0).path("weeklyBaseKrw").asLong() shouldBe 150_000
        saved.path("pending").isNull shouldBe true

        val weekly = data(call("GET", "/api/plan/weekly", user, null))
        weekly.path("totalKrw").asLong() shouldBe 450_000 // BTC 150,000 × 2 + 코스피 150,000(잠정 정액)
        val btc = weekly.path("items").get(0)
        btc.path("amountKrw").asLong() shouldBe 300_000
        btc.path("fixed").asBoolean() shouldBe true
        btc.path("status").asString() shouldBe "planned"
        weekly.path("items").get(1).path("fixed").asBoolean() shouldBe false
        weekly.path("kimchiPremium").path("costKrwOnPlan").asLong() shouldBe 8_568

        // 이번 주가 아닌 주 → 422 · 상세에 이번 주
        val notCurrent = call("POST", "/api/plan/weekly/complete", user, """{"weekOf":"${currentWeek.minusWeeks(1)}","executions":[{"asset":"btc"}]}""")
        notCurrent.statusCode() shouldBe 422
        body(notCurrent).path("code").asString() shouldBe "PLAN_WEEK_NOT_CURRENT"
        body(notCurrent).path("currentWeek").asString() shouldBe currentWeek.toString()

        // 코스피는 이번 주 행이 없었다 — 체크하면 그때 정액으로 굳힌다
        val done = data(call("POST", "/api/plan/weekly/complete", user, """{"weekOf":"$currentWeek","executions":[{"asset":"btc"},{"asset":"kospi","amountKrw":100000}]}"""))
        done.path("streakWeeks").asInt() shouldBe 1
        done.path("cumulativeKrw").asLong() shouldBe 400_000

        val over = call("POST", "/api/plan/weekly/complete", user, """{"weekOf":"$currentWeek","executions":[{"asset":"btc","amountKrw":1500001}]}""")
        over.statusCode() shouldBe 422
        body(over).path("code").asString() shouldBe "PLAN_EXECUTION_INVALID"
        body(over).path("max").asLong() shouldBe 1_500_000

        val month = YearMonth.from(currentWeek)
        val summary = data(call("GET", "/api/plan/monthly-summary?month=$month", user, null))
        summary.path("executedKrw").asLong() shouldBe 400_000
        summary.path("monthlyBaseKrw").asLong() shouldBe 1_300_000
        val future = call("GET", "/api/plan/monthly-summary?month=${YearMonth.now(kst).plusMonths(1)}", user, null)
        future.statusCode() shouldBe 400
        body(future).path("code").asString() shouldBe "PLAN_MONTH_IN_FUTURE"

        // 수정은 다음 주부터 — 대기값
        val changed = data(call("PATCH", "/api/plan/settings", user, """{"monthlyBaseKrw":2000000}"""))
        changed.path("currentMonthlyBaseKrw").asLong() shouldBe 1_300_000
        changed.path("pending").path("effectiveWeek").asString() shouldBe currentWeek.plusWeeks(1).toString()

        portfolioDatabase.dsl.fetchCount(portfolioDatabase.dsl.selectFrom("weekly_plan_executions").where("user_id = ?", user)) shouldBe 2
    }

    @Test
    fun `요청 거절 — 읽기 전용 키 422 · 모르는 키 · 소수 · 형식 400 · 단위 422 · 토큰 없음 401`() {
        val user = "plan-${UUID.randomUUID()}"
        val readOnly = call("PATCH", "/api/plan/settings", user, """{"monthlyBaseKrw":10000,"allocation":[]}""")
        readOnly.statusCode() shouldBe 422
        body(readOnly).path("code").asString() shouldBe "PLAN_BAND_READ_ONLY"
        body(readOnly).path("field").asString() shouldBe "allocation"
        call("PATCH", "/api/plan/settings", user, """{"monthlyBaseKrw":10000,"memo":"x"}""").statusCode() shouldBe 400
        call("PATCH", "/api/plan/settings", user, """{"monthlyBaseKrw":10000.5}""").statusCode() shouldBe 400
        call("PATCH", "/api/plan/settings", user, """{"monthlyBaseKrw":"10000"}""").statusCode() shouldBe 400
        val unit = call("PATCH", "/api/plan/settings", user, """{"monthlyBaseKrw":1300500}""")
        unit.statusCode() shouldBe 422
        body(unit).path("code").asString() shouldBe "PLAN_BASE_AMOUNT_INVALID"
        listOf("field", "min", "max", "unit").all { body(unit).has(it) } shouldBe true
        // 정수로 적힌 1000.0 은 정수(옛 JS 숫자와 같다)
        call("PATCH", "/api/plan/settings", user, """{"monthlyBaseKrw":10000.0}""").statusCode() shouldBe 200
        call("POST", "/api/plan/weekly/complete", user, """{"weekOf":"2026-11-1","executions":[{"asset":"btc"}]}""").statusCode() shouldBe 400
        call("POST", "/api/plan/weekly/complete", user, """{"weekOf":"$currentWeek","executions":[{"asset":"btc"},{"asset":"btc"}]}""").statusCode() shouldBe 400
        call("POST", "/api/plan/weekly/complete", user, """{"weekOf":"$currentWeek","executions":[]}""").statusCode() shouldBe 400
        call("POST", "/api/plan/weekly/complete", user, """{"weekOf":"$currentWeek","executions":[{"asset":"eth"}]}""").statusCode() shouldBe 400
        call("GET", "/api/plan/monthly-summary?month=2026-13", user, null).statusCode() shouldBe 400
        // 설정 전 체크는 422 PLAN_NOT_CONFIGURED
        val fresh = "plan-${UUID.randomUUID()}"
        body(call("POST", "/api/plan/weekly/complete", fresh, """{"weekOf":"$currentWeek","executions":[{"asset":"btc"}]}""")).path("code").asString() shouldBe "PLAN_NOT_CONFIGURED"
        val anonymous = http.send(HttpRequest.newBuilder(URI.create("http://localhost:$port/api/plan/weekly")).GET().build(), HttpResponse.BodyHandlers.ofString())
        anonymous.statusCode() shouldBe 401
    }

    @Test
    fun `svc_portfolio — 예측 밴드 뷰만 읽고 예측 표 · 남의 스키마는 권한 오류 · 내 데이터 표 둘`() {
        DriverManager.getConnection(PlatformContainers.postgres.jdbcUrl, "svc_portfolio", PlatformContainers.PORTFOLIO_PASSWORD).use { c ->
            c.createStatement().executeQuery("SELECT count(*) FROM forecast.v_accumulation_band").next() shouldBe true
            c.createStatement().executeQuery("SELECT count(*) FROM forecast.v_accumulation_band_week").next() shouldBe true
            shouldThrow<SQLException> { c.createStatement().executeQuery("SELECT * FROM forecast.accumulation_band") }
            shouldThrow<SQLException> { c.createStatement().executeQuery("SELECT * FROM market.probe") }
        }
        val user = "plan-${UUID.randomUUID()}"
        call("PATCH", "/api/plan/settings", user, """{"monthlyBaseKrw":1300000}""").statusCode() shouldBe 200
        val exported = data(call("GET", "/api/portfolio/me/data", user, null))
        exported.path("service").asString() shouldBe "portfolio"
        exported.path("tables").items { it.path("name").asString() } shouldBe listOf("weekly_plan_executions", "plan_settings")
        exported.path("tables").get(1).path("rows").size() shouldBe 1
        data(call("GET", "/api/portfolio/me/data-classification", user, null)).path("tables").items { it.path("grade").asString() } shouldBe
            listOf("financial", "financial")
    }

    private fun body(res: HttpResponse<String>): JsonNode = jsonMapper.readTree(res.body())

    private fun data(res: HttpResponse<String>): JsonNode {
        check(res.statusCode() in 200..299) { "${res.statusCode()} ${res.body()}" }
        return body(res).path("data")
    }

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
