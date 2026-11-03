// 도메인 이벤트 — 서비스별 아웃박스 · 릴레이 · 멱등 구독 · 스키마 검증(`SRV-REQ-044`).
// 이벤트 스키마는 루트 `contracts/events/*.json` 한 곳 — 그대로 클래스패스에 실어 쓰기 시점에 검증한다(FR-3).
plugins {
    id("salt.spring")
}

dependencies {
    api(project(":support:persistence"))
    api("org.springframework.boot:spring-boot-starter-amqp")
    api("io.micrometer:micrometer-tracing")
    api(libs.shedlock.spring)
    implementation(libs.shedlock.jdbc)
    implementation("org.springframework.boot:spring-boot-starter-json")
    implementation(libs.json.schema.validator)
}

tasks.processResources {
    from(rootProject.file("../contracts")) { include("events/*.json") }
}
