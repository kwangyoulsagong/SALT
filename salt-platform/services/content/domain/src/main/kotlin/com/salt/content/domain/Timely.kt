package com.salt.content.domain

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.ChronoUnit

/**
 * 사용자 신호 — 다른 서비스 이벤트에서 온 사실 하나(`savings.GoalCreated` 결혼 · 주거 · `savings.GoalReached`).
 * 금액 · 목표 이름은 담지 않는다 — 어떤 트리거가 언제 생겼는지만(`DB-REQ-039` FR-8 `user_signal`).
 */
data class UserSignal(val userId: String, val kind: TriggerKind, val occurredAt: Instant)

/** 트리거 규칙(`trigger_rule`) — 원문 파일의 `triggers` · `contexts` 에서 만든다. 파일에서 빠진 규칙은 꺼진다. */
data class TriggerRule(val tipSlug: String, val kind: TriggerKind, val contexts: Set<TipContext>, val order: Int)

/**
 * 때맞춘 팁 고르기(`SRV-REQ-047` FR-4) — 화면 하나에 **0~1건**. 불변식:
 * 1. 닫은 글은 다시 안 뜬다(사용자 · 글 단위, 영구)
 * 2. 확인 필요(유효기한 지남) 글은 안 뜬다(FR-2)
 * 3. 이벤트 트리거는 신호가 [SIGNAL_DAYS] 안일 때만, 달 트리거는 그달(KST)에만
 * 4. 같은 재료면 늘 같은 답 — 이벤트 트리거(최근 신호 먼저) → 달 트리거, 같으면 원문 순서([TriggerRule.order])
 */
object TimelyTipPicker {
    const val SIGNAL_DAYS = 90L

    data class Pick(val tip: Tip, val trigger: TriggerKind)

    fun pick(
        context: TipContext,
        today: LocalDate,
        now: Instant,
        rules: List<TriggerRule>,
        tips: Map<String, Tip>,
        signals: List<UserSignal>,
        dismissed: Set<String>,
    ): Pick? {
        val latestSignal = signals
            .filter { !it.occurredAt.isAfter(now) && ChronoUnit.DAYS.between(it.occurredAt, now) < SIGNAL_DAYS }
            .groupBy { it.kind }
            .mapValues { (_, list) -> list.maxOf { it.occurredAt } }

        return rules.asSequence()
            .filter { context in it.contexts && it.tipSlug !in dismissed }
            .mapNotNull { rule ->
                val tip = tips[rule.tipSlug]?.takeIf { it.statusOn(today) == TipStatus.PUBLISHED } ?: return@mapNotNull null
                val signalAt = if (rule.kind.isEvent) latestSignal[rule.kind] ?: return@mapNotNull null else null
                if (!rule.kind.isEvent && rule.kind.month != today.monthValue) return@mapNotNull null
                Triple(rule, tip, signalAt)
            }
            .sortedWith(
                compareBy<Triple<TriggerRule, Tip, Instant?>> { if (it.third != null) 0 else 1 }
                    .thenByDescending { it.third }
                    .thenBy { it.first.order },
            )
            .firstOrNull()
            ?.let { Pick(it.second, it.first.kind) }
    }
}

/**
 * 제도 파라미터(`DB-REQ-039` FR-3) — 키 하나에 유효 구간 여럿. 같은 키의 구간은 겹치지 않는다(DB 트리거 + [PolicyParamSet.validate]).
 * 저축 · 가계부 계산이 읽는다(조회 API · `content.PolicyParamChanged`). 금액이면 [value], 말이면 [text].
 */
data class PolicyParam(
    val key: String,
    val validFrom: LocalDate,
    /** 마지막 유효일(포함). null 이면 끝이 정해지지 않았다 */
    val validTo: LocalDate?,
    val value: BigDecimal?,
    val text: String?,
    val unit: String,
    val sourceUrl: String,
    val asOf: LocalDate,
) {
    fun covers(day: LocalDate): Boolean = !day.isBefore(validFrom) && (validTo == null || !day.isAfter(validTo))

    fun overlaps(other: PolicyParam): Boolean =
        key == other.key &&
            (other.validTo == null || !validFrom.isAfter(other.validTo)) &&
            (validTo == null || !other.validFrom.isAfter(validTo))

    /** 같은 키 · 시작일이면 같은 줄 — 값 · 끝 · 출처가 달라졌는가 */
    fun sameContent(other: PolicyParam): Boolean {
        // 금액은 compareTo 로 — 2.0 과 2.00 은 같은 값이다(`Money` 와 같은 규칙)
        val sameValue = when {
            value == null || other.value == null -> value == null && other.value == null
            else -> value.compareTo(other.value) == 0
        }
        return sameValue && validTo == other.validTo && text == other.text && unit == other.unit && sourceUrl == other.sourceUrl && asOf == other.asOf
    }
}

object PolicyParamSet {
    private val KEY = Regex("[a-z][a-z0-9_]*")

    /** 원문 표 검사 — 문제가 있으면 목록. 비면 통과 */
    fun validate(params: List<PolicyParam>): List<String> = buildList {
        params.forEach { p ->
            if (!KEY.matches(p.key)) add("${p.key}: 키는 소문자 · 숫자 · 밑줄")
            if ((p.value == null) == (p.text == null)) add("${p.key}@${p.validFrom}: value 와 text 중 하나만")
            if (p.validTo != null && p.validTo.isBefore(p.validFrom)) add("${p.key}@${p.validFrom}: valid_to 가 valid_from 보다 앞선다")
            if (!LegalLine.officialSource(p.sourceUrl)) add("${p.key}@${p.validFrom}: 공식 출처가 아니다")
        }
        params.groupBy { it.key }.forEach { (key, list) ->
            list.forEachIndexed { i, a -> list.drop(i + 1).forEach { b -> if (a.overlaps(b)) add("$key: ${a.validFrom} · ${b.validFrom} 구간이 겹친다") } }
        }
    }
}
