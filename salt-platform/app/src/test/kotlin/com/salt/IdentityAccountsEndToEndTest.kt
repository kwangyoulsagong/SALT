package com.salt

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import com.salt.support.persistence.ServiceDatabase
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.collections.shouldContainExactlyInAnyOrder
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldMatch
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import tools.jackson.databind.JsonNode
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.Date
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.Executors

/**
 * 서버 S3b 합격선(`SRV-REQ-048` FR-8 · 9 · `DB-REQ-040` FR-1 · 5) — 실 Postgres(서비스 계정 · Flyway V2) · 실 HTTP.
 * 판정 경계는 `InviteAcceptanceSpec` · `DualTokenVerifierSpec`. 여기는 옛 Express 와 같은 응답 모양 · 토큰이 실제로 플랫폼 경로를 지나는지 ·
 * 받는 쪽이 다른 토큰이 막히는지 · 경합 · 아웃박스 · 옮겨 온 bcrypt 해시가 맞는지.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class IdentityAccountsEndToEndTest : ContentHttp() {
    @Autowired @Qualifier("identityDatabase")
    private lateinit var identityDatabase: ServiceDatabase

    private val http = HttpClient.newHttpClient()

    private fun raw(method: String, path: String, bearer: String? = null, body: String? = null): HttpResponse<String> {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
            .method(method, body?.let { HttpRequest.BodyPublishers.ofString(it) } ?: HttpRequest.BodyPublishers.noBody())
            .apply { if (bearer != null) header("Authorization", "Bearer $bearer") }
            .apply { if (body != null) header("Content-Type", "application/json") }
            .build()
        return http.send(request, HttpResponse.BodyHandlers.ofString())
    }

    private fun json(res: HttpResponse<String>): JsonNode = jsonMapper.readTree(res.body())

    /** 관리자 발급(`ops/issue-invite-codes.sh`)과 같은 행 */
    private fun issueCode(expiresInSeconds: Long = 3600): String {
        val code = UUID.randomUUID().toString().replace("-", "").take(8).uppercase()
        identityDatabase.dsl.execute(
            "INSERT INTO invite_codes (id, code, expires_at, created_at) VALUES (?, ?, now() + make_interval(secs => ?), now())",
            UUID.randomUUID().toString(), code, expiresInSeconds.toDouble(),
        )
        return code
    }

    private fun acceptBody(code: String, email: String, password: String = "password-123") =
        """{"code":" ${code.lowercase()} ","email":"$email","nickname":"테스터","password":"$password"}"""

    private fun register(email: String = "s3b-${UUID.randomUUID()}@example.com"): JsonNode {
        val res = raw("POST", "/api/auth/invite/accept", body = acceptBody(issueCode(), email))
        res.statusCode() shouldBe 201
        return json(res)
    }

    private fun legacyHs(secret: String, userId: String, email: String): String {
        val now = System.currentTimeMillis()
        val claims = JWTClaimsSet.Builder().claim("userId", userId).claim("email", email)
            .issueTime(Date(now - 1_000)).expirationTime(Date(now + 600_000)).build()
        return SignedJWT(JWSHeader(JWSAlgorithm.HS256), claims).apply { sign(MACSigner(secret)) }.serialize()
    }

    @Test
    fun `가입 — 옛 응답 모양 · RS256 토큰(kid) · 그 토큰이 me 와 다른 서비스 경로를 지난다 · UserRegistered 아웃박스 하나`() {
        val email = "s3b-${UUID.randomUUID()}@example.com"
        val body = register(email)
        body.path("success").asBoolean() shouldBe true
        body.path("message").asString() shouldBe "User registered successfully"
        val data = body.path("data")
        data.propertyNames().toList() shouldContainExactly listOf("user", "accessToken", "refreshToken")
        val user = data.path("user")
        user.propertyNames().toList() shouldContainExactly
            listOf("id", "email", "nickname", "profileImageUrl", "totalPoints", "userLevel", "createdAt", "lastLoginAt")
        user.path("email").asString() shouldBe email
        user.path("totalPoints").asInt() shouldBe 0
        user.path("userLevel").asInt() shouldBe 1
        user.path("lastLoginAt").isNull shouldBe true
        user.path("createdAt").asString() shouldMatch Regex("""\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z""")

        val access = data.path("accessToken").asString()
        val header = SignedJWT.parse(access).header
        header.algorithm shouldBe JWSAlgorithm.RS256
        header.keyID shouldNotBe null

        val me = json(raw("GET", "/api/auth/me", access)).path("data")
        me.path("id").asString() shouldBe user.path("id").asString()
        // 다른 서비스(identity 셸 · 저축) 경로도 같은 토큰으로
        raw("GET", "/api/identity/shell", access).statusCode() shouldBe 200
        raw("GET", "/api/savings/goals", access).statusCode() shouldBe 200

        val events = identityDatabase.dsl.fetch(
            "SELECT payload FROM outbox WHERE event_type = 'identity.UserRegistered' AND payload->>'userId' = ?", user.path("id").asString(),
        )
        events.size shouldBe 1
        jsonMapper.readTree(events[0].get(0).toString()).propertyNames().toList() shouldContainExactlyInAnyOrder listOf("userId", "registeredAt")
    }

    @Test
    fun `로그인 · 갱신 — 옛 응답 모양 · 갱신 토큰은 API 를 못 지나고 접근 토큰은 갱신을 못 한다`() {
        val email = "s3b-${UUID.randomUUID()}@example.com"
        register(email)
        raw("POST", "/api/auth/login", body = """{"email":"$email","password":"wrong-pass"}""").let {
            it.statusCode() shouldBe 401
            json(it).path("code").asString() shouldBe "AUTH_INVALID_CREDENTIALS"
        }
        raw("POST", "/api/auth/login", body = """{"email":"nobody-${UUID.randomUUID()}@example.com","password":"x"}""").let {
            json(it).path("message").asString() shouldBe "Invalid credentials"
        }
        // BFF 프록시는 공개 경로에도 `Bearer undefined` 를 싣는다 — 공개 경로는 헤더를 읽지 않는다(Express 와 같다)
        raw("POST", "/api/auth/login", "undefined", """{"email":"$email","password":"password-123"}""").statusCode() shouldBe 200
        raw("GET", "/api/auth/invite/check?code=NOPE9999", "garbage.token.x").statusCode() shouldBe 200
        // 인증 경로는 그대로 검증한다
        raw("GET", "/api/auth/me", "undefined").statusCode() shouldBe 401
        val login = json(raw("POST", "/api/auth/login", body = """{"email":"$email","password":"password-123"}"""))
        login.path("message").asString() shouldBe "Login successful"
        login.path("data").path("user").propertyNames().toList() shouldContainExactly
            listOf("id", "email", "nickname", "profileImageUrl", "totalPoints", "userLevel")
        val access = login.path("data").path("accessToken").asString()
        val refresh = login.path("data").path("refreshToken").asString()
        // 로그인이 마지막 로그인 시각을 남긴다
        json(raw("GET", "/api/auth/me", access)).path("data").path("lastLoginAt").isNull shouldBe false

        raw("GET", "/api/auth/me", refresh).statusCode() shouldBe 401
        raw("POST", "/api/auth/refresh", body = """{"refreshToken":"$access"}""").let {
            it.statusCode() shouldBe 401
            json(it).path("message").asString() shouldBe "Invalid refresh token"
        }
        val renewed = json(raw("POST", "/api/auth/refresh", body = """{"refreshToken":"$refresh"}""")).path("data")
        renewed.propertyNames().toList() shouldContainExactly listOf("accessToken")
        raw("GET", "/api/auth/me", renewed.path("accessToken").asString()).statusCode() shouldBe 200
    }

    @Test
    fun `이중 기간 — 옛 HS 접근 · 갱신 토큰이 통과하고 갱신은 새 RS 를 준다 · 옛 게스트 모양은 거절`() {
        val email = "s3b-${UUID.randomUUID()}@example.com"
        val userId = register(email).path("data").path("user").path("id").asString()
        raw("GET", "/api/auth/me", legacyHs(PlatformContainers.JWT_SECRET, userId, email)).statusCode() shouldBe 200
        // 갱신 비밀로 서명한 접근 모양은 API 를 못 지난다(옛 비밀 분리 그대로)
        raw("GET", "/api/auth/me", legacyHs(PlatformContainers.JWT_REFRESH_SECRET, userId, email)).statusCode() shouldBe 401
        val renewed = json(raw("POST", "/api/auth/refresh", body = """{"refreshToken":"${legacyHs(PlatformContainers.JWT_REFRESH_SECRET, userId, email)}"}"""))
        val access = renewed.path("data").path("accessToken").asString()
        SignedJWT.parse(access).header.algorithm shouldBe JWSAlgorithm.RS256
        // 접근 비밀로 서명한 것은 갱신 토큰이 아니다
        raw("POST", "/api/auth/refresh", body = """{"refreshToken":"${legacyHs(PlatformContainers.JWT_SECRET, userId, email)}"}""").statusCode() shouldBe 401
    }

    @Test
    fun `게스트 — 30분 토큰 · 사람 경로 401 · JWKS 공개 · 개인 칸 0`() {
        val guest = json(raw("POST", "/api/auth/guest")).path("data")
        guest.path("expiresIn").asLong() shouldBe 1800
        raw("GET", "/api/auth/me", guest.path("guestToken").asString()).let {
            it.statusCode() shouldBe 401
            json(it).path("message").asString() shouldBe "Invalid token"
        }
        val jwks = raw("GET", "/.well-known/jwks.json")
        jwks.statusCode() shouldBe 200
        val set = JWKSet.parse(jwks.body())
        set.keys.isEmpty() shouldBe false
        set.keys.forEach { it.isPrivate shouldBe false }
        jwks.body().contains("\"d\"") shouldBe false
        set.getKeyByKeyId(SignedJWT.parse(guest.path("guestToken").asString()).header.keyID) shouldNotBe null
    }

    @Test
    fun `초대 거절 — 403 코드 넷 · 정원 미노출 · 이메일 겹침은 코드를 소모하지 않는다 · 시도 기록 앞 4자`() {
        json(raw("GET", "/api/auth/invite/check?code=NOPE9999")).path("data").let {
            it.path("valid").asBoolean() shouldBe false
            it.path("reasonCode").asString() shouldBe "not_found"
        }
        val fresh = issueCode()
        json(raw("GET", "/api/auth/invite/check?code=${fresh.lowercase()}")).path("data").propertyNames().toList() shouldContainExactly listOf("valid")
        raw("GET", "/api/auth/invite/check").statusCode() shouldBe 400

        val expired = issueCode(expiresInSeconds = -60)
        raw("POST", "/api/auth/invite/accept", body = acceptBody(expired, "x-${UUID.randomUUID()}@example.com")).let {
            it.statusCode() shouldBe 403
            json(it).path("code").asString() shouldBe "INVITE_EXPIRED"
        }
        val email = "dup-${UUID.randomUUID()}@example.com"
        register(email)
        val spare = issueCode()
        raw("POST", "/api/auth/invite/accept", body = acceptBody(spare, email)).let {
            it.statusCode() shouldBe 409
            json(it).path("code").asString() shouldBe "AUTH_EMAIL_TAKEN"
        }
        json(raw("GET", "/api/auth/invite/check?code=$spare")).path("data").path("valid").asBoolean() shouldBe true
        identityDatabase.dsl.fetchValue("SELECT count(*) FROM invite_code_attempts WHERE code_prefix = ? AND reason_code = 'expired'", expired.take(4)) shouldBe 1L
        identityDatabase.dsl.fetchValue("SELECT max(length(code_prefix)) FROM invite_code_attempts") shouldBe 4

        // 검증 — 옛 zod 문구 그대로
        val invalid = json(raw("POST", "/api/auth/invite/accept", body = """{"code":"X","email":"a@b","nickname":"x","password":"short"}"""))
        invalid.path("message").asString() shouldBe "Validation error"
        val messages = (0 until invalid.path("errors").size()).associate {
            invalid.path("errors").get(it).path("field").asString() to invalid.path("errors").get(it).path("message").asString()
        }
        messages["email"] shouldBe "Invalid email format"
        messages["nickname"] shouldBe "Nickname must be at least 2 characters"
        messages["password"] shouldBe "Password must be at least 8 characters"
        raw("POST", "/api/auth/register", body = "{}").statusCode() shouldBe 404
    }

    @Test
    fun `같은 코드 동시 수락 — 하나만 201 · 나머지 403 INVITE_ALREADY_USED · 계정 하나 · 이벤트 하나`() {
        val code = issueCode()
        val pool = Executors.newFixedThreadPool(4)
        val results = pool.invokeAll((1..4).map { i ->
            Callable { raw("POST", "/api/auth/invite/accept", body = acceptBody(code, "race-$i-${UUID.randomUUID()}@example.com")) }
        }).map { it.get() }
        pool.shutdown()
        results.count { it.statusCode() == 201 } shouldBe 1
        results.filter { it.statusCode() != 201 }.forEach {
            it.statusCode() shouldBe 403
            json(it).path("code").asString() shouldBe "INVITE_ALREADY_USED"
        }
        val owner = identityDatabase.dsl.fetchValue("SELECT used_by_user_id FROM invite_codes WHERE code = ?", code) as String
        identityDatabase.dsl.fetchValue("SELECT count(*) FROM users WHERE id = ?", owner) shouldBe 1L
        identityDatabase.dsl.fetchValue(
            "SELECT count(*) FROM outbox WHERE event_type = 'identity.UserRegistered' AND payload->>'userId' = ?", owner,
        ) shouldBe 1L
    }

    @Test
    fun `옮겨 온 옛 bcrypt 해시(2b · cost 10)로 로그인된다 · 프로필 조회 · 수정`() {
        val id = UUID.randomUUID().toString()
        val email = "legacy-${UUID.randomUUID()}@example.com"
        // 옛 Express(bcryptjs)가 만든 것과 같은 판 — 가져오기 SQL 이 글자 그대로 옮긴다
        val hash = BCryptPasswordEncoder(BCryptPasswordEncoder.BCryptVersion.`$2B`, 10).encode("old-password-1")!!
        hash.take(7) shouldBe "\$2b\$10\$"
        identityDatabase.dsl.execute(
            "INSERT INTO users (id, email, nickname, password_hash, created_at, updated_at) VALUES (?, ?, '옛사람', ?, now(), now())", id, email, hash,
        )
        val access = json(raw("POST", "/api/auth/login", body = """{"email":"$email","password":"old-password-1"}""")).path("data").path("accessToken").asString()
        json(raw("GET", "/api/users/profile", access)).path("data").path("nickname").asString() shouldBe "옛사람"
        val updated = json(raw("PATCH", "/api/users/profile", access, """{"nickname":"새이름"}"""))
        updated.path("message").asString() shouldBe "Profile updated successfully"
        updated.path("data").path("nickname").asString() shouldBe "새이름"
        updated.path("data").path("email").asString() shouldBe email
        raw("PATCH", "/api/users/profile", access, """{"nickname":"x"}""").statusCode() shouldBe 400
        raw("GET", "/api/users/profile", null).statusCode() shouldBe 401
    }

    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) = PlatformContainers.register(registry)
    }
}
