// 어댑터 — jOOQ(이 서비스 스키마만 생성) · bcrypt · RS256 발급(nimbus — support:web 의 리소스 서버 의존이 싣는다). 포트는 domain, 꽂는 곳은 app 의 IdentityComposition. 발행 identity.UserRegistered(S3b)
plugins {
    id("salt.spring")
    alias(libs.plugins.jooq.codegen)
}

dependencies {
    api(project(":services:identity:domain"))
    implementation(project(":support:messaging"))
    implementation(project(":support:web"))
    implementation("org.springframework.boot:spring-boot-starter-json")
    implementation("org.springframework.security:spring-security-crypto")
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
                        value = "src/main/resources/db/migration/identity/*.sql"
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
                // 생성기(H2 흉내)는 정밀도 없는 numeric 을 소수 0자리(BigInteger)로 읽는다 — 금액 열은 NUMERIC 그대로 BigDecimal 이어야 한다(`kotlin-platform.md` §4)
                forcedTypes {
                    forcedType {
                        name = "DECIMAL"
                        includeTypes = "(?i:NUMERIC|DECIMAL).*"
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
                packageName = "com.salt.identity.infrastructure.jooq"
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
