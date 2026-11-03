package com.salt

import org.springframework.test.context.DynamicPropertyRegistry
import org.testcontainers.postgresql.PostgreSQLContainer
import org.testcontainers.rabbitmq.RabbitMQContainer
import org.testcontainers.utility.MountableFile
import java.sql.DriverManager

/**
 * 실 Postgres · RabbitMQ(`kotlin-platform.md` §7 — 인메모리 DB 로 대신하지 않는다: 트리거 · NUMERIC · 스키마 권한이 다르다).
 * DB 는 Compose 와 **같은 계정 스크립트**(`db/roles.sql`)로 만든다 — 테스트만 통과하는 권한 설정이 생기지 않게.
 */
object PlatformContainers {
    const val PING_PASSWORD = "ping-test-password"
    const val JWT_SECRET = "test-secret-at-least-32-bytes-long-0123456789"

    val postgres: PostgreSQLContainer = PostgreSQLContainer("postgres:14-alpine").apply {
        withCopyFileToContainer(MountableFile.forHostPath("../db/roles.sql"), "/salt/roles.sql")
        start()
        val result = execInContainer(
            "psql", "-v", "ON_ERROR_STOP=1", "-U", username, "-d", databaseName,
            "-v", "ping_password=$PING_PASSWORD", "-f", "/salt/roles.sql",
        )
        check(result.exitCode == 0) { "roles.sql 실패: ${result.stderr}" }
        // 권한 검사용 — 남의 스키마(savings)에 표 하나
        DriverManager.getConnection(jdbcUrl, username, password).use { it.createStatement().execute("CREATE TABLE savings.probe (id int)") }
    }

    val rabbit: RabbitMQContainer = RabbitMQContainer("rabbitmq:4-management-alpine").apply { start() }

    fun register(registry: DynamicPropertyRegistry) {
        registry.add("salt.db.url") { postgres.jdbcUrl }
        registry.add("salt.db.accounts.ping.password") { PING_PASSWORD }
        registry.add("salt.auth.jwt-secret") { JWT_SECRET }
        registry.add("spring.rabbitmq.host") { rabbit.host }
        registry.add("spring.rabbitmq.port") { rabbit.amqpPort }
        registry.add("spring.rabbitmq.username") { rabbit.adminUsername }
        registry.add("spring.rabbitmq.password") { rabbit.adminPassword }
        registry.add("logging.structured.format.console") { "" }
    }
}
