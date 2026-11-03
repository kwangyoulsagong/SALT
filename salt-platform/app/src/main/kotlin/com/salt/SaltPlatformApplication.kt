package com.salt

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.modulith.Modulithic
import org.springframework.scheduling.annotation.EnableScheduling

/**
 * salt-platform — 서버 MSA 의 Kotlin 쪽(`ADR-006`). Modulith 모듈 = `com.salt` 바로 아래 패키지 하나:
 * 서비스(`ping` · 이후 `savings` …) · 공유 커널(`kernel`) · 기술 부품(`support`, 열린 모듈) · 조립(`app`).
 */
@SpringBootApplication
@EnableScheduling
@Modulithic(systemName = "salt-platform", sharedModules = ["kernel", "support"])
class SaltPlatformApplication

fun main(args: Array<String>) {
    runApplication<SaltPlatformApplication>(*args)
}
