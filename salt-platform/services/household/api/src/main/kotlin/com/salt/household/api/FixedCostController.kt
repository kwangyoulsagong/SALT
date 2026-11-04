package com.salt.household.api

import com.salt.household.application.HideFixedCost
import com.salt.household.application.ShowFixedCost
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 고정비 찾기(`SRV-REQ-046` FR-12, 가계부 S1e). 후보 목록은 월 화면(`GET /month/:ym` `fixedCosts`)이 준다 — 여기는 "아니에요" 숨기기 · 되돌리기만.
 * 가맹점 키는 경로가 아니라 본문으로 받는다 — 한글 · 기호가 경로 조각을 깨지 않게(빈 조각은 플랫폼이 401, S1d 함정)
 */
@Tag(name = "household", description = "가계부 — 고정비 찾기(SRV-REQ-046 FR-12)")
@RestController
@RequestMapping("/api/household/fixed-costs")
class FixedCostController(private val hideFixedCost: HideFixedCost, private val showFixedCost: ShowFixedCost) {
    data class KeyRequest(@field:NotBlank @field:Size(max = 40) val key: String?)

    @Operation(summary = "고정비 아니에요", description = "그 가맹점을 후보 · 고정비 증가 발행에서 뺀다. 키는 월 화면 fixedCosts[].key 그대로. 다시 눌러도 같다")
    @PostMapping("/hide")
    fun hide(user: AuthenticatedUser, @Valid @RequestBody body: KeyRequest): ResponseEntity<ApiResponse<Map<String, String>>> =
        ApiResponse.ok(mapOf("key" to hideFixedCost.execute(user.userId, body.key!!)))

    @Operation(summary = "숨긴 고정비 되돌리기", description = "없던 키여도 성공")
    @PostMapping("/show")
    fun show(user: AuthenticatedUser, @Valid @RequestBody body: KeyRequest): ResponseEntity<ApiResponse<Map<String, String>>> =
        ApiResponse.ok(mapOf("key" to showFixedCost.execute(user.userId, body.key!!)))
}
