package com.salt.ping.api

import com.salt.ping.application.GetPing
import com.salt.ping.application.RecordPing
import com.salt.support.messaging.TraceParent
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 플랫폼 점검 경로 — 인증이 필요하다(점검이 인증을 건너뛰면 점검이 아니다). BFF 라우팅 표의 `platform` 첫 경로(`BFF-REQ-045`).
 */
@Tag(name = "platform", description = "플랫폼 종단 점검(SRV-REQ-043 FR-13)")
@RestController
@RequestMapping("/api/platform/ping")
class PingController(
    private val recordPing: RecordPing,
    private val getPing: GetPing,
    private val traceParent: TraceParent,
) {
    data class Recorded(val checkId: String, val previousCount: Long, val traceId: String?)

    data class Echo(val traceId: String?, val receivedAt: String)

    data class Check(val checkId: String, val checkedAt: String, val echo: Echo?)

    @Operation(summary = "점검 기록 하나 + 이벤트 하나", description = "DB 쓰기 · 아웃박스 → 브로커 → 구독이 같은 추적 ID 로 이어지는지 본다")
    @PostMapping
    fun record(user: AuthenticatedUser): ResponseEntity<ApiResponse<Recorded>> {
        val result = recordPing.execute(user.userId)
        return ApiResponse.created(Recorded(result.checkId.toString(), result.previousCount, traceId()))
    }

    @Operation(summary = "점검 기록과 구독 되울림", description = "echo 가 null 이면 아직 구독이 받지 못했다")
    @GetMapping("/{checkId}")
    fun get(user: AuthenticatedUser, @PathVariable checkId: String): ResponseEntity<ApiResponse<Check>> {
        val view = getPing.execute(user.userId, checkId)
        return ApiResponse.ok(
            Check(
                checkId = view.check.id.toString(),
                checkedAt = view.check.checkedAt.toString(),
                echo = view.echo?.let { Echo(it.traceId, it.receivedAt.toString()) },
            ),
        )
    }

    /** W3C traceparent `00-<traceId>-<spanId>-<flags>` 의 둘째 칸. */
    private fun traceId(): String? = traceParent.current()?.split("-")?.getOrNull(1)
}
