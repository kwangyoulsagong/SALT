package com.salt.identity.api

import com.fasterxml.jackson.annotation.JsonInclude
import com.salt.identity.application.AcceptInviteCode
import com.salt.identity.application.AcceptInviteCommand
import com.salt.identity.application.CheckInviteCode
import com.salt.identity.application.GetAccount
import com.salt.identity.application.IssueGuestToken
import com.salt.identity.application.Login
import com.salt.identity.application.RefreshSession
import com.salt.identity.domain.AccountView
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/** 옛 Express 응답의 시각 모양(Prisma Date → JSON) — 늘 밀리초 세 자리 + Z */
private val MILLIS: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC)

internal fun Instant.express(): String = MILLIS.format(this)

/** zod 4 가 빠진 칸에 내는 문구 — 옛 오류 바디 그대로 */
internal const val MISSING = "Invalid input: expected string, received undefined"

/** zod 4 `z.string().email()` 와 같은 식 — 옛 경로가 받던 주소만 받는다 */
internal const val EMAIL_PATTERN = "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"

/** 계정 응답(`/auth/me` · 가입 · 프로필) — 옛 Prisma select 여덟 칸 그대로(없는 마지막 로그인은 null 로 싣는다) */
data class AccountBody(
    val id: String,
    val email: String,
    val nickname: String,
    val profileImageUrl: String?,
    val totalPoints: Int,
    val userLevel: Int,
    val createdAt: String,
    val lastLoginAt: String?,
)

internal fun AccountView.body() =
    AccountBody(id, email, nickname, profileImageUrl, totalPoints, userLevel, createdAt.express(), lastLoginAt?.express())

/**
 * 인증 HTTP(`SRV-REQ-048` FR-8, 서버 S3b) — 옛 Express `/api/auth` 아래 여섯 경로를 **같은 주소 · 같은 응답**으로(BFF 는 라우팅 값만 바꾼다).
 * `register` 경로는 없다 — 계정은 초대 수락으로만 생긴다(`POST /api/auth/register` 는 404).
 * 요청 제한: 코드 확인 1분 30 · 수락 1분 10 · 게스트 10분 [guestPerWindow](옛것과 같은 수).
 */
@Tag(name = "auth", description = "초대 가입 · 로그인 · 토큰 갱신 · 게스트 토큰(SRV-REQ-048 FR-8)")
@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val accept: AcceptInviteCode,
    private val check: CheckInviteCode,
    private val login: Login,
    private val refresh: RefreshSession,
    private val guest: IssueGuestToken,
    private val me: GetAccount,
    private val limits: AuthLimits,
) {
    /** 요청 제한 셋 — 조립(IdentityComposition)이 수를 정한다 */
    data class AuthLimits(val check: FixedWindowLimit, val accept: FixedWindowLimit, val guest: FixedWindowLimit)

    data class AcceptBody(
        @field:NotNull(message = MISSING) @field:Size(min = 1, message = "초대 코드를 입력해 주세요") val code: String?,
        @field:NotNull(message = MISSING) @field:Pattern(regexp = EMAIL_PATTERN, message = "Invalid email format") val email: String?,
        @field:NotNull(message = MISSING)
        @field:Size(min = 2, message = "Nickname must be at least 2 characters")
        @field:Size(max = 50, message = "Too big: expected string to have <=50 characters")
        val nickname: String?,
        @field:NotNull(message = MISSING) @field:Size(min = 8, message = "Password must be at least 8 characters") val password: String?,
    )

    data class LoginBody(
        @field:NotNull(message = MISSING) @field:Pattern(regexp = EMAIL_PATTERN, message = "Invalid email format") val email: String?,
        @field:NotNull(message = MISSING) @field:Size(min = 1, message = "Password is required") val password: String?,
    )

    data class RefreshBody(@field:NotNull(message = MISSING) @field:Size(min = 1, message = "Refresh token is required") val refreshToken: String?)

    /** 유효하면 `{ valid: true }` 만 — 옛 응답에 사유 칸이 없었다 */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    data class InviteCheckBody(val valid: Boolean, val reasonCode: String?)

    data class SessionBody(val user: Any, val accessToken: String, val refreshToken: String)

    /** 로그인 응답의 계정 — 옛것은 가입 시각 · 마지막 로그인을 싣지 않았다 */
    data class LoginUserBody(val id: String, val email: String, val nickname: String, val profileImageUrl: String?, val totalPoints: Int, val userLevel: Int)

    data class GuestBody(val guestToken: String, val expiresIn: Long)

    data class AccessBody(val accessToken: String)

    @Operation(summary = "초대 코드 확인 — 계정을 만들지 않는다. 정원 상태는 드러내지 않는다")
    @GetMapping("/invite/check")
    fun checkInvite(
        @RequestParam(required = false) @NotNull(message = MISSING) @Size(min = 1, message = "초대 코드를 입력해 주세요") code: String?,
        request: HttpServletRequest,
    ): ResponseEntity<ApiResponse<InviteCheckBody>> {
        limits.check.acquire(request.remoteAddr)
        val result = check.execute(code!!)
        return ApiResponse.ok(InviteCheckBody(result.valid, result.reasonCode))
    }

    @Operation(summary = "초대 코드로 가입 — 계정이 생기는 유일한 경로")
    @PostMapping("/invite/accept")
    fun acceptInvite(@Valid @RequestBody body: AcceptBody, request: HttpServletRequest): ResponseEntity<ApiResponse<SessionBody>> {
        limits.accept.acquire(request.remoteAddr)
        val result = accept.execute(AcceptInviteCommand(body.code!!, body.email!!, body.nickname!!, body.password!!, request.remoteAddr))
        return ApiResponse.created(SessionBody(result.user.body(), result.tokens.accessToken, result.tokens.refreshToken), "User registered successfully")
    }

    @Operation(summary = "로그인")
    @PostMapping("/login")
    fun login(@Valid @RequestBody body: LoginBody): ResponseEntity<ApiResponse<SessionBody>> {
        val result = login.execute(body.email!!, body.password!!)
        val u = result.user
        return ApiResponse.ok(
            SessionBody(LoginUserBody(u.id, u.email, u.nickname, u.profileImageUrl, u.totalPoints, u.userLevel), result.tokens.accessToken, result.tokens.refreshToken),
            "Login successful",
        )
    }

    @Operation(summary = "게스트 토큰 — 로그인 없이 시장 데이터를 읽는 30분 토큰(사람 정보 0)")
    @PostMapping("/guest")
    fun issueGuest(request: HttpServletRequest): ResponseEntity<ApiResponse<GuestBody>> {
        limits.guest.acquire(request.remoteAddr)
        val (token, expiresIn) = guest.execute()
        return ApiResponse.ok(GuestBody(token, expiresIn))
    }

    @Operation(summary = "접근 토큰 재발급 — 이중 기간엔 옛 HS 갱신 토큰도 받는다")
    @PostMapping("/refresh")
    fun refreshToken(@Valid @RequestBody body: RefreshBody): ResponseEntity<ApiResponse<AccessBody>> =
        ApiResponse.ok(AccessBody(refresh.execute(body.refreshToken!!)))

    @Operation(summary = "지금 사용자")
    @GetMapping("/me")
    fun getMe(user: AuthenticatedUser): ResponseEntity<ApiResponse<AccountBody>> = ApiResponse.ok(me.execute(user.userId).body())
}
