package com.salt.identity.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import java.time.Instant

/**
 * 셸 설정 — 고른 도메인 · 온보딩 · 홈 카드 순서 · 숨김(`SRV-REQ-048` FR-1 · 2 · `DB-REQ-040` FR-2, 서버 S3a).
 *
 * 불변식
 * 1. **고를 수 있는 도메인은 셋**(모으기 · 쓰는 돈 · 투자). 금융 팁은 고르지 않는다 — 누구에게나 열린 공개 글이다
 * 2. **투자를 고르지 않으면 투자는 온보딩 다음 단계가 아니다**(FEATURE-015 FR-1 "투자 질문 0") — 다음 단계는 고른 것 중에서만
 * 3. 홈 순서는 카드 넷의 순열 하나. 숨김은 그 부분집합이고 **전부 숨길 수 없다**(빈 홈)
 * 4. 순서 · 숨김을 저장한 적이 없으면 기본값을 **서버가** 정한다 — 기본 순서 저축 → 가계부 → 투자 → 팁,
 *    기본 숨김 = 고를 수 있었는데 고르지 않은 도메인(`BFF-REQ-046` FR-4 "투자 미선택이면 숨김"을 도메인 셋으로 넓힘). 아직 안 골랐으면 숨김 0(지금까지의 홈 그대로)
 */
enum class ShellDomain(val key: String, val choosable: Boolean) {
    SAVINGS("savings", true),
    HOUSEHOLD("household", true),
    INVEST("invest", true),
    TIPS("tips", false),
    ;

    companion object {
        /** 기본 홈 순서 = enum 순서 */
        val DEFAULT_ORDER: List<ShellDomain> = entries.toList()

        val CHOOSABLE: List<ShellDomain> = entries.filter { it.choosable }

        fun parse(key: String): ShellDomain? = entries.firstOrNull { it.key == key }
    }
}

/** 온보딩 단계 — 끝났으면 없음 */
enum class OnboardingStep(val key: String) {
    CHOOSE_DOMAINS("choose_domains"),
    FIRST_INPUT("first_input"),
}

data class HomeLayout(val order: List<ShellDomain>, val hidden: Set<ShellDomain>)

/**
 * 한 사용자의 셸 설정. 행이 없으면 [EMPTY] — 아직 안 골랐다(기존 사용자 포함).
 * 바꾸는 길은 [choose] · [finishOnboarding] · [arrange] 셋뿐이고, 각각 새 값을 돌려준다.
 */
data class ShellPrefs(
    val chosen: Set<ShellDomain>?,
    val chosenAt: Instant?,
    val onboardedAt: Instant?,
    /** 사용자가 저장한 홈 배치. 저장한 적 없으면 null — [layout] 이 기본값을 만든다 */
    val savedLayout: HomeLayout?,
) {
    /** 지금 할 온보딩 단계. 끝났으면 null */
    val nextStep: OnboardingStep?
        get() = when {
            chosen == null -> OnboardingStep.CHOOSE_DOMAINS
            onboardedAt == null -> OnboardingStep.FIRST_INPUT
            else -> null
        }

    /** 첫 입력을 할 도메인 — 고른 것 중 기본 순서로 첫째. 고르기 전이면 null(불변식 2) */
    val firstInputDomain: ShellDomain?
        get() = chosen?.let { set -> ShellDomain.DEFAULT_ORDER.first { it in set } }

    fun layout(): HomeLayout =
        savedLayout ?: HomeLayout(
            ShellDomain.DEFAULT_ORDER,
            chosen?.let { set -> ShellDomain.CHOOSABLE.filterNot { it in set }.toSet() } ?: emptySet(),
        )

    /** 도메인 고르기. 다시 골라도 된다 — 온보딩을 끝낸 뒤 고치면 끝난 상태는 그대로 */
    fun choose(keys: Collection<String>, at: Instant): ShellPrefs {
        val domains = keys.map { key -> ShellDomain.parse(key)?.takeIf { it.choosable } ?: throw ShellDomainNotChoosable(key) }.toSet()
        if (domains.isEmpty()) throw ShellDomainsEmpty()
        return copy(chosen = domains, chosenAt = at)
    }

    /** 첫 입력으로 넘어가며(또는 나중에 하기) 온보딩을 끝낸다. 고르기 전엔 못 끝낸다 · 두 번 불러도 처음 시각 그대로 */
    fun finishOnboarding(at: Instant): ShellPrefs {
        if (chosen == null) throw OnboardingNotReady()
        return if (onboardedAt != null) this else copy(onboardedAt = at)
    }

    /** 홈 배치 저장 — 순서는 카드 넷의 순열, 숨김은 그 부분집합 · 하나는 보여야 한다(불변식 3) */
    fun arrange(orderKeys: List<String>, hiddenKeys: Collection<String>): ShellPrefs {
        val order = orderKeys.map { ShellDomain.parse(it) ?: throw HomeLayoutInvalid("unknown card $it") }
        if (order.size != ShellDomain.entries.size || order.toSet().size != order.size) throw HomeLayoutInvalid("order must list every card once")
        val hidden = hiddenKeys.map { ShellDomain.parse(it) ?: throw HomeLayoutInvalid("unknown card $it") }.toSet()
        if (hidden.size == ShellDomain.entries.size) throw HomeLayoutInvalid("at least one card must stay visible")
        return copy(savedLayout = HomeLayout(order, hidden))
    }

    companion object {
        val EMPTY = ShellPrefs(null, null, null, null)
    }
}

class ShellDomainNotChoosable(key: String) :
    DomainError("IDENTITY_DOMAIN_NOT_CHOOSABLE", ErrorKind.INVALID, "Not a choosable domain: $key")

class ShellDomainsEmpty :
    DomainError("IDENTITY_DOMAINS_EMPTY", ErrorKind.INVALID, "Choose at least one domain")

class OnboardingNotReady :
    DomainError("IDENTITY_ONBOARDING_NOT_READY", ErrorKind.CONFLICT, "Choose domains before finishing onboarding")

class HomeLayoutInvalid(reason: String) :
    DomainError("IDENTITY_HOME_LAYOUT_INVALID", ErrorKind.INVALID, "Invalid home layout: $reason")
