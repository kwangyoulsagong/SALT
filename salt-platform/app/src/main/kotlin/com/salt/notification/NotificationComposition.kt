package com.salt.notification

import com.salt.notification.infrastructure.NotificationUserRows
import com.salt.support.persistence.PersonalData
import com.salt.app.SaltDbProperties
import com.salt.notification.api.NotificationCleanupWorker
import com.salt.notification.api.NotificationEventsListener
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
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import tools.jackson.databind.json.JsonMapper
import java.time.Clock

/**
 * notification 서비스 조립(`SRV-REQ-048` FR-5, 서버 S2c) — 이 파일만 네 층을 다 안다(`kotlin-platform.md` §2). 본뜬 곳 `ContentComposition`.
 * 발행하는 이벤트가 없어 아웃박스 원천(`OutboxSource`)을 내놓지 않는다.
 */
@Configuration(proxyBeanMethods = false)
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

    /** 내 데이터 — 내보내기 · 지우기(`SRV-REQ-048` FR-3 · 4, 서버 S3c). 경로는 앱 하나(`MyDataController`) */
    @Bean
    fun notificationPersonalData(@Qualifier("notificationDatabase") database: ServiceDatabase): PersonalData =
        PersonalData(NotificationUserRows.of(database.dsl), database.transactionManager)

    companion object {
        const val SCHEMA = "notification"
    }
}
