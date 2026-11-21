package com.salt.notification

import com.salt.notification.infrastructure.NotificationUserRows
import com.salt.support.persistence.PersonalData
import com.salt.app.SaltDbProperties
import com.salt.notification.api.NotificationCleanupWorker
import com.salt.notification.api.NotificationEventsListener
import com.salt.notification.api.PushWorker
import com.salt.notification.application.ClaimPushes
import com.salt.notification.application.DropGoneSubscriptions
import com.salt.notification.application.ManagePushSubscription
import com.salt.notification.application.PushConfig
import com.salt.notification.application.SendPendingPushes
import com.salt.notification.domain.PushSender
import com.salt.notification.infrastructure.HttpPushSender
import com.salt.notification.infrastructure.JooqPushQueue
import com.salt.notification.infrastructure.JooqPushSubscriptions
import com.salt.notification.infrastructure.Vapid
import com.salt.notification.application.CleanupExpired
import com.salt.notification.application.DeliverNotification
import com.salt.notification.application.NOTIFICATION_TX
import com.salt.notification.application.NotificationSettings
import com.salt.notification.application.ReadNotifications
import com.salt.notification.infrastructure.JooqNotificationPrefs
import com.salt.notification.infrastructure.JooqNotifications
import com.salt.support.messaging.EventTopology
import com.salt.support.messaging.ServiceLock
import com.salt.support.persistence.ServiceDatabase
import org.springframework.amqp.core.Declarables
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import tools.jackson.databind.json.JsonMapper
import java.time.Clock

/**
 * 웹 푸시(`SRV-REQ-062` FR-4). **기본 꺼짐** — 켜려면 `PUSH_ENABLED=true` + 키 둘(`ops/vapid-keys.mjs` 로 만든다) + 누르면 갈 공개 주소(`PUBLIC_ORIGIN`).
 * 켰는데 하나라도 비면 기동 실패. 개인키는 환경 변수뿐(비밀에 기본값 0).
 */
@ConfigurationProperties("salt.notification.push")
data class PushProperties(
    val enabled: Boolean = false,
    val vapidPublicKey: String = "",
    val vapidPrivateKey: String = "",
    /** VAPID `sub` — 푸시 서비스가 문제를 알릴 곳. 사람 메일이 아니라 서비스 주소(`https://…`) */
    val subject: String = "",
    /** 알림을 누르면 열 주소의 앞(`https://salt.example`) — Declarative Web Push `navigate` 는 절대 주소 */
    val publicOrigin: String = "",
) {
    init {
        if (enabled) {
            require(vapidPublicKey.isNotBlank() && vapidPrivateKey.isNotBlank()) { "PUSH_ENABLED=true 인데 VAPID 키가 비었다" }
            require(publicOrigin.startsWith("https://") || publicOrigin.startsWith("http://localhost")) { "PUBLIC_ORIGIN 은 https:// (로컬만 http://localhost)" }
            require(subject.isNotBlank()) { "PUSH_SUBJECT 가 비었다" }
        }
    }
}

