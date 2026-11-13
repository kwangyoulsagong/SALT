package com.salt.identity.api

import com.salt.identity.application.CountUsage
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

/**
 * 도메인 사용 계측(`SRV-REQ-048` FR-7, 서버 S3d) — 화면을 연 것 · 홈 카드를 누른 것 한 번. 금액 · 화면 내용은 받을 칸이 없다.
 * 집계는 HTTP 로 열지 않는다 — 보는 사람은 운영자 하나라 `ops/salt.sh usage` 가 읽는다.
 */
@Tag(name = "identity", description = "도메인 사용 계측(SRV-REQ-048 FR-7)")
@RestController
class UsageController(private val count: CountUsage) {
    data class UsageBody(
        @field:NotNull @field:Size(min = 1, max = 20) val domain: String?,
        @field:NotNull @field:Size(min = 1, max = 20) val kind: String?,
    )

    data class Counted(val counted: Boolean)

    @Operation(summary = "도메인 사용 한 번 — domain: savings · household · invest · tips, kind: visit · card_click")
    @PostMapping("/api/identity/me/usage")
    fun record(user: AuthenticatedUser, @Valid @RequestBody body: UsageBody): ResponseEntity<ApiResponse<Counted>> {
        count.execute(user.userId, body.domain!!, body.kind!!)
        return ApiResponse.ok(Counted(true))
    }
}
