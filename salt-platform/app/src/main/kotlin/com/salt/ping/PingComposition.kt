package com.salt.ping

import com.salt.app.SaltDbProperties
import com.salt.ping.api.PingRecordedListener
import com.salt.ping.application.EchoPingRecorded
import com.salt.ping.application.GetPing
import com.salt.ping.application.PING_TX
import com.salt.ping.application.RecordPing
import com.salt.ping.infrastructure.JooqPingChecks
import com.salt.ping.infrastructure.JooqPingEchoes
import com.salt.ping.infrastructure.OutboxPingEvents
import com.salt.support.messaging.EventSchemas
import com.salt.support.messaging.EventTopology
import com.salt.support.messaging.OutboxSource
import com.salt.support.messaging.OutboxWriter
import com.salt.support.messaging.TraceParent
import com.salt.support.persistence.ServiceDatabase
import org.springframework.amqp.core.Declarables
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import tools.jackson.databind.json.JsonMapper
import java.time.Clock

/**
 * ping 서비스 조립 — Express `composition.ts` 자리. **이 파일만** 네 층을 다 안다(`kotlin-platform.md` §2).
 * 패키지가 `com.salt.ping` 이라 Modulith 상 ping 모듈 안이다 — app Gradle 모듈에 있어도 남의 내부를 건드리지 않는다.
 */
@Configuration(proxyBeanMethods = false)
class PingComposition {
    @Bean(destroyMethod = "close")
    fun pingDatabase(db: SaltDbProperties): ServiceDatabase = ServiceDatabase.open(SCHEMA, db.connection(SCHEMA))

    @Bean(PING_TX)
    fun pingTx(database: ServiceDatabase): PlatformTransactionManager = database.transactionManager

    @Bean
    fun pingOutboxSource(database: ServiceDatabase): OutboxSource = OutboxSource(SCHEMA, database.dsl, database.dataSource)

    @Bean
    fun pingOutbox(database: ServiceDatabase, schemas: EventSchemas, jsonMapper: JsonMapper, traceParent: TraceParent, clock: Clock): OutboxWriter =
        OutboxWriter(SCHEMA, database.dsl, schemas, jsonMapper, traceParent, clock)

    @Bean
    fun recordPing(database: ServiceDatabase, pingOutbox: OutboxWriter, clock: Clock): RecordPing =
        RecordPing(JooqPingChecks(database.dsl), OutboxPingEvents(pingOutbox), clock)

    @Bean
    fun getPing(database: ServiceDatabase): GetPing = GetPing(JooqPingChecks(database.dsl), JooqPingEchoes(database.dsl))

    @Bean
    fun echoPingRecorded(database: ServiceDatabase, clock: Clock): EchoPingRecorded = EchoPingRecorded(JooqPingEchoes(database.dsl), clock)

    @Bean
    fun pingSubscriptions(): Declarables = EventTopology.subscription(PingRecordedListener.SUBSCRIBER, PingRecordedListener.EVENT_TYPE)

    @Bean
    fun pingRecordedListener(echo: EchoPingRecorded, jsonMapper: JsonMapper, traceParent: TraceParent): PingRecordedListener =
        PingRecordedListener(echo, jsonMapper, traceParent)

    companion object {
        const val SCHEMA = "ping"
    }
}
