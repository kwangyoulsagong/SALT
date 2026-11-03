// 모든 모듈 공통 — Kotlin · JDK 21 · 테스트. 도메인 모듈은 이것만 쓴다(Spring 이 클래스패스에 없어 import 자체가 안 된다).
import org.gradle.api.artifacts.VersionCatalogsExtension

plugins {
    id("org.jetbrains.kotlin.jvm")
}

val libs = the<VersionCatalogsExtension>().named("libs")

// 모듈 이름이 서비스마다 겹친다(domain · api …) — 실행 jar 안에서 충돌하지 않게 경로를 이름으로 쓴다
base.archivesName = path.removePrefix(":").replace(":", "-")

kotlin {
    jvmToolchain(21)
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
        allWarningsAsErrors = true
    }
}

dependencies {
    testImplementation(platform(libs.findLibrary("spring-boot-bom").get()))
    testImplementation(libs.findLibrary("kotest-runner").get())
    testImplementation(libs.findLibrary("kotest-assertions").get())
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}
