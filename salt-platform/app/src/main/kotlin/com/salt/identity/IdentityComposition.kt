package com.salt.identity

import com.salt.app.SaltDbProperties
import com.salt.identity.api.AuthController
import com.salt.identity.api.FixedWindowLimit
import com.salt.identity.application.AcceptInviteCode
import com.salt.identity.application.ArrangeHome
import com.salt.identity.application.CheckInviteCode
import com.salt.identity.application.ChooseDomains
import com.salt.identity.application.FinishOnboarding
import com.salt.identity.application.GetAccount
import com.salt.identity.application.GetProfile
import com.salt.identity.application.IDENTITY_TX
import com.salt.identity.application.IssueGuestToken
import com.salt.identity.application.Login
import com.salt.identity.application.ReadShellPrefs
import com.salt.identity.application.RedeemInvite
import com.salt.identity.application.RefreshSession
import com.salt.identity.application.UpdateProfile
import com.salt.identity.infrastructure.BcryptPasswordHasher
import com.salt.identity.infrastructure.IdentityEvents
import com.salt.identity.infrastructure.JooqAccounts
import com.salt.identity.infrastructure.JooqInviteAttempts
import com.salt.identity.infrastructure.JooqInviteCodes
import com.salt.identity.infrastructure.JooqShellPrefs
import com.salt.identity.infrastructure.RsaTokenIssuer
import com.salt.identity.infrastructure.SigningKeys
import com.salt.identity.infrastructure.TokenLifetimes
import com.salt.support.messaging.EventSchemas
import com.salt.support.messaging.OutboxSource
import com.salt.support.messaging.OutboxWriter
import com.salt.support.messaging.TraceParent
import com.salt.support.persistence.ServiceDatabase
import com.salt.support.web.AuthProperties
import com.salt.support.web.DualTokenVerifier
import com.salt.support.web.SaltTokens
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.validation.annotation.Validated
import tools.jackson.databind.json.JsonMapper
import java.time.Clock
import java.time.Duration

/**
 * identity 설정(`SRV-REQ-048` FR-8, 서버 S3b). **비밀 둘에 기본값 0** — 서명 개인키 · 옛 갱신 비밀(이중 기간). 수명 · 상한은 옛 Express env 기본값 그대로.
 * - `signingKey` — RSA 2048+ PKCS#8 PEM(`IDENTITY_SIGNING_KEY`). 바꾸면 새 kid · 옛 키는 signing_key 행이 남아 retired_at 까지 검증된다
 * - `legacyRefreshSecret` — 옛 HS 갱신 토큰(`JWT_REFRESH_SECRET`)을 `salt.auth.legacy-hs-until` 까지 받는다
 */
@Validated
@ConfigurationProperties("salt.identity")
data class IdentityProperties(
    @field:NotBlank val signingKey: String,
    @field:NotBlank val legacyRefreshSecret: String,
    val accessTtl: Duration = Duration.ofMinutes(15),
    val refreshTtl: Duration = Duration.ofDays(7),
    val guestTtl: Duration = Duration.ofMinutes(30),
    /** 활성 계정 상한(`INVITE_MAX_ACCOUNTS`, 옛 기본 10) */
    @field:Min(1) val maxAccounts: Int = 10,
    /** 게스트 공개(`PUBLIC_MARKET_GUEST`, 옛 기본 켬) — 끄면 게스트 발급 403 */
    val publicMarketGuest: Boolean = true,
    /** 게스트 발급 10분 창 상한(`GUEST_ISSUE_PER_WINDOW`, 옛 기본 300) */
    @field:Min(1) val guestIssuePerWindow: Int = 300,
)

