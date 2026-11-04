package com.salt.household.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth

/**
 * 감정 태그 + 다음 날 만족도 거울(`SRV-REQ-046` FR-13 · `DB-REQ-038` FR-6, 가계부 S1c 판단 2 · 3).
 * **측정 기능일 뿐이다** — 효과 연구 미확인(기획 원문). 점수 · 평균 · 평가 문구 0, 분포(건수)만 돌려준다.
 * 감정 · 만족은 민감 정보(`FEATURE-015` FR-5) — 이벤트 · 로그에 싣지 않는다.
 */
enum class Emotion(val key: String) {
    STRESS("stress"),
    REWARD("reward"),
    BOREDOM("boredom"),
    ;

    companion object {
        fun fromKey(key: String): Emotion? = entries.firstOrNull { it.key == key }
    }
}

data class ExpenseFeeling(
    val expenseId: ExpenseId,
    val userId: String,
    val emotion: Emotion,
    /** 산 직후 만족(1~5) — 비워도 된다 */
    val feltNow: Int?,
    /** 태그를 단 날(KST) — 다음 날부터 묻는다(지난 지출에 오늘 달아도 내일 묻는다) */
    val taggedOn: LocalDate,
    /** 다음 날 만족(1~5). [nextDecidedAt] 이 있는데 null 이면 "넘김" */
    val feltNext: Int?,
    val nextDecidedAt: Instant?,
) {
    val nextDecided: Boolean get() = nextDecidedAt != null
}

/** 다음 날 묻기 한 줄 — 지출 요약을 같이 읽는다(한 문장) */
data class FeelingAsk(val feeling: ExpenseFeeling, val amount: com.salt.kernel.Money, val spentOn: LocalDate, val category: Category, val merchant: String?)

object FeelingRules {
    const val FELT_MIN = 1
    const val FELT_MAX = 5

    /** 태그 단 다음 날부터 이만큼 날 동안 묻는다 — 지나면 조용히 묻지 않는다(재촉 0) */
    const val ASK_DAYS = 7L

    fun checkFelt(value: Int?, code: String) {
        if (value != null && value !in FELT_MIN..FELT_MAX) throw InvalidFeeling(code, "felt must be $FELT_MIN..$FELT_MAX")
    }

    /** 오늘 묻는가 — 태그 단 날 다음 날 ~ [ASK_DAYS] 일, 아직 답하지도 넘기지도 않음 */
    fun askable(f: ExpenseFeeling, today: LocalDate): Boolean =
        !f.nextDecided && f.taggedOn.isBefore(today) && !f.taggedOn.isBefore(today.minusDays(ASK_DAYS))

    /** 묻는 창의 태그 날짜 범위 `[from, to]` — 쿼리가 같은 경계를 쓴다(규칙 한 곳) */
    fun askWindow(today: LocalDate): Pair<LocalDate, LocalDate> = today.minusDays(ASK_DAYS) to today.minusDays(1)
}

/** 감정 하나의 분포 — 산 직후 · 다음 날 만족 1~5 건수(인덱스 0 = 1점). 답 안 한 건은 [count] 에만 */
data class EmotionMirror(val emotion: Emotion, val count: Int, val feltNow: List<Int>, val feltNext: List<Int>)

object FeelingMirror {
    /**
     * 그 달(지출 날짜) 태그의 분포. 태그가 하나도 없는 감정은 빠진다. 순서는 감정 표 순서(고정 — 많이 쓴 순으로 줄 세우지 않는다).
     */
    fun of(feelings: List<ExpenseFeeling>): List<EmotionMirror> =
        Emotion.entries.mapNotNull { emotion ->
            val rows = feelings.filter { it.emotion == emotion }
            if (rows.isEmpty()) return@mapNotNull null
            EmotionMirror(emotion, rows.size, histogram(rows.mapNotNull { it.feltNow }), histogram(rows.mapNotNull { it.feltNext }))
        }

    private fun histogram(values: List<Int>): List<Int> = (FeelingRules.FELT_MIN..FeelingRules.FELT_MAX).map { v -> values.count { it == v } }
}

interface Feelings {
    /**
     * 붙이거나 바꾼다 — **본인 지출일 때만**(지출 표에서 골라 넣는 한 문장 `INSERT … SELECT … ON CONFLICT`). 이미 있으면 감정 · 산 직후만 바꾸고
     * 태그 날짜 · 다음 날 답은 그대로. 바꾼 행 수(남의 것 · 없는 지출이면 0)
     */
    fun tag(feeling: ExpenseFeeling, now: Instant): Int

    /** 본인 지출의 태그를 지운다 — 지운 행 수 */
    fun delete(expenseId: ExpenseId, userId: String): Int

    fun find(expenseId: ExpenseId, userId: String): ExpenseFeeling?

    /** 다음 날 답 — 아직 정하지 않은 행만(한 문장 조건부 UPDATE). 바꾼 행 수 */
    fun decideNext(expenseId: ExpenseId, userId: String, felt: Int?, now: Instant): Int

    /** 그 달 지출(spent_on)의 태그 전부 — 목록 표시 · 거울이 같이 쓴다(한 문장) */
    fun inMonth(userId: String, month: YearMonth): List<ExpenseFeeling>

    /** 태그 날짜가 `[from, to]` 이고 아직 정하지 않은 것 — 지출 요약과 같이(한 문장) */
    fun pendingAsks(userId: String, from: LocalDate, to: LocalDate): List<FeelingAsk>
}

class InvalidFeeling(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)

class FeelingNotFound(id: String) : DomainError("FEELING_NOT_FOUND", ErrorKind.NOT_FOUND, "Feeling not found", mapOf("expenseId" to id))

class FeelingDecided(id: String) : DomainError("FEELING_ALREADY_DECIDED", ErrorKind.CONFLICT, "Next-day feeling already decided", mapOf("expenseId" to id))
