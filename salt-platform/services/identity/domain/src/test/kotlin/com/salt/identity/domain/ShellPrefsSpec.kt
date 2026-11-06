package com.salt.identity.domain

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.Instant

/**
 * 셸 설정 S3a(`SRV-REQ-048` FR-1 · 2) 불변식 — 허용 · 거절 경계 표.
 * 1. 고를 수 있는 것은 셋 · 팁은 못 고른다 · 빈 선택 거절
 * 2. 다음 단계는 고른 것 중에서만 — 투자를 안 고르면 투자 0
 * 3. 순서 = 넷의 순열 · 숨김 ⊂ 넷 · 전부 숨김 거절
 * 4. 기본 배치는 서버가 — 안 골랐으면 숨김 0, 골랐으면 안 고른 것 숨김
 */
class ShellPrefsSpec : StringSpec({
    val at = Instant.parse("2026-11-06T00:00:00Z")

    "행 없음 = 고르기부터 · 기본 순서 · 숨김 0(기존 홈 그대로)" {
        val p = ShellPrefs.EMPTY
        p.nextStep shouldBe OnboardingStep.CHOOSE_DOMAINS
        p.firstInputDomain shouldBe null
        p.layout() shouldBe HomeLayout(listOf(ShellDomain.SAVINGS, ShellDomain.HOUSEHOLD, ShellDomain.INVEST, ShellDomain.TIPS), emptySet())
    }

    "고르기 — 허용 · 거절 경계" {
        ShellPrefs.EMPTY.choose(listOf("savings"), at).chosen shouldBe setOf(ShellDomain.SAVINGS)
        ShellPrefs.EMPTY.choose(listOf("invest", "invest"), at).chosen shouldBe setOf(ShellDomain.INVEST)
        ShellPrefs.EMPTY.choose(listOf("savings", "household", "invest"), at).chosen!!.size shouldBe 3
        shouldThrow<ShellDomainsEmpty> { ShellPrefs.EMPTY.choose(emptyList(), at) }
        shouldThrow<ShellDomainNotChoosable> { ShellPrefs.EMPTY.choose(listOf("tips"), at) }
        shouldThrow<ShellDomainNotChoosable> { ShellPrefs.EMPTY.choose(listOf("Savings"), at) }
        shouldThrow<ShellDomainNotChoosable> { ShellPrefs.EMPTY.choose(listOf("savings", "coach"), at) }
    }

    "첫 입력 도메인 = 고른 것 중 기본 순서 첫째 — 투자를 안 고르면 투자 0" {
        ShellPrefs.EMPTY.choose(listOf("invest", "household"), at).firstInputDomain shouldBe ShellDomain.HOUSEHOLD
        ShellPrefs.EMPTY.choose(listOf("invest"), at).firstInputDomain shouldBe ShellDomain.INVEST
        listOf(listOf("savings"), listOf("household"), listOf("savings", "household")).forEach { keys ->
            val p = ShellPrefs.EMPTY.choose(keys, at)
            p.nextStep shouldBe OnboardingStep.FIRST_INPUT
            (p.firstInputDomain == ShellDomain.INVEST) shouldBe false
            (ShellDomain.INVEST in p.layout().hidden) shouldBe true
        }
    }

    "끝내기 — 고르기 전 거절 · 두 번째는 처음 시각 그대로 · 다시 골라도 끝난 상태 유지" {
        shouldThrow<OnboardingNotReady> { ShellPrefs.EMPTY.finishOnboarding(at) }
        val done = ShellPrefs.EMPTY.choose(listOf("savings"), at).finishOnboarding(at)
        done.nextStep shouldBe null
        done.finishOnboarding(at.plusSeconds(60)).onboardedAt shouldBe at
        done.choose(listOf("household"), at.plusSeconds(60)).nextStep shouldBe null
    }

    "기본 숨김 = 고를 수 있었는데 안 고른 것 · 팁은 늘 보임" {
        ShellPrefs.EMPTY.choose(listOf("savings"), at).layout().hidden shouldBe setOf(ShellDomain.HOUSEHOLD, ShellDomain.INVEST)
        ShellPrefs.EMPTY.choose(listOf("savings", "household", "invest"), at).layout().hidden shouldBe emptySet()
    }

    "배치 — 허용 · 거절 경계" {
        val all = listOf("tips", "invest", "household", "savings")
        val p = ShellPrefs.EMPTY.arrange(all, listOf("invest"))
        p.layout() shouldBe HomeLayout(listOf(ShellDomain.TIPS, ShellDomain.INVEST, ShellDomain.HOUSEHOLD, ShellDomain.SAVINGS), setOf(ShellDomain.INVEST))
        // 저장한 배치는 다시 골라도 그대로
        p.choose(listOf("savings"), at).layout().hidden shouldBe setOf(ShellDomain.INVEST)
        ShellPrefs.EMPTY.arrange(all, listOf("tips", "invest", "household")).layout().hidden.size shouldBe 3
        shouldThrow<HomeLayoutInvalid> { ShellPrefs.EMPTY.arrange(all.dropLast(1), emptyList()) }
        shouldThrow<HomeLayoutInvalid> { ShellPrefs.EMPTY.arrange(all + "savings", emptyList()) }
        shouldThrow<HomeLayoutInvalid> { ShellPrefs.EMPTY.arrange(listOf("tips", "invest", "household", "household"), emptyList()) }
        shouldThrow<HomeLayoutInvalid> { ShellPrefs.EMPTY.arrange(listOf("tips", "invest", "household", "coach"), emptyList()) }
        shouldThrow<HomeLayoutInvalid> { ShellPrefs.EMPTY.arrange(all, listOf("coach")) }
        shouldThrow<HomeLayoutInvalid> { ShellPrefs.EMPTY.arrange(all, all) }
    }
})
