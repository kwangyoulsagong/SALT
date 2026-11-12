package com.salt.identity.domain

import java.time.Instant

/** 코드가 쓰일 수 없는 이유. 확인(check)과 수락(accept)이 같은 값을 쓴다 */
enum class InviteRejection(val key: String) {
    NOT_FOUND("not_found"),
    USED("used"),
    EXPIRED("expired"),
    QUOTA("quota"),
}

/**
 * 초대 코드 — identity 의 Aggregate(`SRV-REQ-048` FR-8, 서버 S3b — 옛 Express `auth/domain/InviteCode.ts`).
 *
 * 불변식: **한 코드는 한 번만 쓰이고, 만료 뒤에는 쓰이지 않는다.** 판정이 코드 자신의 상태만으로 끝난다.
 * 계정 상한은 코드 밖의 사실이라 여기 들어오지 않는다 — [InviteAcceptance] 가 둘을 합친다.
 */
class InviteCode(val id: String, val code: String, private val expiresAt: Instant, private val usedByUserId: String?) {
    /** 코드 **자신의** 상태로 판정. 통과면 null. 상한(quota)은 여기서 나오지 않는다 */
    fun rejectionAt(now: Instant): InviteRejection? = when {
        usedByUserId != null -> InviteRejection.USED
        !expiresAt.isAfter(now) -> InviteRejection.EXPIRED
        else -> null
    }

    companion object {
        /**
         * 코드 정규화 — 붙여넣기에 공백 · 줄바꿈 · 소문자가 섞인다. 최종 판정은 이 값 하나로(화면도 보여 주려고 같은 것을 한다)
         */
        fun normalize(raw: String): String = raw.replace(Regex("\\s+"), "").uppercase()
    }
}

/**
 * 초대 수락 판정 — **코드 상태와 계정 상한을 합치는 유일한 자리**.
 *
 * **코드 판정이 먼저다.** 상한을 먼저 보면 정원이 찼을 때 틀린 코드도 quota 로 답해 — 확인 경로가 상한을 드러내지 않는다는
 * 요구(`SRV-REQ-009` FR-4)를 우회로 깬다(아무 코드나 넣어 정원 상태를 읽는다).
 */
object InviteAcceptance {
    fun judge(invite: InviteCode?, now: Instant, activeUserCount: Long, maxAccounts: Int): InviteRejection? {
        if (invite == null) return InviteRejection.NOT_FOUND
        invite.rejectionAt(now)?.let { return it }
        if (activeUserCount >= maxAccounts) return InviteRejection.QUOTA
        return null
    }

    /** 확인 경로가 내보내도 되는 이유만 — quota 는 코드와 무관한 서비스 상태라 지운다 */
    fun publicRejectionOf(rejection: InviteRejection?): InviteRejection? = rejection?.takeIf { it != InviteRejection.QUOTA }
}
