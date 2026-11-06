package com.salt.identity.api

import com.salt.identity.application.ArrangeHome
import com.salt.identity.application.ChooseDomains
import com.salt.identity.application.FinishOnboarding
import com.salt.identity.application.ReadShellPrefs
import com.salt.identity.domain.HomeLayoutInvalid
import com.salt.identity.domain.ShellDomain
import com.salt.identity.domain.ShellDomainNotChoosable
import com.salt.identity.domain.ShellPrefs
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotNull
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 셸 설정 HTTP(`SRV-REQ-048` FR-1 · 2, 서버 S3a) — 고른 도메인 · 온보딩 단계 · 홈 카드 순서 · 숨김. 금액 0.
 * 화면 경로(href)는 모른다 — 도메인 키만 준다. 경로는 BFF · 화면의 zone 레지스트리 몫.
 */
@Tag(name = "identity", description = "셸 설정 — 도메인 선택 온보딩 · 홈 카드 배치(SRV-REQ-048)")
@RestController
@RequestMapping("/api/identity/shell")
class ShellController(
    private val read: ReadShellPrefs,
    private val choose: ChooseDomains,
    private val finish: FinishOnboarding,
    private val arrange: ArrangeHome,
) {
    data class Onboarding(
        /** `choose_domains` · `first_input` · null(끝) */
        val nextStep: String?,
        val complete: Boolean,
        /** 첫 입력을 할 도메인 — 고른 것 중 기본 순서 첫째. 고르기 전이면 null */
        val firstInputDomain: String?,
    )

    data class Layout(val order: List<String>, val hidden: List<String>, val saved: Boolean)

    data class Shell(
        /** 고른 도메인(기본 순서). 안 골랐으면 null */
        val chosenDomains: List<String>?,
        /** 고를 수 있는 도메인 — 화면은 이 순서로 보여 준다 */
        val choosableDomains: List<String>,
        val onboarding: Onboarding,
        val layout: Layout,
    )

    /** 목록 칸은 JSON 배열의 문자열만 — `List<String>` 으로 받으면 Jackson 이 숫자를 글자로 바꿔 읽는다(알림 `enabled` 와 같은 이유) */
    data class DomainsBody(@field:NotNull val domains: List<Any?>?)

    data class LayoutBody(@field:NotNull val order: List<Any?>?, @field:NotNull val hidden: List<Any?>?)

    @Operation(summary = "셸 설정 — 고른 도메인 · 온보딩 단계 · 홈 배치(저장 전이면 서버 기본값)")
    @GetMapping
    fun get(user: AuthenticatedUser): ResponseEntity<ApiResponse<Shell>> = ApiResponse.ok(view(read.execute(user.userId)))

    @Operation(summary = "온보딩 1 — 도메인 고르기(모으기 · 쓰는 돈 · 투자 중 하나 이상). 다시 골라도 된다")
    @PutMapping("/domains")
    fun chooseDomains(user: AuthenticatedUser, @Valid @RequestBody body: DomainsBody): ResponseEntity<ApiResponse<Shell>> =
        ApiResponse.ok(view(choose.execute(user.userId, strings(body.domains) { ShellDomainNotChoosable(it) })))

    @Operation(summary = "온보딩 끝 — 첫 입력으로 넘어갈 때 · 나중에 하기. 고르기 전이면 409")
    @PostMapping("/onboarding/finish")
    fun finishOnboarding(user: AuthenticatedUser): ResponseEntity<ApiResponse<Shell>> = ApiResponse.ok(view(finish.execute(user.userId)))

    @Operation(summary = "홈 카드 순서 · 숨김 — 순서는 카드 넷 전부 한 번씩, 하나는 보여야 한다")
    @PutMapping("/layout")
    fun arrangeHome(user: AuthenticatedUser, @Valid @RequestBody body: LayoutBody): ResponseEntity<ApiResponse<Shell>> {
        val invalid = { v: String -> HomeLayoutInvalid("not a card key $v") }
        return ApiResponse.ok(view(arrange.execute(user.userId, strings(body.order, invalid), strings(body.hidden, invalid))))
    }

    private fun strings(values: List<Any?>?, error: (String) -> RuntimeException): List<String> =
        values.orEmpty().map { it as? String ?: throw error(it.toString()) }

    private fun view(p: ShellPrefs): Shell {
        val layout = p.layout()
        return Shell(
            chosenDomains = p.chosen?.let { set -> ShellDomain.DEFAULT_ORDER.filter { it in set }.map { it.key } },
            choosableDomains = ShellDomain.CHOOSABLE.map { it.key },
            onboarding = Onboarding(p.nextStep?.key, p.nextStep == null, p.firstInputDomain?.key),
            layout = Layout(layout.order.map { it.key }, ShellDomain.DEFAULT_ORDER.filter { it in layout.hidden }.map { it.key }, p.savedLayout != null),
        )
    }
}
