package com.salt

import com.salt.support.persistence.ServiceDatabase
import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import tools.jackson.databind.JsonNode
import java.sql.DriverManager
import java.sql.SQLException
import java.util.UUID

/**
 * 서버 S3a 합격선(`SRV-REQ-048` FR-1 · 2 · 수용 기준 "투자 미선택 사용자 온보딩에 투자 질문 0") — 실 Postgres(서비스 계정 · Flyway).
 * 경계 표는 `ShellPrefsSpec`. 여기는 HTTP · 저장 · 거절 응답 모양 · DB 모양 검사가 실제로 붙어 있는지.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class IdentityShellEndToEndTest : ContentHttp() {
    @Autowired @Qualifier("identityDatabase")
    private lateinit var identityDatabase: ServiceDatabase

    private fun shell(user: String) = data(call("GET", "/api/identity/shell", user))

    private fun strings(node: JsonNode?) = node?.let { items(it).map { n -> n.asString() } }

    @Test
    fun `행 없음 — 고르기부터 · 기본 순서 · 숨김 0 · 인증 없으면 401`() {
        call("GET", "/api/identity/shell", null).statusCode() shouldBe 401
        val s = shell("id-new-${UUID.randomUUID()}")
        s.path("chosenDomains").isNull shouldBe true
        strings(s.path("choosableDomains")) shouldBe listOf("savings", "household", "invest")
        s.path("onboarding").path("nextStep").asString() shouldBe "choose_domains"
        s.path("onboarding").path("complete").asBoolean() shouldBe false
        strings(s.path("layout").path("order")) shouldBe listOf("savings", "household", "invest", "tips")
        strings(s.path("layout").path("hidden")) shouldBe emptyList()
        s.path("layout").path("saved").asBoolean() shouldBe false
    }

    @Test
    fun `투자를 안 고르면 — 첫 입력은 고른 것 · 투자 카드 숨김 · 끝내면 complete`() {
        val user = "id-save-${UUID.randomUUID()}"
        call("POST", "/api/identity/shell/onboarding/finish", user).statusCode() shouldBe 409
        val chosen = data(call("PUT", "/api/identity/shell/domains", user, """{"domains":["household","savings"]}"""))
        strings(chosen.path("chosenDomains")) shouldBe listOf("savings", "household")
        chosen.path("onboarding").path("nextStep").asString() shouldBe "first_input"
        chosen.path("onboarding").path("firstInputDomain").asString() shouldBe "savings"
        strings(chosen.path("layout").path("hidden")) shouldBe listOf("invest")

        val done = data(call("POST", "/api/identity/shell/onboarding/finish", user))
        done.path("onboarding").path("complete").asBoolean() shouldBe true
        done.path("onboarding").path("nextStep").isNull shouldBe true
        // 다시 읽어도 같다(저장됨)
        shell(user).path("onboarding").path("complete").asBoolean() shouldBe true
    }

    @Test
    fun `고르기 거절 — 빈 목록 · 팁 · 숫자 · 모르는 키는 400`() {
        val user = "id-bad-${UUID.randomUUID()}"
        listOf("""{"domains":[]}""", """{"domains":["tips"]}""", """{"domains":[1]}""", """{"domains":["coach"]}""", """{}""").forEach { body ->
            call("PUT", "/api/identity/shell/domains", user, body).statusCode() shouldBe 400
        }
        shell(user).path("chosenDomains").isNull shouldBe true
    }

    @Test
    fun `홈 배치 — 저장 · 다시 골라도 유지 · 전부 숨김 · 빠진 카드는 400`() {
        val user = "id-layout-${UUID.randomUUID()}"
        val saved = data(call("PUT", "/api/identity/shell/layout", user, """{"order":["tips","invest","household","savings"],"hidden":["invest"]}"""))
        strings(saved.path("layout").path("order")) shouldBe listOf("tips", "invest", "household", "savings")
        strings(saved.path("layout").path("hidden")) shouldBe listOf("invest")
        saved.path("layout").path("saved").asBoolean() shouldBe true

        val rechosen = data(call("PUT", "/api/identity/shell/domains", user, """{"domains":["invest"]}"""))
        strings(rechosen.path("layout").path("hidden")) shouldBe listOf("invest")

        call("PUT", "/api/identity/shell/layout", user, """{"order":["tips","invest","household","savings"],"hidden":["tips","invest","household","savings"]}""").statusCode() shouldBe 400
        call("PUT", "/api/identity/shell/layout", user, """{"order":["tips","invest","household"],"hidden":[]}""").statusCode() shouldBe 400
        call("PUT", "/api/identity/shell/layout", user, """{"order":["tips","invest","household","savings"]}""").statusCode() shouldBe 400
        strings(shell(user).path("layout").path("order")) shouldBe listOf("tips", "invest", "household", "savings")
    }

    @Test
    fun `DB 모양 검사 — 도메인 밖 값은 표가 막는다`() {
        val dsl = identityDatabase.dsl
        val error = runCatching {
            dsl.execute("INSERT INTO user_domain_pref (user_id, chosen_domains, updated_at) VALUES ('x', 'tips', now())")
        }.exceptionOrNull()
        (error != null) shouldBe true
    }

    @Test
    fun `svc_identity 는 남의 스키마를 읽지 못한다`() {
        val pg = PlatformContainers.postgres
        val error = runCatching {
            DriverManager.getConnection(pg.jdbcUrl, "svc_identity", PlatformContainers.IDENTITY_PASSWORD).use {
                it.createStatement().executeQuery("SELECT * FROM portfolio.probe")
            }
        }.exceptionOrNull() as? SQLException
        error?.sqlState shouldBe "42501"
    }

    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) = PlatformContainers.register(registry)
    }
}
