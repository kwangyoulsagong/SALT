package com.salt.app

import com.salt.support.messaging.EventGauges
import com.salt.support.messaging.EventSchemas
import com.salt.support.messaging.EventTopology
import com.salt.support.messaging.OutboxRelay
import com.salt.support.messaging.OutboxSource
import com.salt.support.messaging.TraceParent
import com.salt.support.persistence.ServiceDbConnection
import io.micrometer.tracing.Tracer
import io.micrometer.tracing.propagation.Propagator
import jakarta.validation.constraints.NotBlank
import io.micrometer.core.instrument.MeterRegistry
import org.springframework.amqp.core.AmqpAdmin
import org.springframework.amqp.core.Declarables
import org.springframework.amqp.core.Queue
import org.springframework.beans.factory.InitializingBean
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.validation.annotation.Validated
import java.time.Clock

/**
 * DB 접속 — 주소 하나(물리 DB 하나) · 서비스마다 계정. **비밀에 기본값 0**, 빠지면 기동 실패(`kotlin-platform.md` §6).
 */
@Validated
@ConfigurationProperties("salt.db")
data class SaltDbProperties(
    @field:NotBlank val url: String,
    val accounts: Map<String, Account>,
) {
    data class Account(@field:NotBlank val username: String, @field:NotBlank val password: String)

    fun connection(service: String): ServiceDbConnection {
        val account = requireNotNull(accounts[service]) { "salt.db.accounts.$service 가 없다 — 서비스 계정 없이 기동하지 않는다" }
        return ServiceDbConnection(url, account.username, account.password)
    }
}

/** 서비스가 같이 쓰는 부품 조립 — 시계 · 이벤트 스키마 · 추적 · 릴레이 · 교환기. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(SaltDbProperties::class)
class PlatformWiring {
    /** 시계 포트 = `java.time.Clock`(`SRV-REQ-043` FR-3). 테스트는 `Clock.fixed`. 저장 · 응답은 UTC Instant, KST 해석은 도메인이 한다. */
    @Bean
    fun clock(): Clock = Clock.systemUTC()

    @Bean
    fun eventSchemas(): EventSchemas = EventSchemas()

    @Bean
    fun traceParent(tracer: Tracer, propagator: Propagator): TraceParent = TraceParent(tracer, propagator)

    @Bean
    fun eventExchanges(): Declarables = EventTopology.exchanges()

    /** 데드레터 · 포기한 아웃박스 지표 — 큐 이름은 서비스가 선언한 구독(`EventTopology.subscription`)에서 모은다 */
    @Bean
    fun eventGauges(registry: MeterRegistry, admin: AmqpAdmin, declarables: List<Declarables>, sources: List<OutboxSource>) = InitializingBean {
        val deadLetterQueues = declarables.flatMap { it.getDeclarablesByType(Queue::class.java) }.map { it.name }.filter { it.endsWith(".dlq") }
        EventGauges.register(registry, admin, deadLetterQueues, sources)
    }

    @Bean
    fun outboxRelay(sources: List<OutboxSource>, rabbit: RabbitTemplate, traceParent: TraceParent, clock: Clock): OutboxRelay =
        OutboxRelay(sources, rabbit, traceParent, clock)
}
