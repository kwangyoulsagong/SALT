// 서비스별 DB 연결 — 스키마 하나 · 계정 하나 · Flyway 하나 · jOOQ 하나(`DB-REQ-036` FR-1 · `SRV-REQ-043` FR-5).
// Boot 의 DataSource · Flyway · jOOQ 자동 설정을 쓰지 않는다 — 그건 DB 하나를 전제하고, 여기는 서비스 수만큼 연결이 있다.
plugins {
    id("salt.spring")
}

dependencies {
    api("org.springframework:spring-jdbc")
    api("org.springframework:spring-tx")
    api("org.jooq:jooq")
    implementation("com.zaxxer:HikariCP")
    implementation("org.flywaydb:flyway-core")
    runtimeOnly("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")
}
