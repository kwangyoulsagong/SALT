// 유스케이스 — 도메인 포트만 안다. 트랜잭션 경계는 여기에만(`@Transactional(transactionManager = NOTIFICATION_TX)`).
plugins {
    id("salt.spring")
}

dependencies {
    api(project(":services:notification:domain"))
    implementation("org.springframework:spring-tx")
}
