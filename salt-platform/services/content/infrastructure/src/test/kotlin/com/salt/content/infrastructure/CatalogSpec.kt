package com.salt.content.infrastructure

import com.salt.content.domain.PolicyParamSet
import com.salt.content.domain.PublishCheck
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.ints.shouldBeGreaterThan
import io.kotest.matchers.shouldBe
import tools.jackson.databind.json.JsonMapper

/**
 * 레포 원문 검사 — **메타 하나 없는 글 · 금지 문장이 든 글은 `./gradlew check` 에서 실패한다**(`FE-REQ-058` 수용 기준 1 ·
 * `SRV-REQ-047` 수용 기준 1). 기동 때도 같은 검사를 다시 하지만(`SyncCatalog`), 빌드에서 먼저 막아야 PR 리뷰가 고칠 자리를 본다.
 */
class CatalogSpec : StringSpec({
    val catalog = ClasspathCatalog(JsonMapper.builder().build())

    "원문 글 전부가 발행 검사를 통과한다" {
        val sources = catalog.tipSources()
        sources.size shouldBeGreaterThan 0
        val problems = sources.flatMap { (slug, raw) ->
            when (val r = PublishCheck.check(slug, raw)) {
                is PublishCheck.Outcome.Ok -> emptyList()
                is PublishCheck.Outcome.Rejected -> r.problems.map { "$slug: $it" }
            }
        }
        problems.shouldBeEmpty()
    }

    "제도 파라미터 표가 검사를 통과한다 — 겹침 · 공식 출처 · 값 하나" {
        val params = catalog.policyParams()
        params.size shouldBeGreaterThan 0
        PolicyParamSet.validate(params).shouldBeEmpty()
    }

    "원문 안 트리거가 하나 이상 — 때맞춘 팁이 비지 않는다" {
        val tips = catalog.tipSources().map { (slug, raw) -> (PublishCheck.check(slug, raw) as PublishCheck.Outcome.Ok).tip }
        tips.flatMap { it.triggers }.isNotEmpty() shouldBe true
    }
})
