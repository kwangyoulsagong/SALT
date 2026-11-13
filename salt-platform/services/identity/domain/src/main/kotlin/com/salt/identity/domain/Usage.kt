package com.salt.identity.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import java.time.LocalDate

/**
 * 도메인 사용 계측(`SRV-REQ-048` FR-7, 서버 S3d) — 무엇을 셀 수 있는지는 서버가 정한다.
 * 도메인 = 셸 카드 넷([ShellDomain]) · 종류 = 화면을 연 것 · 홈 카드를 누른 것. 금액 · 화면 내용은 받을 칸이 없다.
 */
enum class UsageKind(val key: String) {
    VISIT("visit"),
    CARD_CLICK("card_click"),
    ;

    companion object {
        fun parse(key: String): UsageKind? = entries.firstOrNull { it.key == key }
    }
}

data class UsageMark(val domain: ShellDomain, val kind: UsageKind) {
    companion object {
        fun of(domain: String, kind: String): UsageMark =
            UsageMark(ShellDomain.parse(domain) ?: throw UsageInvalid("domain"), UsageKind.parse(kind) ?: throw UsageInvalid("kind"))
    }
}

/** 하루 한 행에 횟수 더하기 — 한 문장(경합에도 행 하나) */
interface UsageStore {
    fun count(userId: String, day: LocalDate, mark: UsageMark)
}

class UsageInvalid(field: String) :
    DomainError("IDENTITY_USAGE_INVALID", ErrorKind.INVALID, "Unknown usage $field")
