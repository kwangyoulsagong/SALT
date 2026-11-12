package com.salt.identity.domain

/** 셸 설정 저장(`identity.user_domain_pref`). 행 없음 = [ShellPrefs.EMPTY]. 저장은 사용자 하나에 한 행 — 한 문장 upsert */
interface ShellPrefsStore {
    fun of(userId: String): ShellPrefs

    fun save(userId: String, prefs: ShellPrefs, at: java.time.Instant)
}

/** 초대 코드 — 조회 · 점유(`SRV-REQ-048` FR-8, 옛 Express `InviteCodeStore`) */
interface InviteCodeStore {
    fun findByCode(code: String): InviteCode?

    /**
     * 코드를 점유하면서 **그 코드로 계정을 만든다**. 이미 주인이 있으면 null.
     * 둘이 나뉘면 사이에 "코드 없이 생긴 계정"이 남을 자리가 생긴다 — 원자성(같은 트랜잭션 · 조건부 UPDATE)이 이 계약 자체다.
     * 같은 트랜잭션에 `identity.UserRegistered` 아웃박스 행 — 롤백이면 이벤트 0
     */
    fun redeem(codeId: String, account: NewAccount, at: java.time.Instant): AccountView?
}

/** 계정 조회 · 갱신. **생성이 없다** — 계정은 [InviteCodeStore.redeem] 으로만 생긴다 */
interface AccountStore {
    fun existsByEmail(email: String): Boolean

    fun findCredentialByEmail(email: String): AccountCredential?

    fun findById(userId: String): AccountView?

    /** 활성 계정 수(상한 판정) — 세는 법이 바뀌어도(탈퇴 제외 등) 도메인은 그대로 */
    fun countActive(): Long

    fun touchLastLogin(userId: String, at: java.time.Instant)

    /** 없는 사용자면 null */
    fun updateProfile(userId: String, change: ProfileChange, at: java.time.Instant): AccountView?
}

/** 비밀번호 해시. 알고리즘은 infrastructure 의 판단 */
interface PasswordHasher {
    fun hash(plain: String): String

    fun matches(plain: String, hash: String): Boolean
}

/** 토큰 발급 · 갱신 토큰 읽기. 서명 · 수명은 infrastructure */
interface TokenIssuer {
    fun issue(subject: TokenSubject): SessionTokens

    fun issueAccess(subject: TokenSubject): String

    /** 유효하지 않으면 null — 만료는 정상 경로라 예외로 흐름을 만들지 않는다 */
    fun readRefresh(token: String): TokenSubject?

    /** 게스트 토큰(사람 정보 0) · 수명(초) */
    fun issueGuest(): Pair<String, Long>

    /** 계정 삭제 허가(`aud` salt-erase) · 수명(초) — 비밀번호를 다시 확인한 뒤에만 부른다(서버 S3c) */
    fun issueErase(subject: TokenSubject): Pair<String, Long>
}

/** 실패한 코드 시도 기록 — **실패해도 요청을 막지 않는다**(감사 로그가 가용성을 좌우하지 않게, 구현이 삼킨다) */
interface InviteAttemptLog {
    fun record(code: String, reason: InviteRejection, clientKey: String?)
}
