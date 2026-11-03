package com.salt.support.persistence

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.flywaydb.core.Flyway
import org.jooq.DSLContext
import org.jooq.SQLDialect
import org.jooq.impl.DSL
import org.jooq.impl.DataSourceConnectionProvider
import org.jooq.impl.DefaultConfiguration
import org.springframework.jdbc.datasource.DataSourceTransactionManager
import org.springframework.jdbc.datasource.TransactionAwareDataSourceProxy
import javax.sql.DataSource

/**
 * 서비스 하나의 DB 연결 묶음. **서비스 계정은 자기 스키마만 본다**(`DB-REQ-036` FR-1) — 한 프로세스(S0~S2) 안에서도
 * 서비스마다 풀이 따로라, 코드가 남의 테이블 이름을 적어도 DB 가 권한 오류로 막는다.
 *
 * - `search_path` = 서비스 스키마. SQL · jOOQ 는 스키마를 적지 않는다(생성 코드도 스키마 없이 — `infrastructure` 의 jOOQ 설정)
 * - Flyway 위치 `classpath:db/migration/<schema>` · 이력 표도 그 스키마에(`kotlin-platform.md` §4)
 * - 트랜잭션은 이 묶음의 [transactionManager] 로만 — `@Transactional(transactionManager = "<service>Tx")`.
 *   이름 없는 `@Transactional` 은 매니저가 여럿이라 기동이 실패한다(서비스 경계를 넘는 트랜잭션을 실수로 만들 수 없다)
 */
class ServiceDatabase private constructor(
    val schema: String,
    val dataSource: DataSource,
    val dsl: DSLContext,
    val transactionManager: DataSourceTransactionManager,
) : AutoCloseable {
    override fun close() {
        (dataSource as? HikariDataSource)?.close()
    }

    companion object {
        fun open(schema: String, connection: ServiceDbConnection, poolSize: Int = 5): ServiceDatabase {
            require(schema.matches(Regex("[a-z][a-z_]*"))) { "스키마 이름은 소문자 · 밑줄만: $schema" }
            val pool = HikariDataSource(
                HikariConfig().apply {
                    jdbcUrl = connection.url
                    username = connection.username
                    password = connection.password
                    this.schema = schema
                    maximumPoolSize = poolSize
                    poolName = "db-$schema"
                },
            )
            Flyway.configure()
                .dataSource(pool)
                .schemas(schema)
                .defaultSchema(schema)
                // 스키마 · 계정은 관리자가 만든다(`salt-platform/db/roles.sql`) — 서비스 계정에 CREATE SCHEMA 권한이 없다
                .createSchemas(false)
                .locations("classpath:db/migration/$schema")
                .failOnMissingLocations(true)
                .load()
                .migrate()

            val transactional = TransactionAwareDataSourceProxy(pool)
            val dsl = DSL.using(
                DefaultConfiguration()
                    .set(DataSourceConnectionProvider(transactional))
                    .set(SQLDialect.POSTGRES),
            )
            return ServiceDatabase(schema, pool, dsl, DataSourceTransactionManager(pool))
        }
    }
}

/** 접속 정보. 주소는 서비스가 같이 쓰고(물리 DB 하나) 계정 · 비밀은 서비스마다 다르다. 비밀에 기본값 0. */
data class ServiceDbConnection(val url: String, val username: String, val password: String)
