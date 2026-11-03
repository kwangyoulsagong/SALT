// 어댑터 — jOOQ(이 서비스 스키마만 생성) · 아웃박스 발행. 포트는 domain, 꽂는 곳은 app 의 PingComposition.
plugins {
    id("salt.spring")
    alias(libs.plugins.jooq.codegen)
}

dependencies {
    api(project(":services:ping:domain"))
    implementation(project(":support:messaging"))
    implementation("org.springframework.boot:spring-boot-starter-json")
    jooqCodegen(libs.jooq.meta.extensions)
}

// jOOQ 코드는 **이 서비스의 Flyway 스크립트에서** 만든다(DB 접속 없이) — 남의 스키마 클래스가 생길 길이 없다(`kotlin-platform.md` §4)
val generatedJooq = layout.buildDirectory.dir("generated-sources/jooq")

jooq {
    configuration {
        generator {
            database {
                name = "org.jooq.meta.extensions.ddl.DDLDatabase"
                properties {
                    property {
                        key = "scripts"
                        value = "src/main/resources/db/migration/ping/*.sql"
                    }
                    property {
                        key = "sort"
                        value = "flyway"
                    }
                    property {
                        key = "defaultNameCase"
                        value = "lower"
                    }
                    property {
                        key = "unqualifiedSchema"
                        value = "none"
                    }
                }
            }
            generate {
                isDeprecated = false
                isRecords = true
                isPojos = false
                isDaos = false
            }
            target {
                packageName = "com.salt.ping.infrastructure.jooq"
                directory = generatedJooq.get().asFile.path
            }
        }
    }
}

sourceSets.main {
    java.srcDir(generatedJooq)
}

tasks.named("compileKotlin") { dependsOn(tasks.named("jooqCodegen")) }
tasks.named("compileJava") { dependsOn(tasks.named("jooqCodegen")) }
