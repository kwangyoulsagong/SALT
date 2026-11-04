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

    @Autowired private lateinit var runRecurring: com.salt.household.application.RunRecurring

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

    @Test
    fun `쿼리 수 — 월 화면 16 · 저장 한 건(그날 첫 지출) 정해진 수 · 홈 카드 6`() {
        val user = "q-${UUID.randomUUID()}"
        call("PUT", "/api/household/budget", user, """{"method":"envelope","envelopes":{"food":300000}}""").statusCode() shouldBe 200
        var before = statements()
        call("POST", "/api/household/expenses", user, """{"amount":1000,"category":"food"}""", countQueries = true).statusCode() shouldBe 201
        val firstSave = statements() - before
        before = statements()
        call("POST", "/api/household/expenses", user, """{"amount":1000,"category":"food"}""", countQueries = true).statusCode() shouldBe 201
        val secondSave = statements() - before
        before = statements()
        call("GET", "/api/household/month/${YearMonth.from(today)}", user, null, countQueries = true).statusCode() shouldBe 200
        val month = statements() - before
        before = statements()
        call("GET", "/api/household/home-card", user, null, countQueries = true).statusCode() shouldBe 200
        val home = statements() - before
        println("[household-queries] firstSave=$firstSave secondSave=$secondSave month=$month home=$home")
        // 월: 목록 · 월 합 · 예산 2 · 착지 2(첫 기록 · 날별) · 적중 2(지난달 발행 · 지난달 합)
        // + S1b: 마감 1(안 닫은 달 — 닫았으면 사본 봉투 1 더하고 예산 2 빠짐) · 예정 행 1(착지와 나눠 씀) · 할부 1 = 11
        // + S1c: 태그(목록 · 거울 한 문장) · 달력 날별 합 · 스티커 · 설정 · 다음 날 묻기(이번 달만) = 16
        month shouldBe 16L
        // 저장: 행 · 아웃박스 · 월 합 · 착지 2 · 발행 · 아웃박스(그날 처음) · 예산 2 = 9. 두 번째는 발행이 ON CONFLICT 로 빈 문장이 되고 그 아웃박스가 빠져 8
        // (그날 이미 냈어도 착지를 다시 계산하는 3문장은 리뷰가 짚은 낭비 — 쓰기 응답 몫이라 남김, 루트 체크리스트 §4)
        // + S1b: 착지 예정 행 1 · + S1c: 설정(노동시간) 1 — 감정 태그를 달면 태그 1 더
        firstSave shouldBe 11L
        secondSave shouldBe 10L
        // 홈: 월 합 · 예산 2 · 착지 2 · 예정 행 1
        home shouldBe 6L
    }

    // ---------- 가계부 S1b — 반복 · 마감 · 할부 ----------

    @Test
    fun `반복 — 만들면 이번 달 예정 · 착지에 예정으로 · 나갔어요는 지출 · 다시 확인 409 · 지우면 예정으로 돌아감 · 안 나가요`() {
        val user = "rec-t-${UUID.randomUUID()}"
        val day = today.dayOfMonth
        val created = call("POST", "/api/household/templates", user, """{"name":"월세","amount":500000,"category":"housing","paymentMethod":"transfer","dayOfMonth":$day}""")
        created.statusCode() shouldBe 201
        val t = data(created)
        t.path("confirmRequired").asBoolean() shouldBe true
        t.path("startsMonth").asString() shouldBe YearMonth.from(today).toString()
        val occ = t.path("thisMonth")
        occ.path("stage").asString() shouldBe "ask"
        occ.path("dueOn").asString() shouldBe today.toString()
        val occId = occ.path("id").asString()

        val month = data(call("GET", "/api/household/month/${YearMonth.from(today)}", user, null))
        month.path("recurring").path("scheduledTotal").asLong() shouldBe 500_000
        month.path("recurring").path("items").get(0).path("stage").asString() shouldBe "ask"
        month.path("landing").path("scheduled").asLong() shouldBe 500_000
        data(call("GET", "/api/household/home-card", user, null)).path("landing").path("scheduled").asLong() shouldBe 500_000

        // 금액을 고쳐 확인 — 지출 · 이벤트 · 예정 0
        val confirmed = call("POST", "/api/household/occurrences/$occId/confirm", user, """{"amount":510000}""")
        confirmed.statusCode() shouldBe 201
        val record = data(confirmed).path("record")
        record.path("savedTotal").asLong() shouldBe 510_000
        val expense = record.path("expenses").get(0)
        expense.path("inputKind").asString() shouldBe "template"
        expense.path("merchant").asString() shouldBe "월세"
        expense.path("spentOn").asString() shouldBe today.toString()
        eventTypes(user).count { it == "household.ExpenseRecorded" } shouldBe 1
        val after = data(call("GET", "/api/household/month/${YearMonth.from(today)}", user, null))
        after.path("recurring").path("scheduledTotal").asLong() shouldBe 0
        after.path("recurring").path("items").get(0).path("stage").asString() shouldBe "confirmed"
        after.path("totals").path("total").asLong() shouldBe 510_000

        call("POST", "/api/household/occurrences/$occId/confirm", user, null).let {
            it.statusCode() shouldBe 409
            it.body() shouldContain "OCCURRENCE_ALREADY_DECIDED"
        }
        // 남의 예정 행은 404
        call("POST", "/api/household/occurrences/$occId/skip", "other-${UUID.randomUUID()}", null).statusCode() shouldBe 404

        // 확인한 지출을 지우면 예정으로 돌아간다(판단 5)
        call("DELETE", "/api/household/expenses/${expense.path("id").asString()}", user, null).statusCode() shouldBe 200
        val reopened = data(call("GET", "/api/household/templates", user, null)).path("templates").get(0).path("thisMonth")
        reopened.path("stage").asString() shouldBe "ask"
        reopened.path("expenseId").isNull shouldBe true

        // 안 나가요 — 예정에서 빠지고 다시 정하면 409
        call("POST", "/api/household/occurrences/$occId/skip", user, null).statusCode() shouldBe 200
        data(call("GET", "/api/household/month/${YearMonth.from(today)}", user, null)).path("recurring").path("scheduledTotal").asLong() shouldBe 0
        call("POST", "/api/household/occurrences/$occId/skip", user, null).statusCode() shouldBe 409
    }

    @Test
    fun `반복 템플릿 — 지난 예정일이면 다음 달부터 · 고치면 이번 달 예정도 · 끝내면 예정 행 지움 · 거절 표`() {
        val user = "rec-e-${UUID.randomUUID()}"
        if (today.dayOfMonth > 1) {
            val past = data(call("POST", "/api/household/templates", user, """{"name":"통신","amount":55000,"category":"telecom","dayOfMonth":${today.dayOfMonth - 1}}"""))
            past.path("startsMonth").asString() shouldBe YearMonth.from(today).plusMonths(1).toString()
            past.path("thisMonth").isNull shouldBe true
            call("DELETE", "/api/household/templates/${past.path("id").asString()}", user, null).statusCode() shouldBe 200
        }
        val t = data(call("POST", "/api/household/templates", user, """{"name":"구독","amount":13900,"category":"culture","dayOfMonth":31}"""))
        val id = t.path("id").asString()
        val edited = call("PUT", "/api/household/templates/$id", user, """{"name":"영상 구독","amount":17000,"category":"culture","dayOfMonth":31,"confirmRequired":true}""")
        edited.statusCode() shouldBe 200
        data(edited).path("thisMonth").path("amount").asLong() shouldBe 17_000
        data(edited).path("thisMonth").path("name").asString() shouldBe "영상 구독"

        call("DELETE", "/api/household/templates/$id", user, null).statusCode() shouldBe 200
        data(call("GET", "/api/household/templates", user, null)).path("templates").size() shouldBe 0
        householdDatabase.dsl.fetchCount(householdDatabase.dsl.selectFrom("recurring_occurrence").where("user_id = ?", user)) shouldBe 0
        call("DELETE", "/api/household/templates/$id", user, null).statusCode() shouldBe 404

        call("POST", "/api/household/templates", user, """{"name":"a","amount":1,"category":"nope","dayOfMonth":1}""").body() shouldContain "TEMPLATE_CATEGORY_UNKNOWN"
        call("POST", "/api/household/templates", user, """{"name":"a","amount":1,"category":"food","dayOfMonth":32}""").statusCode() shouldBe 400
        call("POST", "/api/household/templates", user, """{"name":"${"가".repeat(41)}","amount":1,"category":"food","dayOfMonth":1}""").body() shouldContain "TEMPLATE_NAME_INVALID"
    }

    @Test
    fun `워커 — 확인 필요 없는 템플릿은 예정일에 지출로 · 빠진 예정 행을 다시 만든다 · 두 번 돌아도 같다`() {
        val user = "rec-w-${UUID.randomUUID()}"
        val t = data(call("POST", "/api/household/templates", user, """{"name":"보험","amount":42000,"category":"health","dayOfMonth":${today.dayOfMonth},"confirmRequired":false}"""))
        // 예정 행을 지워 워커가 다시 만드는지 본다(놓친 회차)
        householdDatabase.dsl.execute("DELETE FROM recurring_occurrence WHERE user_id = ?", user)
        runRecurring.execute()
        runRecurring.execute()
        val rows = householdDatabase.dsl.fetch("SELECT status, expense_id FROM recurring_occurrence WHERE user_id = ?", user)
        rows.size shouldBe 1
        rows[0].get("status", String::class.java) shouldBe "confirmed"
        val expenses = householdDatabase.dsl.fetch("SELECT input_kind, amount, spent_on FROM expense WHERE user_id = ?", user)
        expenses.size shouldBe 1
        expenses[0].get("input_kind", String::class.java) shouldBe "template"
        expenses[0].get("spent_on", LocalDate::class.java) shouldBe today
        eventTypes(user).count { it == "household.ExpenseRecorded" } shouldBe 1
        data(call("GET", "/api/household/templates", user, null)).path("templates").get(0).path("thisMonth").path("stage").asString() shouldBe "confirmed"
        t.path("id").asString().isNotEmpty() shouldBe true
    }

    @Test
    fun `월 마감 — 지난 달 닫으면 그때 예산을 붙잡는다 · MonthClosed 한 번 · 다시 내면 답만 · 닫을 수 없는 달 거절`() {
        val user = "close-${UUID.randomUUID()}"
        val last = YearMonth.from(today).minusMonths(1)
        call("POST", "/api/household/expenses", user, """{"amount":30000,"category":"food","spentOn":"${last.atDay(10)}"}""").statusCode() shouldBe 201
        call("PUT", "/api/household/budget", user, """{"method":"50_30_20","income":3000000}""").statusCode() shouldBe 200

        val open = data(call("GET", "/api/household/month/$last", user, null))
        open.path("closable").asBoolean() shouldBe true
        open.path("close").isNull shouldBe true
        open.path("reviewQuestions").items { it.asString() } shouldBe listOf("satisfied", "try_next", "known_next")

        val closed = call("POST", "/api/household/month/$last/close", user, """{"satisfied":" 집밥 ","tryNext":"","knownNext":null}""")
        closed.statusCode() shouldBe 200
        data(closed).path("answers").path("satisfied").asString() shouldBe "집밥"
        data(closed).path("answers").path("tryNext").isNull shouldBe true

        // 예산을 바꿔도 닫은 달은 그때 예산(판단 6)
        call("PUT", "/api/household/budget", user, """{"method":"envelope","envelopes":{"cafe":100000}}""").statusCode() shouldBe 200
        val view = data(call("GET", "/api/household/month/$last", user, null))
        view.path("budget").path("method").asString() shouldBe "50_30_20"
        view.path("envelopes").first { it.path("key").asString() == "needs" }.path("spent").asLong() shouldBe 30_000
        view.path("close").path("answers").path("satisfied").asString() shouldBe "집밥"

        // 다시 내면 답만 — 이벤트 · 닫은 시각 그대로
        val closedAt = view.path("close").path("closedAt").asString()
        data(call("POST", "/api/household/month/$last/close", user, """{"satisfied":"집밥","tryNext":"커피 줄이기"}""")).let {
            it.path("answers").path("tryNext").asString() shouldBe "커피 줄이기"
            it.path("closedAt").asString() shouldBe closedAt
        }
        eventTypes(user).count { it == "household.MonthClosed" } shouldBe 1
        val payload = householdDatabase.dsl.fetchOne("SELECT payload::text FROM outbox WHERE event_type = 'household.MonthClosed' AND payload->>'userId' = ?", user)!!.get(0, String::class.java)
        val event = jsonMapper.readTree(payload)
        event.path("total").asString() shouldBe "30000"
        event.path("count").asInt() shouldBe 1
        java.math.BigDecimal(event.path("budgetTotal").asString()).compareTo(java.math.BigDecimal(2_400_000)) shouldBe 0
        payload shouldNotContain "집밥"

        call("POST", "/api/household/month/${YearMonth.from(today).plusMonths(1)}/close", user, "{}").body() shouldContain "MONTH_NOT_CLOSABLE"
        if (YearMonth.from(today).lengthOfMonth() - today.dayOfMonth + 1 > 3) {
            call("POST", "/api/household/month/${YearMonth.from(today)}/close", user, "{}").body() shouldContain "MONTH_NOT_CLOSABLE"
        }
        call("POST", "/api/household/month/$last/close", user, """{"satisfied":"${"가".repeat(301)}"}""").body() shouldContain "CLOSE_ANSWER_TOO_LONG"
    }

    @Test
    fun `할부 띠 — 지난달 산 3개월이 이번 달 1회차 · 나머지는 첫 달 · 앞으로 6개월 합 · 달 합계는 산 달에`() {
        val user = "inst-${UUID.randomUUID()}"
        val last = YearMonth.from(today).minusMonths(1)
        call("POST", "/api/household/expenses", user, """{"amount":100000,"category":"shopping","merchant":"가전","installmentMonths":3,"spentOn":"${last.atDay(1)}"}""").statusCode() shouldBe 201
        val band = data(call("GET", "/api/household/month/${YearMonth.from(today)}", user, null)).path("installments")
        band.path("monthCharge").asLong() shouldBe 33_334
        val line = band.path("lines").get(0)
        line.path("index").asInt() shouldBe 1
        line.path("charge").asLong() shouldBe 33_334
        line.path("remainingAfter").asLong() shouldBe 66_666
        line.path("lastMonth").asString() shouldBe YearMonth.from(today).plusMonths(2).toString()
        band.path("upcoming").items { it.path("amount").asLong() } shouldBe listOf(33_334L, 33_333L, 33_333L, 0L, 0L, 0L)
        // 산 달 화면엔 청구가 없다(첫 청구는 다음 달) — 원거래는 그 달 합에
        val bought = data(call("GET", "/api/household/month/$last", user, null))
        bought.path("totals").path("total").asLong() shouldBe 100_000
        bought.path("installments").path("lines").size() shouldBe 0
        bought.path("installments").path("upcoming").get(1).path("amount").asLong() shouldBe 33_334
    }

    // ---------- 가계부 S1c — 감정 태그 · 노동시간 · 무지출 달력 ----------

    @Test
    fun `감정 태그 — 저장 때 붙임 · 당일엔 다음 날 답 거절 · 다음 날 묻기 · 한 번만 · 거울은 건수만 · 이벤트에 감정 0 · 남의 지출 404`() {
        val user = "feel-${UUID.randomUUID()}"
        val saved = data(call("POST", "/api/household/expenses", user, """{"amount":30000,"category":"shopping","emotion":"reward","feltNow":5}"""))
        val id = saved.path("expenses").get(0).path("id").asString()
        saved.path("expenses").get(0).path("feeling").path("emotion").asString() shouldBe "reward"
        saved.path("expenses").get(0).path("feeling").path("feltNow").asInt() shouldBe 5
        call("POST", "/api/household/expenses", user, """{"amount":1000,"category":"food","feltNow":3}""").body() shouldContain "FEELING_EMOTION_REQUIRED"
        call("POST", "/api/household/expenses", user, """{"amount":1000,"category":"food","emotion":"joy"}""").body() shouldContain "FEELING_EMOTION_UNKNOWN"
        // 틀린 감정이면 지출도 남지 않는다(한 트랜잭션)
        householdDatabase.dsl.fetchCount(householdDatabase.dsl.selectFrom("expense").where("user_id = ?", user)) shouldBe 1

        // 당일 — 묻지 않고, 답도 받지 않는다
        val month = YearMonth.from(today)
        data(call("GET", "/api/household/month/$month", user, null)).path("feelings").path("asks").size() shouldBe 0
        call("POST", "/api/household/expenses/$id/feeling/next", user, """{"felt":2}""").body() shouldContain "FEELING_NEXT_TOO_EARLY"

        // 태그 날짜를 어제로 — 다음 날이 된 것과 같다
        householdDatabase.dsl.execute("UPDATE expense_tag SET tagged_on = ? WHERE expense_id = ?::uuid", today.minusDays(1), id)
        val asks = data(call("GET", "/api/household/month/$month", user, null)).path("feelings").path("asks")
        asks.size() shouldBe 1
        asks.get(0).path("expenseId").asString() shouldBe id
        asks.get(0).path("amount").asLong() shouldBe 30_000
        call("POST", "/api/household/expenses/$id/feeling/next", user, """{"felt":7}""").body() shouldContain "FEELING_FELT_INVALID"
        data(call("POST", "/api/household/expenses/$id/feeling/next", user, """{"felt":2}""")).path("feltNext").asInt() shouldBe 2
        call("POST", "/api/household/expenses/$id/feeling/next", user, """{"felt":3}""").statusCode() shouldBe 409

        // 바꾸기 — 감정 · 산 직후만, 다음 날 답 · 태그 날짜는 그대로
        val changed = data(call("PUT", "/api/household/expenses/$id/feeling", user, """{"emotion":"stress","feltNow":4}"""))
        changed.path("emotion").asString() shouldBe "stress"
        changed.path("feltNext").asInt() shouldBe 2
        changed.path("taggedOn").asString() shouldBe today.minusDays(1).toString()

        val page = data(call("GET", "/api/household/month/$month", user, null))
        page.path("feelings").path("asks").size() shouldBe 0
        val mirror = page.path("feelings").path("mirror")
        mirror.size() shouldBe 1
        mirror.get(0).path("emotion").asString() shouldBe "stress"
        mirror.get(0).path("feltNow").items { it.asInt() } shouldBe listOf(0, 0, 0, 1, 0)
        mirror.get(0).path("feltNext").items { it.asInt() } shouldBe listOf(0, 1, 0, 0, 0)
        page.path("feelings").path("emotions").items { it.asString() } shouldBe listOf("stress", "reward", "boredom")
        page.path("expenses").get(0).path("feeling").path("emotion").asString() shouldBe "stress"
        listOf("average", "score", "grade").forEach { page.toString() shouldNotContain it }

        // 민감 정보 — 지출 이벤트 본문에 감정 · 만족이 없다
        householdDatabase.dsl.fetch("SELECT payload::text FROM outbox WHERE payload->>'userId' = ?", user)
            .map { it.get(0, String::class.java) }.forEach { it shouldNotContain "reward"; it shouldNotContain "felt" }

        // 남의 지출 — 붙이기 · 지우기 · 답 모두 404
        val other = "feel-o-${UUID.randomUUID()}"
        call("PUT", "/api/household/expenses/$id/feeling", other, """{"emotion":"stress"}""").statusCode() shouldBe 404
        call("DELETE", "/api/household/expenses/$id/feeling", other, null).statusCode() shouldBe 404
        call("POST", "/api/household/expenses/$id/feeling/next", other, """{"felt":1}""").statusCode() shouldBe 404

        // 지출을 지우면 태그도 지워진다
        call("DELETE", "/api/household/expenses/$id", user, null).statusCode() shouldBe 200
        householdDatabase.dsl.fetchCount(householdDatabase.dsl.selectFrom("expense_tag").where("user_id = ?", user)) shouldBe 0
    }

    @Test
    fun `다음 날 넘김 — 다시 묻지 않는다 · 8일 지난 태그는 묻지 않는다 · 태그 지우기`() {
        val user = "feel-skip-${UUID.randomUUID()}"
        val month = YearMonth.from(today)
        val ids = (1..2).map {
            data(call("POST", "/api/household/expenses", user, """{"amount":5000,"category":"cafe","emotion":"boredom"}""")).path("expenses").get(0).path("id").asString()
        }
        householdDatabase.dsl.execute("UPDATE expense_tag SET tagged_on = ? WHERE expense_id = ?::uuid", today.minusDays(1), ids[0])
        householdDatabase.dsl.execute("UPDATE expense_tag SET tagged_on = ? WHERE expense_id = ?::uuid", today.minusDays(8), ids[1])
        data(call("GET", "/api/household/month/$month", user, null)).path("feelings").path("asks").items { it.path("expenseId").asString() } shouldBe listOf(ids[0])
        val passed = data(call("POST", "/api/household/expenses/${ids[0]}/feeling/next", user, null))
        passed.path("nextDecided").asBoolean() shouldBe true
        passed.path("feltNext").isNull shouldBe true
        data(call("GET", "/api/household/month/$month", user, null)).path("feelings").path("asks").size() shouldBe 0
        call("DELETE", "/api/household/expenses/${ids[1]}/feeling", user, null).statusCode() shouldBe 200
        call("DELETE", "/api/household/expenses/${ids[1]}/feeling", user, null).statusCode() shouldBe 404
    }

    @Test
    fun `노동시간 — 기본 꺼짐 · 켜면 저장 응답 · 월 화면에 분 · 끄면 분 0 · 급여는 남는다 · 거절 표`() {
        val user = "work-${UUID.randomUUID()}"
        val month = YearMonth.from(today)
        data(call("GET", "/api/household/settings/work-hours", user, null)).path("on").asBoolean() shouldBe false
        data(call("POST", "/api/household/expenses", user, """{"amount":12000,"category":"food"}""")).path("savedWorkMinutes").isNull shouldBe true

        val on = data(call("PUT", "/api/household/settings/work-hours", user, """{"on":true,"basis":"monthly","amount":2090000}"""))
        on.path("hourly").asLong() shouldBe 10_000
        on.path("defaultMonthlyHours").asInt() shouldBe 209
        val saved = data(call("POST", "/api/household/expenses", user, """{"amount":25000,"category":"shopping"}"""))
        saved.path("savedWorkMinutes").asLong() shouldBe 150
        saved.path("expenses").get(0).path("workMinutes").asLong() shouldBe 150
        val page = data(call("GET", "/api/household/month/$month", user, null))
        page.path("workHours").path("hourly").asLong() shouldBe 10_000
        page.path("workHours").path("totalMinutes").asLong() shouldBe 222 // 37,000원 ÷ 1만 원 × 60
        page.path("expenses").items { it.path("workMinutes").asLong() }.sorted() shouldBe listOf(72L, 150L)

        val off = data(call("PUT", "/api/household/settings/work-hours", user, """{"on":false,"basis":"monthly","amount":2090000}"""))
        off.path("amount").asLong() shouldBe 2_090_000
        off.path("hourly").isNull shouldBe true
        val offPage = data(call("GET", "/api/household/month/$month", user, null))
        offPage.path("workHours").isNull shouldBe true
        offPage.path("expenses").get(0).path("workMinutes").isNull shouldBe true

        call("PUT", "/api/household/settings/work-hours", user, """{"on":true}""").body() shouldContain "WAGE_REQUIRED"
        call("PUT", "/api/household/settings/work-hours", user, """{"on":true,"basis":"weekly","amount":1000}""").body() shouldContain "WAGE_BASIS_INVALID"
        call("PUT", "/api/household/settings/work-hours", user, """{"on":true,"basis":"hourly","amount":10000,"monthlyHours":160}""").body() shouldContain "MONTHLY_HOURS_INVALID"
        // 급여는 이벤트 · 응답 밖으로 새지 않는다 — 아웃박스에 설정 이벤트가 없다
        eventTypes(user).none { "Setting" in it || "Wage" in it } shouldBe true
    }

    @Test
    fun `무지출 달력 — 안 쓴 날 표시 · 쓴 날은 거절 · 표시 뒤 지출이면 spent · 지우면 다시 · 미래 거절 · 연속 일수 칸 0`() {
        val user = "nospend-${UUID.randomUUID()}"
        val month = YearMonth.from(today)
        // 오늘 표시는 오늘이 몇 일이든 된다. 지출을 적은 날(오늘)은 거절
        call("PUT", "/api/household/no-spend/$today", user, null).statusCode() shouldBe 200
        call("PUT", "/api/household/no-spend/$today", user, null).statusCode() shouldBe 200
        var cal = data(call("GET", "/api/household/month/$month", user, null)).path("calendar")
        cal.path("days").size() shouldBe month.lengthOfMonth()
        val todayCell = { c: JsonNode -> c.path("days").get(today.dayOfMonth - 1) }
        todayCell(cal).path("state").asString() shouldBe "no_spend"
        cal.path("noSpendDays").asInt() shouldBe 1
        todayCell(cal).path("weekday").asInt() shouldBe today.dayOfWeek.value

        val id = data(call("POST", "/api/household/expenses", user, """{"amount":3000,"category":"cafe"}""")).path("expenses").get(0).path("id").asString()
        cal = data(call("GET", "/api/household/month/$month", user, null)).path("calendar")
        todayCell(cal).path("state").asString() shouldBe "spent"
        todayCell(cal).path("spent").asLong() shouldBe 3_000
        cal.path("noSpendDays").asInt() shouldBe 0
        call("PUT", "/api/household/no-spend/$today", user, null).body() shouldContain "STICKER_DAY_HAS_EXPENSE"

        call("DELETE", "/api/household/expenses/$id", user, null).statusCode() shouldBe 200
        todayCell(data(call("GET", "/api/household/month/$month", user, null)).path("calendar")).path("state").asString() shouldBe "no_spend"
        call("DELETE", "/api/household/no-spend/$today", user, null).statusCode() shouldBe 200
        val blank = todayCell(data(call("GET", "/api/household/month/$month", user, null)).path("calendar"))
        blank.path("state").asString() shouldBe "blank"
        blank.path("markable").asBoolean() shouldBe true

        call("PUT", "/api/household/no-spend/${today.plusDays(1)}", user, null).body() shouldContain "STICKER_DATE_FUTURE"
        call("PUT", "/api/household/no-spend/2026-13-01", user, null).body() shouldContain "DATE_INVALID"
        val raw = call("GET", "/api/household/month/$month", user, null).body()
        listOf("streak", "consecutive").forEach { raw shouldNotContain it }
    }

    // ---------- 도움 ----------

    /** household DSL 이 실행한 SQL 문장 수(저축 종단 테스트와 같은 장치 — BEGIN/COMMIT 은 세지 않는다) */
    private fun statements(): Long {
        QueryCounter.install(householdDatabase.dsl)
        return QueryCounter.count.get()
    }

    private object QueryCounter : org.jooq.ExecuteListener {
        val count = java.util.concurrent.atomic.AtomicLong()
        private var installed = false

        @Synchronized
        fun install(dsl: org.jooq.DSLContext) {
            if (installed) return
            val configuration = dsl.configuration()
            configuration.set(*(configuration.executeListenerProviders() + org.jooq.impl.DefaultExecuteListenerProvider(this)))
            installed = true
        }

        val active: ThreadLocal<Boolean> = ThreadLocal.withInitial { false }

        override fun executeStart(ctx: org.jooq.ExecuteContext) {
            if (active.get()) count.incrementAndGet()
        }
    }

    @org.springframework.boot.test.context.TestConfiguration
    class CountingFilter {
        @org.springframework.context.annotation.Bean
        fun householdQueryCountingFilter(): org.springframework.boot.web.servlet.FilterRegistrationBean<jakarta.servlet.Filter> =
            org.springframework.boot.web.servlet.FilterRegistrationBean<jakarta.servlet.Filter>(
                jakarta.servlet.Filter { request, response, chain ->
                    val counted = (request as jakarta.servlet.http.HttpServletRequest).getHeader(HEADER) != null
                    if (counted) QueryCounter.active.set(true)
                    try {
                        chain.doFilter(request, response)
                    } finally {
                        if (counted) QueryCounter.active.remove()
                    }
                },
            ).apply { order = org.springframework.core.Ordered.HIGHEST_PRECEDENCE }

        companion object {
            const val HEADER = "X-Test-Count-Queries"
        }
    }

    private fun eventTypes(user: String): List<String> =
        householdDatabase.dsl.fetch("SELECT event_type FROM outbox WHERE payload->>'userId' = ? ORDER BY seq", user).map { it.get(0, String::class.java) }

    private fun data(res: HttpResponse<String>): JsonNode {
        check(res.statusCode() in 200..299) { "${res.statusCode()} ${res.body()}" }
        return jsonMapper.readTree(res.body()).path("data")
    }

    private fun JsonNode.first(predicate: (JsonNode) -> Boolean): JsonNode = (0 until size()).map { get(it) }.first(predicate)

    /** Jackson 3 JsonNode 의 map 은 컬렉션 map 이 아니다 — 배열을 리스트로 */
    private fun <T> JsonNode.items(f: (JsonNode) -> T): List<T> = (0 until size()).map { f(get(it)) }

    private fun call(method: String, path: String, user: String, body: String?, countQueries: Boolean = false): HttpResponse<String> {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
            .method(method, body?.let { HttpRequest.BodyPublishers.ofString(it) } ?: HttpRequest.BodyPublishers.noBody())
            .header("Authorization", "Bearer ${token(user)}")
            .apply { if (countQueries) header(CountingFilter.HEADER, "1") }
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
