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
    const val SAVINGS_PASSWORD = "savings-test-password"
    const val HOUSEHOLD_PASSWORD = "household-test-password"
    const val CONTENT_PASSWORD = "content-test-password"
    const val NOTIFICATION_PASSWORD = "notification-test-password"
    const val COACH_PASSWORD = "coach-test-password"
    const val JWT_SECRET = "test-secret-at-least-32-bytes-long-0123456789"

    /** 기본 14 = 로컬 운영 DB 와 같은 판. 관리형 DB 후보 판은 `-Dsalt.test.postgres=postgres:17-alpine` 로 같은 테스트를 돌린다 */
    private val postgresImage = System.getProperty("salt.test.postgres") ?: "postgres:14-alpine"

    val postgres: PostgreSQLContainer = PostgreSQLContainer(postgresImage).apply {
        // 서비스 풀(5개씩) × 테스트 컨텍스트 수 — S2c 에 notification · coach 풀이 늘어 기본 100 을 넘었다(2026-11-06). 운영 DB 와 무관한 테스트 값
        withCommand("postgres", "-c", "max_connections=300")
        withCopyFileToContainer(MountableFile.forHostPath("../db/roles.sql"), "/salt/roles.sql")
        start()
        val result = execInContainer(
            "psql", "-v", "ON_ERROR_STOP=1", "-U", username, "-d", databaseName,
            "-v", "ping_password=$PING_PASSWORD", "-v", "savings_password=$SAVINGS_PASSWORD",
            "-v", "household_password=$HOUSEHOLD_PASSWORD", "-v", "content_password=$CONTENT_PASSWORD",
            "-v", "notification_password=$NOTIFICATION_PASSWORD", "-v", "coach_password=$COACH_PASSWORD", "-f", "/salt/roles.sql",
        )
        check(result.exitCode == 0) { "roles.sql 실패: ${result.stderr}" }
        // 권한 검사용 — 남의 스키마(identity — 아직 플랫폼에 없는 서비스)에 표 하나. savings · household · content 는 Flyway 가 쓰는 스키마라 비워 둔다
        // (content 는 금융 팁 S2a 2026-11-05 부터 — 그 전엔 여기가 content.probe 였다)
        DriverManager.getConnection(jdbcUrl, username, password).use { it.createStatement().execute("CREATE TABLE identity.probe (id int)") }
    }

    val rabbit: RabbitMQContainer = RabbitMQContainer("rabbitmq:4-management-alpine").apply { start() }

    fun register(registry: DynamicPropertyRegistry) {
        registry.add("salt.db.url") { postgres.jdbcUrl }
        registry.add("salt.db.accounts.ping.password") { PING_PASSWORD }
        registry.add("salt.db.accounts.savings.password") { SAVINGS_PASSWORD }
        registry.add("salt.db.accounts.household.password") { HOUSEHOLD_PASSWORD }
        registry.add("salt.db.accounts.content.password") { CONTENT_PASSWORD }
        registry.add("salt.db.accounts.notification.password") { NOTIFICATION_PASSWORD }
        registry.add("salt.db.accounts.coach.password") { COACH_PASSWORD }
        registry.add("salt.auth.jwt-secret") { JWT_SECRET }
        // 금융 팁 공개 플래그 — 기본은 꺼짐(법무 확인 전). 통합 테스트는 켠 채로 한 컨텍스트를 같이 쓴다(꺼짐 동작은 `ContentSettingsSpec`)
        registry.add("salt.content.public-enabled") { "true" }
        registry.add("spring.rabbitmq.host") { rabbit.host }
        registry.add("spring.rabbitmq.port") { rabbit.amqpPort }
        registry.add("spring.rabbitmq.username") { rabbit.adminUsername }
        registry.add("spring.rabbitmq.password") { rabbit.adminPassword }
        registry.add("logging.structured.format.console") { "" }
    }
}