/**
 * notification 서비스 조립(`SRV-REQ-048` FR-5, 서버 S2c) — 이 파일만 네 층을 다 안다(`kotlin-platform.md` §2). 본뜬 곳 `ContentComposition`.
 * 발행하는 이벤트가 없어 아웃박스 원천(`OutboxSource`)을 내놓지 않는다.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(PushProperties::class)
class NotificationComposition {
    @Bean(destroyMethod = "close")
    fun notificationDatabase(db: SaltDbProperties): ServiceDatabase = ServiceDatabase.open(SCHEMA, db.connection(SCHEMA))

    @Bean(NOTIFICATION_TX)
    fun notificationTx(@Qualifier("notificationDatabase") database: ServiceDatabase): PlatformTransactionManager = database.transactionManager

    @Bean
    fun notificationStore(@Qualifier("notificationDatabase") database: ServiceDatabase, jsonMapper: JsonMapper): JooqNotifications =
        JooqNotifications(database.dsl, jsonMapper)

    @Bean
    fun notificationPrefsStore(@Qualifier("notificationDatabase") database: ServiceDatabase): JooqNotificationPrefs = JooqNotificationPrefs(database.dsl)

    @Bean
    fun notificationDeliver(store: JooqNotifications, prefs: JooqNotificationPrefs): DeliverNotification = DeliverNotification(store, prefs)

    @Bean
    fun notificationRead(store: JooqNotifications, prefs: JooqNotificationPrefs): ReadNotifications = ReadNotifications(store, prefs)

    @Bean
    fun notificationSettings(prefs: JooqNotificationPrefs, clock: Clock): NotificationSettings = NotificationSettings(prefs, clock)

    @Bean
    fun notificationCleanup(store: JooqNotifications, clock: Clock): CleanupExpired = CleanupExpired(store, clock)

    @Bean
    fun notificationCleanupWorker(@Qualifier("notificationDatabase") database: ServiceDatabase, cleanup: CleanupExpired, clock: Clock): NotificationCleanupWorker =
        NotificationCleanupWorker(cleanup, ServiceLock.executor(database.dataSource), clock)

    @Bean
    fun notificationEventsListener(deliver: DeliverNotification, jsonMapper: JsonMapper): NotificationEventsListener = NotificationEventsListener(deliver, jsonMapper)

    // 구독 큐는 구독하는 서비스가 선언한다(`EventTopology`)
    @Bean
    fun notificationSubscriptions(): Declarables =
        Declarables(NotificationEventsListener.SUBSCRIPTIONS.flatMap { EventTopology.subscription(NotificationEventsListener.SUBSCRIBER, it).declarables })

    // ── 웹 푸시(`SRV-REQ-062`) ── 키가 있을 때만 서명기 · 보내기 · 회차가 생긴다
    @Bean
    fun notificationPushVapid(properties: PushProperties, clock: Clock): Vapid? =
        if (properties.enabled) Vapid(properties.vapidPublicKey, properties.vapidPrivateKey, properties.subject, clock) else null

    @Bean
    fun notificationPushConfig(properties: PushProperties, vapid: Vapid?): PushConfig = PushConfig(vapid != null, vapid?.publicKey)

    @Bean
    fun notificationPushSubscriptions(@Qualifier("notificationDatabase") database: ServiceDatabase): JooqPushSubscriptions = JooqPushSubscriptions(database.dsl)

    @Bean
    fun notificationPushManage(subscriptions: JooqPushSubscriptions, config: PushConfig, clock: Clock): ManagePushSubscription =
        ManagePushSubscription(subscriptions, config, clock)

    // 트랜잭션 유스케이스 둘은 빈이어야 한다(`@Transactional` 프록시) — 보내기 유스케이스가 안에서 `new` 하면 트랜잭션이 없다
    @Bean
    fun notificationPushClaim(@Qualifier("notificationDatabase") database: ServiceDatabase, subscriptions: JooqPushSubscriptions, clock: Clock): ClaimPushes =
        ClaimPushes(JooqPushQueue(database.dsl), subscriptions, clock)

    @Bean
    fun notificationPushDrop(subscriptions: JooqPushSubscriptions): DropGoneSubscriptions = DropGoneSubscriptions(subscriptions)

    /** 보내기 포트 — 종단 시험은 `@Primary` 가짜로 바꾼다(밖으로 나가는 요청 0) */
    @Bean
    @ConditionalOnProperty("salt.notification.push.enabled", havingValue = "true")
    fun notificationPushSender(properties: PushProperties, vapid: Vapid?, jsonMapper: JsonMapper): PushSender =
        HttpPushSender(requireNotNull(vapid), properties.publicOrigin, jsonMapper)

    @Bean
    @ConditionalOnProperty("salt.notification.push.enabled", havingValue = "true")
    fun notificationPushSend(claim: ClaimPushes, drop: DropGoneSubscriptions, sender: PushSender): SendPendingPushes = SendPendingPushes(claim, drop, sender)

    @Bean
    @ConditionalOnProperty("salt.notification.push.enabled", havingValue = "true")
    fun notificationPushWorker(@Qualifier("notificationDatabase") database: ServiceDatabase, send: SendPendingPushes, clock: Clock): PushWorker =
        PushWorker(send, ServiceLock.executor(database.dataSource), clock)

    /** 내 데이터 — 내보내기 · 지우기(`SRV-REQ-048` FR-3 · 4, 서버 S3c). 경로는 앱 하나(`MyDataController`) */
    @Bean
    fun notificationPersonalData(@Qualifier("notificationDatabase") database: ServiceDatabase): PersonalData =
        PersonalData(NotificationUserRows.of(database.dsl), database.transactionManager)

    companion object {
        const val SCHEMA = "notification"
    }
}
