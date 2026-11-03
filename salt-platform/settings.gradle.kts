// salt-platform — 서버 MSA 의 Kotlin 쪽(`ADR-006` · `SRV-REQ-043`). 모듈 구조와 의존 규칙은
// `salt-server/.claude/rules/kotlin-platform.md` §2. 새 서비스 = services/<name>/{domain,application,infrastructure,api} 네 줄.
pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

plugins {
    // JDK 21 이 없는 머신에서도 툴체인을 받아 온다 — 개발 머신 JDK(17)와 무관하게 같은 컴파일러
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

dependencyResolutionManagement {
    repositoriesMode = RepositoriesMode.FAIL_ON_PROJECT_REPOS
    repositories {
        mavenCentral()
    }
}

rootProject.name = "salt-platform"

include(
    "shared-kernel",
    "support:web",
    "support:persistence",
    "support:messaging",
    "services:ping:domain",
    "services:ping:application",
    "services:ping:infrastructure",
    "services:ping:api",
    "services:savings:domain",
    "services:savings:application",
    "services:savings:infrastructure",
    "services:savings:api",
    "app",
)
