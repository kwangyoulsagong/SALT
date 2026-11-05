package com.salt.content.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import java.security.MessageDigest
import java.time.LocalDate

/**
 * 금융 팁 글(`SRV-REQ-047` · `DB-REQ-039`, 금융 팁 S2a). **원문은 레포 파일**(`infrastructure` 자원 `tips/<slug>.md`) — 검수 = PR 리뷰
 * (FEATURE-014 열린 질문 "원문 MDX vs DB" 를 S2a 에서 1안으로 닫음). DB 에는 메타 · 해시 · 변경 이력 · 트리거 · 사용자 기록만.
 *
 * 공적 제도 설명만 한다 — 상품 · 금리 비교 · 가입 링크 · 대가 · 명령형 0. 글이 그 선을 넘으면 [PublishCheck] 가 발행을 막는다.
 */
data class Tip(
    val slug: String,
    val meta: TipMeta,
    val body: List<TipBlock>,
    val triggers: List<TriggerKind>,
    val contexts: Set<TipContext>,
    /** 이번 판에서 바뀐 것 한 줄(변경 이력 `tip_revision.summary`) — 첫 판이면 null */
    val change: String?,
    /** 원문 전체의 SHA-256 — 바뀌었는지 보는 키(`tip.content_hash`) */
    val contentHash: String,
    /** 읽기 전에 맞혀 보기 0~1개(FR-8) */
    val quiz: TipQuiz? = null,
    /** 내 숫자로 다시 읽기 0~1개(FR-6, S2d) — 원문 머리 `my_numbers:` */
    val myNumbers: MyNumbersKind? = null,
) {
    /** 유효기한이 지났는가 — 그날(KST)까지는 유효, 다음 날부터 확인 필요(FR-2 경계) */
    fun statusOn(today: LocalDate): TipStatus = TipStatus.on(meta.validUntil, today)

    /**
     * 줄 diff(FR-7)의 재료 — 사람이 읽는 문장만 줄로 편다: 제목 · 요약 · 기준 연도 · 유효기한 · 본문 문장(제목줄 · 문단 · 목록 한 줄씩).
     * 출처 · 작성일 · 검수일 · 퀴즈는 넣지 않는다 — "제도가 무엇이 바뀌었나"를 보려는 목록이라 검수일만 바뀐 판이 줄을 내지 않게.
     * 마크다운 표지(`## ` · `- `)는 빼고 문장만 — 화면이 문자열 그대로 보여 준다.
     */
    fun revisionLines(): List<String> =
        listOf("제목: ${meta.title}", "요약: ${meta.summary}", "기준 연도: ${meta.baseYear}년", "유효기한: ${meta.validUntil}") +
            body.flatMap { it.texts() }
}

/** 발행에 필요한 메타 — 하나라도 없으면 [Tip] 이 되지 못한다(FR-1). DB 열도 전부 NOT NULL(`DB-REQ-039` FR-1). */
data class TipMeta(
    val title: String,
    val summary: String,
    /** 공식 출처 — 법령 · 정부 · 공공기관 페이지만(가입 링크 금지, [LegalLine.officialSource]) */
    val sourceUrl: String,
    val sourceName: String,
    val writtenOn: LocalDate,
    val reviewedOn: LocalDate,
    val baseYear: Int,
    val validUntil: LocalDate,
)

/** 본문 덩어리 — HTML 이 아니라 구조로 내린다. 화면이 문자열을 HTML 로 끼우지 않는다(주입 0). */
sealed interface TipBlock {
    data class Heading(val text: String) : TipBlock

    data class Paragraph(val text: String) : TipBlock

    data class Bullets(val items: List<String>) : TipBlock

    fun texts(): List<String> = when (this) {
        is Heading -> listOf(text)
        is Paragraph -> listOf(text)
        is Bullets -> items
    }
}

enum class TipStatus(val key: String) {
    PUBLISHED("published"),
    NEEDS_CHECK("needs_check"),
    ;

    companion object {
        fun on(validUntil: LocalDate, today: LocalDate): TipStatus = if (today.isAfter(validUntil)) NEEDS_CHECK else PUBLISHED

        fun of(key: String): TipStatus = entries.first { it.key == key }
    }
}

/** 때맞춘 팁이 뜨는 화면 맥락 — `GET for-me?context=`. 도메인 zone 이름과 같다(`ADR-005`). */
enum class TipContext(val key: String) {
    HOME("home"),
    SAVINGS("savings"),
    HOUSEHOLD("household"),
    ;

    companion object {
        fun parse(key: String?): TipContext? = entries.firstOrNull { it.key == key }
    }
}

/**
 * 트리거 종류(`DB-REQ-039` FR-4 `trigger_rule.kind`). 이벤트 트리거는 사용자 신호([UserSignal])가 있어야, 달 트리거는 그달이어야 맞는다.
 * FEATURE-014 FR-4 의 나머지(신규 정기결제 · 기한 없는 목표 · 물가 발표 · 만 34세 근접 · 월초)는 붙일 글이 생길 때 여기에 더한다.
 * 고정비 증가는 S2d 에 분류 하나(주거)만 — 제도가 붙는 분류만 신호를 남긴다.
 */
enum class TriggerKind(val key: String, val month: Int? = null) {
    GOAL_CREATED_WEDDING("goal_created:wedding"),
    GOAL_CREATED_HOUSING("goal_created:housing"),
    GOAL_REACHED("goal_reached"),
    MONTH_5("month:5", 5),
    MONTH_11("month:11", 11),
    MONTH_12("month:12", 12),

    /** 가계부 고정비 증가(`household.FixedCostIncreased`) 중 주거 분류 — 월세 세액공제 글(S2d) */
    FIXED_COST_INCREASED_HOUSING("fixed_cost_increased:housing"),
    ;

    val isEvent: Boolean get() = month == null

    companion object {
        fun parse(key: String): TriggerKind? = entries.firstOrNull { it.key == key }

        /** 저축 목표 템플릿 → 트리거. 결혼 · 주거만 제도가 붙는다(나머지 템플릿은 신호를 남기지 않는다) */
        fun forGoalTemplate(template: String): TriggerKind? = when (template) {
            "wedding" -> GOAL_CREATED_WEDDING
            "housing" -> GOAL_CREATED_HOUSING
            else -> null
        }

        /** 고정비 증가 분류 → 트리거. 주거만 제도(월세 세액공제)가 붙는다 — 나머지 분류는 신호를 남기지 않는다 */
        fun forFixedCostCategory(category: String): TriggerKind? = when (category) {
            "housing" -> FIXED_COST_INCREASED_HOUSING
            else -> null
        }
    }
}

object ContentHash {
    fun of(raw: String): String =
        MessageDigest.getInstance("SHA-256").digest(raw.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
}

class TipNotFound(slug: String) : DomainError("TIP_NOT_FOUND", ErrorKind.NOT_FOUND, "Tip not found", mapOf("slug" to slug))

class InvalidContext(raw: String?) :
    DomainError("INVALID_TIP_CONTEXT", ErrorKind.INVALID, "context must be one of home, savings, household", mapOf("context" to raw))

class PolicyParamNotFound(key: String, on: LocalDate) :
    DomainError("POLICY_PARAM_NOT_FOUND", ErrorKind.NOT_FOUND, "Policy parameter not found", mapOf("key" to key, "on" to on.toString()))
