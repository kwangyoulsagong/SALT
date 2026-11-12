package com.salt.identity.domain

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.Instant

/**
 * 초대 수락 판정(`SRV-REQ-048` FR-8, 서버 S3b) — 옛 Express `inviteAcceptance.test.ts` 의 여덟 경계를 그대로 옮겼다.
 * 1. 코드 판정이 상한보다 먼저 — 정원이 찼어도 틀린 코드는 코드 사유
 * 2. 만료 정각은 만료
 * 3. 확인 경로는 quota 를 내보내지 않는다
 */
class InviteAcceptanceSpec : StringSpec({
    val now = Instant.parse("2026-11-12T00:00:00Z")
    fun code(expiresAt: Instant = now.plusSeconds(3600), usedBy: String? = null) = InviteCode("c1", "ABCD2345", expiresAt, usedBy)

    "멀쩡한 코드 + 자리 있음 → 통과" {
        InviteAcceptance.judge(code(), now, activeUserCount = 3, maxAccounts = 10) shouldBe null
    }

    "없는 코드 · 사용된 코드 · 만료된 코드를 구분한다" {
        InviteAcceptance.judge(null, now, 0, 10) shouldBe InviteRejection.NOT_FOUND
        InviteAcceptance.judge(code(usedBy = "u1"), now, 0, 10) shouldBe InviteRejection.USED
        InviteAcceptance.judge(code(expiresAt = now.minusSeconds(1)), now, 0, 10) shouldBe InviteRejection.EXPIRED
    }

    "만료 시각 정각은 만료다 · 1초 전은 통과" {
        InviteAcceptance.judge(code(expiresAt = now), now, 0, 10) shouldBe InviteRejection.EXPIRED
        InviteAcceptance.judge(code(expiresAt = now.plusSeconds(1)), now, 0, 10) shouldBe null
    }

    "자리가 차면 quota 다 — 상한 정각도" {
        InviteAcceptance.judge(code(), now, activeUserCount = 10, maxAccounts = 10) shouldBe InviteRejection.QUOTA
        InviteAcceptance.judge(code(), now, activeUserCount = 9, maxAccounts = 10) shouldBe null
    }

    "정원이 찼어도 잘못된 코드는 코드 사유로 답한다" {
        InviteAcceptance.judge(null, now, 10, 10) shouldBe InviteRejection.NOT_FOUND
        InviteAcceptance.judge(code(usedBy = "u1"), now, 10, 10) shouldBe InviteRejection.USED
        InviteAcceptance.judge(code(expiresAt = now), now, 10, 10) shouldBe InviteRejection.EXPIRED
    }

    "quota 를 지운다 — 무인증 경로가 정원 상태를 드러내지 않는다" {
        InviteAcceptance.publicRejectionOf(InviteRejection.QUOTA) shouldBe null
        InviteAcceptance.publicRejectionOf(null) shouldBe null
    }

    "나머지 셋은 그대로 내보낸다" {
        listOf(InviteRejection.NOT_FOUND, InviteRejection.USED, InviteRejection.EXPIRED).forEach {
            InviteAcceptance.publicRejectionOf(it) shouldBe it
        }
    }

    "붙여넣기에 섞이는 공백 · 줄바꿈 · 소문자를 같은 값으로 만든다" {
        InviteCode.normalize(" abcd 2345\n") shouldBe "ABCD2345"
        InviteCode.normalize("\tAbCd\r\n2345 ") shouldBe "ABCD2345"
        InviteCode.normalize("   ") shouldBe ""
    }
})
