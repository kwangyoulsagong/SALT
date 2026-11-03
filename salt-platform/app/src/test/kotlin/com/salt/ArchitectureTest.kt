package com.salt

import com.tngtech.archunit.base.DescribedPredicate
import com.tngtech.archunit.core.domain.JavaClass
import com.tngtech.archunit.core.domain.JavaClasses
import com.tngtech.archunit.core.domain.JavaMethodCall
import com.tngtech.archunit.core.importer.ClassFileImporter
import com.tngtech.archunit.core.importer.ImportOption
import com.tngtech.archunit.lang.ArchCondition
import com.tngtech.archunit.lang.ConditionEvents
import com.tngtech.archunit.lang.SimpleConditionEvent
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses
import com.tngtech.archunit.library.GeneralCodingRules
import org.junit.jupiter.api.Test
import org.springframework.modulith.core.ApplicationModules

/**
 * 경계 검증 — Express `layer-check.mjs` 의 Kotlin 판(`SRV-REQ-043` FR-4). `./gradlew check` 에서 돈다.
 *
 * 1차 방어는 Gradle 의존(도메인 모듈에 Spring 이 없다). 여기는 그 다음 — 의존 선언으로 못 막는 것:
 * 서비스 간 내부 접근 · 층 방향 · 금액 반올림 위치 · JPA · 필드 주입.
 */
class ArchitectureTest {
    private val classes: JavaClasses = ClassFileImporter()
        .withImportOption(ImportOption.DoNotIncludeTests())
        .importPackages("com.salt")

    @Test
    fun `Modulith — 모듈 사이 순환 · 남의 내부 접근이 없다`() {
        ApplicationModules.of(SaltPlatformApplication::class.java).verify()
    }

    @Test
    fun `도메인은 프레임워크를 모른다`() {
        noClasses().that().resideInAPackage("com.salt.(*).domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "org.springframework..", "org.jooq..", "tools.jackson..", "com.fasterxml.jackson..", "jakarta..",
                "com.salt.support..",
            )
            .check(classes)
    }

    @Test
    fun `도메인은 자기 서비스의 바깥 층을 모른다`() {
        noClasses().that().resideInAPackage("com.salt.(*).domain..")
            .should().dependOnClassesThat().resideInAnyPackage("..application..", "..infrastructure..", "..api..")
            .check(classes)
    }

    @Test
    fun `application 은 infrastructure · api 를 모른다`() {
        noClasses().that().resideInAPackage("com.salt.(*).application..")
            .should().dependOnClassesThat().resideInAnyPackage("..infrastructure..", "..api..")
            .check(classes)
    }

    @Test
    fun `infrastructure 와 api 는 서로 모른다`() {
        noClasses().that().resideInAPackage("com.salt.(*).infrastructure..")
            .should().dependOnClassesThat().resideInAPackage("..api..")
            .check(classes)
        noClasses().that().resideInAPackage("com.salt.(*).api..")
            .should().dependOnClassesThat().resideInAPackage("..infrastructure..")
            .check(classes)
    }

    @Test
    fun `서비스는 다른 서비스의 공개 패키지(application_api)만 본다`() {
        noClasses().that().resideInAPackage("com.salt..")
            .should(touchOtherServiceInternals())
            .check(classes)
    }

    @Test
    fun `원 정수 반올림은 api 층에서만`() {
        noClasses().that().resideOutsideOfPackages("com.salt.(*).api..", "com.salt.kernel..")
            .should().callMethodWhere(
                object : DescribedPredicate<JavaMethodCall>("Money.toKrwInteger") {
                    override fun test(call: JavaMethodCall): Boolean =
                        call.targetOwner.fullName == "com.salt.kernel.Money" && call.name.startsWith("toKrwInteger")
                },
            )
            .check(classes)
    }

    @Test
    fun `JPA 를 쓰지 않는다 · 필드 주입을 쓰지 않는다`() {
        noClasses().should().dependOnClassesThat().resideInAnyPackage("jakarta.persistence..", "org.hibernate..").check(classes)
        GeneralCodingRules.NO_CLASSES_SHOULD_USE_FIELD_INJECTION.check(classes)
    }

    private fun touchOtherServiceInternals() = object : ArchCondition<JavaClass>("다른 서비스의 내부(application.api 밖)를 참조") {
        private val shared = setOf("kernel", "support", "app")

        override fun check(item: JavaClass, events: ConditionEvents) {
            val own = serviceOf(item) ?: return
            item.directDependenciesFromSelf.forEach { dependency ->
                val target = dependency.targetClass
                val other = serviceOf(target) ?: return@forEach
                if (other != own && !target.packageName.startsWith("com.salt.$other.application.api")) {
                    events.add(SimpleConditionEvent.violated(dependency, dependency.description))
                }
            }
        }

        private fun serviceOf(javaClass: JavaClass): String? {
            val name = javaClass.packageName.removePrefix("com.salt.").substringBefore('.')
            return name.takeIf { javaClass.packageName.startsWith("com.salt.") && it !in shared }
        }
    }
}
