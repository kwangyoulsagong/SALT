// 조립 · 실행 — S0~S2 는 서비스 전부가 이 한 프로세스(`ADR-006` §1). 서비스마다 꽂는 곳은 `com.salt.<service>.<Service>Composition`.
plugins {
    id("salt.spring")
    alias(libs.plugins.spring.boot)
}

dependencies {
    implementation(project(":support:web"))
    implementation(project(":support:persistence"))
    implementation(project(":support:messaging"))
    implementation(project(":services:ping:domain"))
    implementation(project(":services:ping:application"))
    implementation(project(":services:ping:infrastructure"))
    implementation(project(":services:ping:api"))
    implementation(project(":services:savings:domain"))
    implementation(project(":services:savings:application"))
    implementation(project(":services:savings:infrastructure"))
    implementation(project(":services:savings:api"))
    implementation(project(":services:household:domain"))
    implementation(project(":services:household:application"))
    implementation(project(":services:household:infrastructure"))
    implementation(project(":services:household:api"))
    implementation(project(":services:content:domain"))
    implementation(project(":services:content:application"))
    implementation(project(":services:content:infrastructure"))
    implementation(project(":services:content:api"))
    implementation(project(":services:notification:domain"))
    implementation(project(":services:notification:application"))
    implementation(project(":services:notification:infrastructure"))
    implementation(project(":services:notification:api"))
    implementation(project(":services:identity:domain"))
    implementation(project(":services:identity:application"))
    implementation(project(":services:identity:infrastructure"))
    implementation(project(":services:identity:api"))
    implementation(project(":services:coach:infrastructure"))

    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-opentelemetry")
    implementation("org.springframework.modulith:spring-modulith-starter-core")
    implementation(libs.springdoc.webmvc)
    implementation(libs.resilience4j.boot)
    implementation("net.javacrumbs.shedlock:shedlock-spring")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.springframework.modulith:spring-modulith-starter-test")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testImplementation("org.testcontainers:testcontainers-rabbitmq")
    testImplementation(libs.archunit.junit5)
}

tasks.bootJar {
    archiveFileName = "salt-platform.jar"
}

tasks.test {
    // Postgres 판 바꿔 돌리기: ./gradlew :app:test -Psalt.test.postgres=postgres:17-alpine
    providers.gradleProperty("salt.test.postgres").orNull?.let { systemProperty("salt.test.postgres", it) }
}
