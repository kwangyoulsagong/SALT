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
        events shouldBe 11 // 원문 표 줄 수(S2d 에 월세 세액공제 다섯 줄)
        val again = syncCatalog.execute()
        again.revised shouldBe 0
        again.paramsChanged shouldBe 0
        dsl.fetchCount(dsl.selectFrom("tip_revision")) shouldBe revisions
        dsl.fetchCount(dsl.selectFrom("outbox").where("event_type = 'content.PolicyParamChanged'")) shouldBe events
        dsl.fetchCount(dsl.selectFrom("trigger_rule").where("active")) shouldBe 9
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

    @Test
    fun `퀴즈 — 공개 글엔 정답 0 · 로그인 없이 채점만 · 로그인하면 처음 맞힌 때 한 번 카드 · 틀려도 카드는 남는다`() {
        val detail = call("GET", "/api/content/tips/marriage-tax-credit", null)
        val quiz = data(detail).path("quiz")
        quiz.path("question").asString() shouldContain "기준"
        quiz.path("choices").size() shouldBe 3
        quiz.has("answer") shouldBe false
        detail.body().contains("quiz_answer") shouldBe false

        // 로그인 없이 — 채점만, 기록 0
        val graded = data(call("POST", "/api/content/tips/marriage-tax-credit/quiz", null, """{"choice":1}"""))
        graded.path("correct").asBoolean() shouldBe true
        graded.path("answer").asInt() shouldBe 1
        data(call("POST", "/api/content/tips/marriage-tax-credit/quiz", null, """{"choice":0}""")).path("correct").asBoolean() shouldBe false
        call("POST", "/api/content/tips/marriage-tax-credit/quiz", null, """{"choice":3}""").statusCode() shouldBe 400
        call("POST", "/api/content/tips/marriage-tax-credit/quiz", null, """{}""").statusCode() shouldBe 400
        call("POST", "/api/content/tips/no-such-tip/quiz", null, """{"choice":0}""").statusCode() shouldBe 404

        // 로그인 — 틀림(카드 아님) → 맞힘(처음 카드) → 다시 맞힘(이미 카드) → 틀림(카드 남음)
        val user = "quiz-${UUID.randomUUID()}"
        call("GET", "/api/content/me/quiz-cards", null).statusCode() shouldBe 401
        data(call("GET", "/api/content/me/quiz-cards", user)).path("cards").size() shouldBe 0
        data(call("POST", "/api/content/me/quiz/marriage-tax-credit", user, """{"choice":0}""")).path("collected").asBoolean() shouldBe false
        data(call("POST", "/api/content/me/quiz/marriage-tax-credit", user, """{"choice":1}""")).path("collected").asBoolean() shouldBe true
        data(call("POST", "/api/content/me/quiz/marriage-tax-credit", user, """{"choice":1}""")).path("collected").asBoolean() shouldBe false
        data(call("POST", "/api/content/me/quiz/marriage-tax-credit", user, """{"choice":2}""")).path("correct").asBoolean() shouldBe false

        val cards = data(call("GET", "/api/content/me/quiz-cards", user))
        cards.path("available").asInt() shouldBe 6
        val card = items(cards.path("cards")).single()
        card.path("slug").asString() shouldBe "marriage-tax-credit"
        card.path("answer").asString() shouldBe "혼인신고일"
        // 남의 카드는 안 보인다 · 행 하나에 시도 넷
        data(call("GET", "/api/content/me/quiz-cards", "other-${UUID.randomUUID()}")).path("cards").size() shouldBe 0
        val dsl = contentDatabase.dsl
        dsl.fetchValue("SELECT attempts FROM quiz_answer WHERE user_id = ?", user) shouldBe 4
    }

    @Test
    fun `변경 이력 줄 diff — 첫 판은 null · 유효기한을 늘린 판은 그 줄만 · 검수일만 바뀐 판은 빈 목록`() {
        val first = items(data(call("GET", "/api/content/tips/year-end-preview", null)).path("revisions")).last()
        first.path("summary").asString() shouldBe "첫 판"
        first.path("changes").isNull shouldBe true

        // 원문을 바꾼 판을 직접 기록한다(레포 원문은 그대로) — 동기화가 쓰는 포트와 같은 열
        val dsl = contentDatabase.dsl
        val lines = dsl.fetchValue("SELECT body_lines FROM tip_revision WHERE tip_slug = 'year-end-preview' ORDER BY id LIMIT 1") as String
        val extended = lines.replace("유효기한: 2026-12-31", "유효기한: 2027-12-31")
        dsl.execute(
            "INSERT INTO tip_revision (tip_slug, revised_at, summary, previous_hash, body_lines) VALUES ('year-end-preview', now() + interval '1 minute', '유효기한 연장', 'h', ?)",
            extended,
        )
        dsl.execute(
            "INSERT INTO tip_revision (tip_slug, revised_at, summary, previous_hash, body_lines) VALUES ('year-end-preview', now() + interval '2 minute', '검수일만', 'h', ?)",
            extended,
        )
        val revisions = items(data(call("GET", "/api/content/tips/year-end-preview", null)).path("revisions"))
        revisions[0].path("summary").asString() shouldBe "검수일만"
        revisions[0].path("changes").size() shouldBe 0
        items(revisions[1].path("changes")).map { it.path("op").asString() to it.path("text").asString() } shouldBe
            listOf("removed" to "유효기한: 2026-12-31", "added" to "유효기한: 2027-12-31")
    }

    @Test
    fun `내 숫자로 다시 읽기 — 비로그인 401 · 칸 없는 글 404 · 사실로 계산 · 원천 못 읽음은 이유 한 줄 · 사실은 저장 0`() {
        val facts = """{"goals":[{"template":"housing","status":"active","saved":"1200000","monthlyPlan":"200000","targetDate":null}],"wage":{"state":"set","basis":"monthly","amount":"4000000"}}"""
        call("POST", "/api/content/me/tips/housing-subscription-deduction/my-numbers", null, facts).statusCode() shouldBe 401
        val user = "mn-${UUID.randomUUID()}"
        val noKind = call("POST", "/api/content/me/tips/income-tax-may/my-numbers", user, facts)
        noKind.statusCode() shouldBe 404
        jsonMapper.readTree(noKind.body()).path("code").asString() shouldBe "TIP_MY_NUMBERS_NOT_FOUND"
        call("POST", "/api/content/me/tips/no-such-tip/my-numbers", user, facts).statusCode() shouldBe 404
        // set 인데 금액이 없다 · 금액이 숫자가 아니다
        call("POST", "/api/content/me/tips/housing-subscription-deduction/my-numbers", user, """{"goals":[],"wage":{"state":"set","basis":"monthly"}}""").statusCode() shouldBe 400
        call("POST", "/api/content/me/tips/housing-subscription-deduction/my-numbers", user, """{"goals":[],"wage":{"state":"set","basis":"monthly","amount":"-1"}}""").statusCode() shouldBe 400
        // 모양은 맞는데 없는 날짜 — 500 이 아니라 400(S2d 확인 결함)
        val badDate = call("POST", "/api/content/me/tips/housing-subscription-deduction/my-numbers", user, """{"goals":[{"template":"wedding","status":"active","saved":"0","targetDate":"2026-13-45"}],"wage":{"state":"not_set"}}""")
        badDate.statusCode() shouldBe 400
        jsonMapper.readTree(badDate.body()).path("code").asString() shouldBe "INVALID_GOAL_FACT"

        // 글 응답이 칸 여부를 알린다
        data(call("GET", "/api/content/tips/housing-subscription-deduction", null)).path("myNumbers").asBoolean() shouldBe true
        data(call("GET", "/api/content/tips/income-tax-may", null)).path("myNumbers").asBoolean() shouldBe false

        val outboxBefore = contentDatabase.dsl.fetchCount(contentDatabase.dsl.selectFrom("outbox"))
        val r = data(call("POST", "/api/content/me/tips/housing-subscription-deduction/my-numbers", user, facts))
        r.path("kind").asString() shouldBe "housing_subscription"
        items(r.path("figures")).associate { it.path("key").asString() to (it.path("amount").takeIf { a -> !a.isNull }?.asLong() ?: it.path("ratio").asString()) } shouldBe
            mapOf("annual_payment" to 2_400_000L, "counted" to 2_400_000L, "deduction" to 960_000L, "rate" to "0.40")
        items(r.path("checks")).associate { it.path("key").asString() to it.path("state").asString() } shouldBe mapOf("salary_cap" to "met", "homeless_head" to "unknown")
        r.path("estimated").asBoolean() shouldBe true
        r.path("emptyReason").isNull shouldBe true

        // 저축 원천을 못 읽었다(goals = null) — 숫자 0 · 이유
        val unread = data(call("POST", "/api/content/me/tips/deposit-protection-limit/my-numbers", user, """{"goals":null,"wage":{"state":"unread"}}"""))
        unread.path("figures").size() shouldBe 0
        unread.path("emptyReason").asString() shouldContain "읽지 못해"

        // 계산만 — 사실(급여 · 목표)은 어디에도 남지 않는다
        contentDatabase.dsl.fetchCount(contentDatabase.dsl.selectFrom("outbox")) shouldBe outboxBefore
        listOf("user_signal", "tip_dismissal", "quiz_answer").forEach { contentDatabase.dsl.fetchCount(contentDatabase.dsl.selectFrom(it).where("user_id = ?", user)) shouldBe 0 }
    }

    @Test
    fun `고정비 증가 구독 — 주거가 오르면 월세 글이 가계부에 · 통신이 오르면 신호 0(처리 기록만)`() {
        val today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))
        fun save(user: String, category: String, amount: Long, back: Long) =
            data(call("POST", "/api/household/expenses", user, """{"amount":$amount,"category":"$category","merchant":"월세 집","spentOn":"${today.minusDays(back)}"}"""))

        val rent = "fr-${UUID.randomUUID()}"
        save(rent, "housing", 500_000, 62)
        save(rent, "housing", 500_000, 32)
        save(rent, "housing", 550_000, 2)
        val picked = waitFor { data(call("GET", "/api/content/me/tip?context=household", rent)).path("tip").takeIf { !it.isNull && it.path("slug").asString() == "monthly-rent-credit" } }
        picked.path("trigger").asString() shouldBe "fixed_cost_increased:housing"
        // 저축 맥락엔 그 글이 없다
        data(call("GET", "/api/content/me/tip?context=savings", rent)).path("tip").let { if (!it.isNull) it.path("slug").asString() shouldNotBe "monthly-rent-credit" }

        val phone = "fp-${UUID.randomUUID()}"
        save(phone, "telecom", 50_000, 62)
        save(phone, "telecom", 50_000, 32)
        save(phone, "telecom", 55_000, 2)
        val dsl = contentDatabase.dsl
        waitFor { dsl.fetchCount(dsl.selectFrom("processed_event").where("event_type = 'household.FixedCostIncreased'")).takeIf { it >= 2 } }
        dsl.fetchCount(dsl.selectFrom("user_signal").where("user_id = ?", phone)) shouldBe 0
        dsl.fetchCount(dsl.selectFrom("user_signal").where("user_id = ?", rent)) shouldBe 1
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
