// 유스케이스 — 도메인 포트만 안다. 트랜잭션 경계는 여기에만(`@Transactional(transactionManager = SAVINGS_TX)`).
plugins {
    id("salt.spring")
}

dependencies {
    api(project(":services:savings:domain"))
    implementation("org.springframework:spring-tx")
}
