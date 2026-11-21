package com.salt.notification.api

import com.salt.notification.application.ManagePushSubscription
import com.salt.notification.application.PushConfig
import com.salt.notification.application.SendPendingPushes
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import net.javacrumbs.shedlock.core.LockConfiguration
import net.javacrumbs.shedlock.core.LockingTaskExecutor
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Clock
import java.time.Duration

/**
 * 웹 푸시 HTTP(`SRV-REQ-062` FR-1 · FR-4). 구독 모양은 브라우저 `PushSubscription.toJSON()` 그대로 — `{ endpoint, keys: { p256dh, auth } }`.
 * 도메인별 켬/끔은 기존 `/api/notifications/prefs`(사람 하나에 한 벌) — 구독은 기기 하나에 한 행.
 */
@Tag(name = "notification", description = "알림 · 도메인별 설정(SRV-REQ-048) · 웹 푸시(SRV-REQ-062)")
@RestController
@RequestMapping("/api/notifications/push")
class PushController(private val config: PushConfig, private val subscriptions: ManagePushSubscription) {
    data class Config(val enabled: Boolean, val publicKey: String?)

    data class Keys(@field:NotBlank @field:Size(max = 128) val p256dh: String?, @field:NotBlank @field:Size(max = 64) val auth: String?)

    data class Subscription(@field:NotBlank @field:Size(max = 1024) val endpoint: String?, @field:NotNull @field:Valid val keys: Keys?)

    data class Removal(@field:NotBlank @field:Size(max = 1024) val endpoint: String?)

    @Operation(summary = "푸시 설정 — 켜졌나 · 서버 공개키(VAPID, base64url). 꺼져 있으면 publicKey null")
    @GetMapping("/config")
    fun config(user: AuthenticatedUser): ResponseEntity<ApiResponse<Config>> = ApiResponse.ok(Config(config.enabled, config.publicKey))

    @Operation(summary = "이 기기 구독 넣기 · 대조(다시 불러도 행 하나) — 알려진 푸시 서비스 주소만, 꺼져 있으면 503")
    @PutMapping("/subscription")
    fun save(user: AuthenticatedUser, @Valid @RequestBody body: Subscription): ResponseEntity<ApiResponse<Boolean>> {
        subscriptions.save(user.userId, body.endpoint!!, body.keys!!.p256dh!!, body.keys.auth!!)
        return ApiResponse.ok(true)
    }

    @Operation(summary = "이 기기 구독 빼기(본인 것만 · 없어도 성공)")
    @DeleteMapping("/subscription")
    fun remove(user: AuthenticatedUser, @Valid @RequestBody body: Removal): ResponseEntity<ApiResponse<Boolean>> {
        subscriptions.remove(user.userId, body.endpoint!!)
        return ApiResponse.ok(true)
    }
}

/**
 * 보내기 회차(`SRV-REQ-062` FR-2) — 앞 회차가 끝나고 10초 뒤 · 락은 notification `shedlock`(인스턴스 하나만). 유스케이스 한 번 호출만.
 * 로그엔 건수만(사람 · 주소 0).
 */
class PushWorker(private val send: SendPendingPushes, private val lock: LockingTaskExecutor, private val clock: Clock) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelayString = "\${salt.notification.push.interval:10s}", initialDelayString = "\${salt.notification.push.interval:10s}")
    fun run() {
        lock.executeWithLock(
            Runnable {
                val r = send.execute()
                if (r.notifications > 0 || r.skipped > 0) {
                    log.info("Push run notifications={} delivered={} gone={} failed={} skipped={}", r.notifications, r.delivered, r.gone, r.failed, r.skipped)
                }
            },
            LockConfiguration(clock.instant(), "notification-push", Duration.ofMinutes(5), Duration.ZERO),
        )
    }
}
