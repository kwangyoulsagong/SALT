package com.salt.identity.api

import com.salt.identity.application.DeleteAccount
import com.salt.identity.application.ExportAccount
import com.salt.identity.application.IssueEraseGrant
import com.salt.identity.domain.PersonalTable
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import com.salt.support.web.EraseGrants
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/** 서비스 하나의 내보내기 — 다른 서비스(`/api/{service}/me/data`)와 같은 모양 */
data class ServiceExportBody(val service: String, val tables: List<PersonalTable>)

/** 서비스 하나의 지우기 결과 — 표마다 행 수 */
data class ServiceErasureBody(val service: String, val deleted: Map<String, Int>)

/**
 * 내 계정 — 내보내기 · 지우기 허가 · 계정 지우기(`SRV-REQ-048` FR-3 · 4, 서버 S3c). 순서는 BFF(`/api/app/me` 아래)가 정한다.
 * 허가 요청은 사용자당 10분 5번 — 비밀번호 대입을 막는다(로그인 경로보다 좁다: 이미 로그인한 사람이 한두 번 칠 일이다).
 */
@Tag(name = "identity-my-data", description = "내 데이터 — 내보내기 · 계정 삭제(SRV-REQ-048 FR-3 · 4)")
@RestController
@RequestMapping("/api/identity/me")
class MyAccountController(
    private val export: ExportAccount,
    private val grant: IssueEraseGrant,
    private val delete: DeleteAccount,
    private val grants: EraseGrants,
    private val grantLimit: FixedWindowLimit,
) {
    data class GrantRequest(@field:NotNull(message = MISSING) @field:Size(min = 1, max = 200, message = "비밀번호를 입력해 주세요") val password: String?)

    data class GrantBody(val eraseToken: String, val expiresIn: Long)

    data class DeleteRequest(@field:NotNull(message = "deleted 가 필요해요") val deleted: Map<String, Map<String, Int>>?)

    @Operation(summary = "내 계정 데이터 내보내기 — 비밀번호 해시 제외")
    @GetMapping("/data")
    fun exportData(user: AuthenticatedUser): ResponseEntity<ApiResponse<ServiceExportBody>> =
        ApiResponse.ok(ServiceExportBody(SERVICE, export.execute(user.userId)))

    @Operation(summary = "계정 삭제 허가 — 비밀번호를 다시 확인하고 5분 토큰")
    @PostMapping("/erase-grant")
    fun issueGrant(user: AuthenticatedUser, @Valid @RequestBody body: GrantRequest): ResponseEntity<ApiResponse<GrantBody>> {
        grantLimit.acquire(user.userId)
        val (token, expiresIn) = grant.execute(user.userId, body.password!!)
        return ApiResponse.ok(GrantBody(token, expiresIn))
    }

    @Operation(summary = "계정 지우기 — 마지막 단계(다른 서비스를 다 지운 뒤). 서비스별 행 수를 기록")
    @DeleteMapping
    fun deleteAccount(
        user: AuthenticatedUser,
        @RequestHeader(EraseGrants.HEADER, required = false) grant: String?,
        @Valid @RequestBody body: DeleteRequest,
    ): ResponseEntity<ApiResponse<ServiceErasureBody>> {
        grants.require(grant, user)
        return ApiResponse.ok(ServiceErasureBody(SERVICE, delete.execute(user.userId, body.deleted!!)))
    }

    private companion object {
        const val SERVICE = "identity"
    }
}
