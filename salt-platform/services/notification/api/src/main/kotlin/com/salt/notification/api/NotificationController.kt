package com.salt.notification.api

import com.salt.notification.application.NotificationSettings
import com.salt.notification.application.ReadNotifications
import com.salt.notification.domain.NotificationPrefValueInvalid
import com.salt.notification.domain.NotificationPrefs
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotNull
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.temporal.ChronoUnit

/**
 * 알림 HTTP(`SRV-REQ-048` FR-5, 서버 S2c). 목록 칸은 옛 Express `/api/investment-notifications` 와 같다 —
 * `{ page, size, total, items: [{ id, kind, symbol, messageCode, params, isRead, createdAt }] }`. 문장 · 금액 0.
 * 만드는 HTTP 경로는 없다 — 알림은 이벤트 구독으로만 생긴다.
 */
@Tag(name = "notification", description = "알림 · 도메인별 설정(SRV-REQ-048)")
@RestController
@RequestMapping("/api/notifications")
class NotificationController(private val read: ReadNotifications, private val settings: NotificationSettings) {
    data class Item(
        val id: String,
        val kind: String,
        val symbol: String?,
        val messageCode: String,
        val params: Map<String, String>,
        val isRead: Boolean,
        val createdAt: String,
    )

    data class Page(val page: Int, val size: Int, val total: Int, val items: List<Item>)

    data class Unread(val unreadCount: Int)

    data class DomainPref(val domain: String, val enabled: Boolean)

    /** 순서 = 서버가 정한 순서. 화면은 이 순서로 그린다 */
    data class Prefs(val domains: List<DomainPref>)

    /** `enabled` 는 JSON 참/거짓만 — `Boolean` 으로 받으면 Jackson 이 `1` · `"true"` 를 참으로 바꿔 읽는다(2026-11-06 확인 2회차) */
    data class PrefChange(@field:NotNull val enabled: Any?)

    @Operation(summary = "알림 목록 — 켠 도메인만 · 최신순(size 기본 20 · 상한 50)")
    @GetMapping
    fun list(user: AuthenticatedUser, @RequestParam(required = false) page: Int?, @RequestParam(required = false) size: Int?): ResponseEntity<ApiResponse<Page>> {
        val p = read.list(user.userId, page, size)
        return ApiResponse.ok(
            Page(p.page, p.size, p.total, p.items.map { Item(it.id, it.kind.key, it.symbol, it.messageCode, it.params, it.isRead, it.createdAt.truncatedTo(ChronoUnit.MILLIS).toString()) }),
        )
    }

    @Operation(summary = "안 읽은 수 — 목록에 보이는 것과 같은 범위")
    @GetMapping("/unread-count")
    fun unread(user: AuthenticatedUser): ResponseEntity<ApiResponse<Unread>> = ApiResponse.ok(Unread(read.unreadCount(user.userId)))

    @Operation(summary = "읽음(본인 · 켠 도메인만)")
    @PatchMapping("/{id}/read")
    fun markRead(user: AuthenticatedUser, @PathVariable id: String): ResponseEntity<ApiResponse<Boolean>> {
        read.markRead(user.userId, id)
        return ApiResponse.ok(true)
    }

    @Operation(summary = "모두 읽음(켠 도메인만)")
    @PatchMapping("/read-all")
    fun markAllRead(user: AuthenticatedUser): ResponseEntity<ApiResponse<Boolean>> {
        read.markAllRead(user.userId)
        return ApiResponse.ok(true)
    }

    @Operation(summary = "도메인별 알림 설정 — 기본 꺼짐")
    @GetMapping("/prefs")
    fun prefs(user: AuthenticatedUser): ResponseEntity<ApiResponse<Prefs>> = ApiResponse.ok(prefs(settings.get(user.userId)))

    @Operation(summary = "도메인 하나 켬/끔 — 없는 도메인은 400")
    @PutMapping("/prefs/{domain}")
    fun setPref(user: AuthenticatedUser, @PathVariable domain: String, @Valid @RequestBody body: PrefChange): ResponseEntity<ApiResponse<Prefs>> =
        ApiResponse.ok(prefs(settings.set(user.userId, domain, body.enabled as? Boolean ?: throw NotificationPrefValueInvalid())))

    private fun prefs(p: NotificationPrefs) = Prefs(p.all().map { (d, on) -> DomainPref(d.key, on) })
}
