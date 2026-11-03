package com.salt.support.messaging

import org.springframework.amqp.core.Binding
import org.springframework.amqp.core.BindingBuilder
import org.springframework.amqp.core.Declarables
import org.springframework.amqp.core.DirectExchange
import org.springframework.amqp.core.QueueBuilder
import org.springframework.amqp.core.TopicExchange

/**
 * 브로커 모양 — 교환기 하나(`salt.events`, topic) · 라우팅 키 = 이벤트 이름(`<service>.<Event>`) · 데드레터 교환기 하나.
 *
 * 구독 큐는 **구독하는 서비스가** 선언한다: `<subscriber>.<eventType>` + 데드레터 큐 `<…>.dlq`.
 * 재시도 3회(리스너 설정 `spring.rabbitmq.listener.simple.retry`) 뒤 거부되면 데드레터로 간다(`SRV-REQ-044` FR-8).
 */
object EventTopology {
    const val EXCHANGE = "salt.events"
    const val DEAD_LETTER_EXCHANGE = "salt.events.dlx"
    const val OCCURRED_AT_HEADER = "x-occurred-at"

    fun exchanges(): Declarables = Declarables(
        TopicExchange(EXCHANGE, true, false),
        DirectExchange(DEAD_LETTER_EXCHANGE, true, false),
    )

    fun queueName(subscriber: String, eventType: String): String = "$subscriber.$eventType"

    fun subscription(subscriber: String, eventType: String): Declarables {
        val name = queueName(subscriber, eventType)
        val queue = QueueBuilder.durable(name)
            .deadLetterExchange(DEAD_LETTER_EXCHANGE)
            .deadLetterRoutingKey("$name.dlq")
            .build()
        val deadLetters = QueueBuilder.durable("$name.dlq").build()
        return Declarables(
            queue,
            deadLetters,
            Binding(name, Binding.DestinationType.QUEUE, EXCHANGE, eventType, null),
            BindingBuilder.bind(deadLetters).to(DirectExchange(DEAD_LETTER_EXCHANGE, true, false)).with("$name.dlq"),
        )
    }
}
