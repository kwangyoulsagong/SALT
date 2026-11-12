package com.salt.identity.application

import com.salt.identity.domain.AccountNotFound
import com.salt.identity.domain.AccountStore
import com.salt.identity.domain.DeletionCounts
import com.salt.identity.domain.DeletionLog
import com.salt.identity.domain.InvalidDeletionCounts
import com.salt.identity.domain.PasswordHasher
import com.salt.identity.domain.PersonalRecords
import com.salt.identity.domain.PersonalTable
import com.salt.identity.domain.ReauthFailed
import com.salt.identity.domain.TokenIssuer
import com.salt.identity.domain.TokenSubject
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

/*
 * 내 데이터(`SRV-REQ-048` FR-3 · 4, 서버 S3c). 순서는 BFF 가 정한다 — 허가 받기 → 서비스마다 지우기 → 여기서 계정 지우기 + 기록.
 */

/** 이 서비스 몫 내보내기 — 한 스냅샷 */
open class ExportAccount(private val records: PersonalRecords) {
    @Transactional(transactionManager = IDENTITY_TX, readOnly = true)
    open fun execute(userId: String): List<PersonalTable> = records.export(userId)
}

/**
 * 지우기 허가 — 비밀번호를 **다시** 확인한다(접근 토큰만으로는 못 지운다). 틀리면 403(401 이면 화면이 세션 만료로 읽는다).
 * 횟수 제한은 api 층(사용자당 10분 5번).
 */
class IssueEraseGrant(private val accounts: AccountStore, private val hasher: PasswordHasher, private val tokens: TokenIssuer) {
    fun execute(userId: String, password: String): Pair<String, Long> {
        val account = accounts.findById(userId) ?: throw AccountNotFound()
        val credential = accounts.findCredentialByEmail(account.email)
        if (credential == null || credential.id != userId || !hasher.matches(password, credential.passwordHash)) throw ReauthFailed()
        return tokens.issueErase(TokenSubject(account.id, account.email))
    }
}

/**
 * 계정 지우기 — 마지막 단계. identity 행을 지우고 **같은 트랜잭션에** 서비스별 행 수를 남긴다(기록 없이 지워진 계정이 없게).
 * 다른 서비스 행 수는 BFF 가 받은 그대로 싣는다(이 서비스가 남의 행을 세지 않는다). 다시 불러도 안전 — 두 번째는 계정 행 0 · 기록 하나 더.
 */
open class DeleteAccount(private val records: PersonalRecords, private val log: DeletionLog, private val clock: Clock) {
    @Transactional(transactionManager = IDENTITY_TX)
    open fun execute(userId: String, otherServices: Map<String, Map<String, Int>>): Map<String, Int> {
        val others = DeletionCounts.validOrNull(otherServices - SERVICE) ?: throw InvalidDeletionCounts()
        val mine = records.erase(userId)
        log.record(others + (SERVICE to mine), clock.instant())
        return mine
    }

    private companion object {
        const val SERVICE = "identity"
    }
}
