// Spring 을 쓰는 모듈(application · infrastructure · api · support · app). 버전은 Boot · Modulith BOM 이 정한다.
import org.gradle.api.artifacts.VersionCatalogsExtension

plugins {
    id("salt.kotlin")
    id("org.jetbrains.kotlin.plugin.spring")
}

val libs = the<VersionCatalogsExtension>().named("libs")

dependencies {
    implementation(platform(libs.findLibrary("spring-boot-bom").get()))
    implementation(platform(libs.findLibrary("spring-modulith-bom").get()))
    // Spring 이 Kotlin 생성자 · 기본값 · nullable 을 읽는 데 필요하다. 테스트는 Kotest 가 끌어와 통과하고 **실행 jar 에서만** 빠져
    // 설정 바인딩이 기동 때 깨졌다(S0 Compose 실측, `NoClassDefFoundError: kotlin/reflect/jvm/ReflectJvmMapping`)
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("tools.jackson.module:jackson-module-kotlin")
    testImplementation(platform(libs.findLibrary("spring-modulith-bom").get()))
}