/**
 * identity 서비스 조립(`SRV-REQ-048`) — 이 파일만 네 층을 다 안다(`kotlin-platform.md` §2).
 * S3a 셸 설정 + **S3b 계정 · 초대 코드 · 토큰 발급(RS256 · JWKS)** — 옛 Express `auth` · `modules/user` 프로필을 옮겼다. 발행 `identity.UserRegistered`.
 * [SigningKeys] 가 플랫폼 리소스 서버의 [com.salt.support.web.TrustedKeys] 다(한 프로세스, `msa-services.md` §8 — 나뉘면 JWKS 주소로).
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(IdentityProperties::class)
class IdentityComposition {
    @Bean(destroyMethod = "close")
    fun identityDatabase(db: SaltDbProperties): ServiceDatabase = ServiceDatabase.open(SCHEMA, db.connection(SCHEMA))

    @Bean(IDENTITY_TX)
    fun identityTx(@Qualifier("identityDatabase") database: ServiceDatabase): PlatformTransactionManager = database.transactionManager

    @Bean
    fun identityOutboxSource(@Qualifier("identityDatabase") database: ServiceDatabase): OutboxSource = OutboxSource(SCHEMA, database.dsl, database.dataSource)

    @Bean
    fun identityOutbox(
        @Qualifier("identityDatabase") database: ServiceDatabase,
        schemas: EventSchemas,
        jsonMapper: JsonMapper,
        traceParent: TraceParent,
        clock: Clock,
    ): OutboxWriter = OutboxWriter(SCHEMA, database.dsl, database.dataSource, schemas, jsonMapper, traceParent, clock)

    // ── 셸 설정(S3a) ──
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

    // ── 계정 · 토큰(S3b) ──
    /** 기동 때 지금 키를 JWKS 표에 올린다 — Flyway(V2)가 먼저 돈 뒤다(ServiceDatabase.open 이 마이그레이션까지 한다) */
    @Bean
    fun identitySigningKeys(@Qualifier("identityDatabase") database: ServiceDatabase, properties: IdentityProperties, clock: Clock): SigningKeys =
        SigningKeys(database.dsl, clock).apply { register(SigningKeys.fromPem(properties.signingKey)) }

    @Bean
    fun identityTokenIssuer(keys: SigningKeys, properties: IdentityProperties, auth: AuthProperties, clock: Clock): RsaTokenIssuer =
        RsaTokenIssuer(
            SigningKeys.fromPem(properties.signingKey),
            TokenLifetimes(properties.accessTtl, properties.refreshTtl, properties.guestTtl),
            DualTokenVerifier(keys, SaltTokens.AUDIENCE_REFRESH, properties.legacyRefreshSecret, auth.legacyHsUntil, clock),
            clock,
        )

    @Bean
    fun identityAccounts(@Qualifier("identityDatabase") database: ServiceDatabase): JooqAccounts = JooqAccounts(database.dsl)

    @Bean
    fun identityInviteCodes(
        @Qualifier("identityDatabase") database: ServiceDatabase,
        @Qualifier("identityOutbox") outbox: OutboxWriter,
    ): JooqInviteCodes = JooqInviteCodes(database.dsl, IdentityEvents(outbox))

    @Bean
    fun identityRedeemInvite(invites: JooqInviteCodes): RedeemInvite = RedeemInvite(invites)

    @Bean
    fun identityAcceptInvite(
        invites: JooqInviteCodes,
        redeem: RedeemInvite,
        accounts: JooqAccounts,
        tokens: RsaTokenIssuer,
        @Qualifier("identityDatabase") database: ServiceDatabase,
        properties: IdentityProperties,
        clock: Clock,
    ): AcceptInviteCode =
        AcceptInviteCode(invites, redeem, accounts, BcryptPasswordHasher(), tokens, JooqInviteAttempts(database.dsl, clock), properties.maxAccounts, clock)

    @Bean
    fun identityCheckInvite(invites: JooqInviteCodes, properties: IdentityProperties, clock: Clock): CheckInviteCode =
        CheckInviteCode(invites, properties.maxAccounts, clock)

    @Bean
    fun identityLogin(accounts: JooqAccounts, tokens: RsaTokenIssuer, clock: Clock): Login = Login(accounts, BcryptPasswordHasher(), tokens, clock)

    @Bean
    fun identityRefresh(tokens: RsaTokenIssuer): RefreshSession = RefreshSession(tokens)

    @Bean
    fun identityGuest(tokens: RsaTokenIssuer, properties: IdentityProperties): IssueGuestToken = IssueGuestToken(tokens, properties.publicMarketGuest)

    @Bean
    fun identityGetAccount(accounts: JooqAccounts): GetAccount = GetAccount(accounts)

    @Bean
    fun identityGetProfile(accounts: JooqAccounts): GetProfile = GetProfile(accounts)

    @Bean
    fun identityUpdateProfile(accounts: JooqAccounts, clock: Clock): UpdateProfile = UpdateProfile(accounts, clock)

    /** 요청 제한 — 옛 Express 와 같은 수(코드 확인 1분 30 · 수락 1분 10 · 게스트 10분 설정값) */
    @Bean
    fun identityAuthLimits(properties: IdentityProperties, clock: Clock): AuthController.AuthLimits =
        AuthController.AuthLimits(
            check = FixedWindowLimit(Duration.ofMinutes(1), 30, clock),
            accept = FixedWindowLimit(Duration.ofMinutes(1), 10, clock),
            guest = FixedWindowLimit(Duration.ofMinutes(10), properties.guestIssuePerWindow, clock),
        )

    companion object {
        const val SCHEMA = "identity"
    }
}
