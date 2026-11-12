package com.salt.identity.api

import com.salt.identity.application.GetProfile
import com.salt.identity.application.UpdateProfile
import com.salt.identity.domain.ProfileChange
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 프로필(`SRV-REQ-048` FR-8 — 옛 Express `modules/user` 의 살아 있던 두 경로). 포인트 · 업적 · 대시보드는 동면(BFF 410)이라 옮기지 않는다.
 * 옛 PATCH 는 `profileImageUrl: null` 로 사진을 지울 수 있었다 — 소비처 0(화면 · BFF 호출 0, 2026-11-12 grep)이라 null 은 "그대로"로 읽는다.
 */
@Tag(name = "users", description = "프로필 — 별명 · 사진 주소(SRV-REQ-048)")
@RestController
@RequestMapping("/api/users/profile")
class ProfileController(private val get: GetProfile, private val update: UpdateProfile) {
    data class ProfileBody(
        @field:Size(min = 2, message = "Nickname must be at least 2 characters")
        @field:Size(max = 50, message = "Too big: expected string to have <=50 characters")
        val nickname: String?,
        @field:Pattern(regexp = "^https?://\\S+$", message = "Invalid URL") val profileImageUrl: String?,
    )

    @Operation(summary = "프로필 조회")
    @GetMapping
    fun profile(user: AuthenticatedUser): ResponseEntity<ApiResponse<AccountBody>> = ApiResponse.ok(get.execute(user.userId).body())

    @Operation(summary = "프로필 수정 — 별명 · 사진 주소. 안 보낸 칸은 그대로")
    @PatchMapping
    fun updateProfile(user: AuthenticatedUser, @Valid @RequestBody body: ProfileBody): ResponseEntity<ApiResponse<AccountBody>> =
        ApiResponse.ok(update.execute(user.userId, ProfileChange(body.nickname, body.profileImageUrl)).body(), "Profile updated successfully")
}
