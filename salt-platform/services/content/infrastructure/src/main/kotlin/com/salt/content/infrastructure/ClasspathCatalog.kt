package com.salt.content.infrastructure

import com.salt.content.domain.ContentCatalog
import com.salt.content.domain.PolicyParam
import org.springframework.core.io.support.PathMatchingResourcePatternResolver
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.math.BigDecimal
import java.time.LocalDate

/**
 * 원문 묶음 = 이 모듈의 자원 `content/tips/<slug>.md` · `content/policy-params.json`(`SRV-REQ-047` FR-1 · FR-3).
 * 원문을 고치는 길은 PR 하나뿐이다 — 검수 = PR 리뷰 + `./gradlew check` 의 원문 검사(`CatalogSpec`).
 */
class ClasspathCatalog(private val jsonMapper: JsonMapper, private val root: String = "content") : ContentCatalog {
    private val resolver = PathMatchingResourcePatternResolver(javaClass.classLoader)

    override fun tipSources(): Map<String, String> =
        resolver.getResources("classpath*:$root/tips/*.md").associate { r ->
            requireNotNull(r.filename).removeSuffix(".md") to r.inputStream.use { it.readBytes().toString(Charsets.UTF_8) }
        }

    override fun policyParams(): List<PolicyParam> {
        val resource = resolver.getResource("classpath:$root/policy-params.json")
        if (!resource.exists()) return emptyList()
        val tree: JsonNode = resource.inputStream.use { jsonMapper.readTree(it) }
        // JsonNode 의 map 은 Jackson 3 에서 다른 뜻(값 변환)이라 Iterable 로 돌린다
        return (tree.path("params") as Iterable<JsonNode>).map { n ->
            PolicyParam(
                key = n.path("key").asString(),
                validFrom = LocalDate.parse(n.path("validFrom").asString()),
                validTo = n.path("validTo").takeIf { !it.isNull && !it.isMissingNode }?.let { LocalDate.parse(it.asString()) },
                value = n.path("value").takeIf { !it.isNull && !it.isMissingNode }?.let { BigDecimal(it.asString()) },
                text = n.path("text").takeIf { !it.isNull && !it.isMissingNode }?.asString(),
                unit = n.path("unit").asString(),
                sourceUrl = n.path("sourceUrl").asString(),
                asOf = LocalDate.parse(n.path("asOf").asString()),
            )
        }
    }
}
