package com.salt.identity

import com.salt.app.SaltDbProperties
import com.salt.identity.application.ArrangeHome
import com.salt.identity.application.ChooseDomains
import com.salt.identity.application.FinishOnboarding
import com.salt.identity.application.IDENTITY_TX
import com.salt.identity.application.ReadShellPrefs
import com.salt.identity.infrastructure.JooqShellPrefs
import com.salt.support.persistence.ServiceDatabase
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import java.time.Clock

/**
 * identity 서비스 조립(`SRV-REQ-048` FR-1 · 2, 서버 S3a) — 이 파일만 네 층을 다 안다(`kotlin-platform.md` §2). 본뜬 곳 `NotificationComposition`.
 * S3a 는 셸 설정(도메인 선택 · 홈 배치)만 — 사용자 · 초대 코드 · 토큰 발급은 S3b 까지 Express `auth`. 발행 이벤트 0.
 */
@Configuration(proxyBeanMethods = false)
class IdentityComposition {
    @Bean(destroyMethod = "close")
    fun identityDatabase(db: SaltDbProperties): ServiceDatabase = ServiceDatabase.open(SCHEMA, db.connection(SCHEMA))

    @Bean(IDENTITY_TX)
    fun identityTx(@Qualifier("identityDatabase") database: ServiceDatabase): PlatformTransactionManager = database.transactionManager

    @Bean
    fun identityShellPrefsStore(@Qualifier("identityDatabase") database: ServiceDatabase): JooqShellPrefs = JooqShellPrefs(database.dsl)

    @Bean
    fun identityReadShell(store: JooqShellPrefs): ReadShellPrefs = ReadShellPrefs(store)

    @Bean
    fun identityChooseDomains(store: JooqShellPrefs, clock: Clock): ChooseDomains = ChooseDomains(store, clock)

    @Bean
    fun identityFinishOnboarding(store: JooqShellPrefs, clock: Clock): FinishOnboarding = FinishOnboarding(store, clock)

    @Bean
    fun identityArrangeHome(store: JooqShellPrefs, clock: Clock): ArrangeHome = ArrangeHome(store, clock)

    companion object {
        const val SCHEMA = "identity"
    }
}
