package com.salt.identity.application

import com.salt.identity.domain.ShellPrefs
import com.salt.identity.domain.ShellPrefsStore
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

/** identity 서비스의 트랜잭션 매니저 이름(`ServiceDatabase` — 서비스마다 따로). */
const val IDENTITY_TX = "identityTx"

/** 셸 설정 읽기(`SRV-REQ-048` FR-1 · 2). 행이 없으면 [ShellPrefs.EMPTY] */
open class ReadShellPrefs(private val store: ShellPrefsStore) {
    @Transactional(transactionManager = IDENTITY_TX, readOnly = true)
    open fun execute(userId: String): ShellPrefs = store.of(userId)
}

/** 온보딩 1단계 — 도메인 고르기(FR-1). 규칙은 [ShellPrefs.choose] */
open class ChooseDomains(private val store: ShellPrefsStore, private val clock: Clock) {
    @Transactional(transactionManager = IDENTITY_TX)
    open fun execute(userId: String, domains: Collection<String>): ShellPrefs {
        val now = clock.instant()
        return store.of(userId).choose(domains, now).also { store.save(userId, it, now) }
    }
}

/** 온보딩 끝 — 첫 입력으로 넘어갈 때(또는 나중에 하기). 규칙은 [ShellPrefs.finishOnboarding] */
open class FinishOnboarding(private val store: ShellPrefsStore, private val clock: Clock) {
    @Transactional(transactionManager = IDENTITY_TX)
    open fun execute(userId: String): ShellPrefs {
        val now = clock.instant()
        return store.of(userId).finishOnboarding(now).also { store.save(userId, it, now) }
    }
}

/** 홈 카드 순서 · 숨김 저장(FR-2). 규칙은 [ShellPrefs.arrange] */
open class ArrangeHome(private val store: ShellPrefsStore, private val clock: Clock) {
    @Transactional(transactionManager = IDENTITY_TX)
    open fun execute(userId: String, order: List<String>, hidden: Collection<String>): ShellPrefs =
        store.of(userId).arrange(order, hidden).also { store.save(userId, it, clock.instant()) }
}
