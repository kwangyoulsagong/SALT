package com.salt.household.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import com.salt.kernel.Money
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/**
 * 내가 고르는 챌린지(`SRV-REQ-046` FR-19 · `DB-REQ-038` FR-10 · FR-11 · FEATURE-013 FR-19 · 20, 가계부 S1d).
 * **사용자가 고르고 언제든 그만둔다 · 실패가 없다.** 상태는 진행(`active`)과 끝(`ended`) 둘뿐이고, 기간이 지나도 "못 했다"를 세지 않는다.
 * "한 날" 스티커는 사용자가 표시한 날만 · **연속 일수를 세지 않는다**(무지출 달력과 같은 원칙 — S1c 판단 6).
 * 아낀 돈은 **실제 적립이 아니다** — 기록이고, 목표에 보태면 저축 서비스가 `saved_by_challenge` 로 따로 적는다(판단 4).
 */
@JvmInline
value class ChallengeId(val value: UUID) {
    override fun toString(): String = value.toString()

    companion object {
        fun parse(raw: String): ChallengeId? = runCatching { ChallengeId(UUID.fromString(raw)) }.getOrNull()
    }
}

/** 고르기 쉽게 내미는 예시 — 키만(이름은 프론트). 이름은 사용자가 고쳐 저장한다 */
enum class ChallengePreset(val key: String) {
    NO_SPEND_WEEKEND("no_spend_weekend"),
    SKIP_COFFEE("skip_coffee"),
    NO_DELIVERY("no_delivery"),
    NO_TAXI("no_taxi"),
}

/** 화면 단계 — 서버가 정한다. 시작 전 · 하는 중 · 끝(기간이 지났든 그만뒀든 같은 "끝" — 둘을 가르면 그만둔 것이 실패처럼 읽힌다) */
enum class ChallengePhase(val key: String) {
    UPCOMING("upcoming"),
    RUNNING("running"),
    ENDED("ended"),
}

data class Challenge(
    val id: ChallengeId,
    val userId: String,
    val title: String,
    val startsOn: LocalDate,
    val endsOn: LocalDate,
    /** 그만둔 날(KST). null 이면 기간 끝까지 */
    val endedOn: LocalDate?,
    val createdAt: Instant,
) {
    /** 기록할 수 있는 마지막 날 — 그만둔 날과 끝 날 중 이른 쪽 */
    val lastDay: LocalDate get() = endedOn?.let { minOf(it, endsOn) } ?: endsOn

    fun phase(today: LocalDate): ChallengePhase = when {
        endedOn != null || today.isAfter(endsOn) -> ChallengePhase.ENDED
        today.isBefore(startsOn) -> ChallengePhase.UPCOMING
        else -> ChallengePhase.RUNNING
    }

    /** 그 날을 "한 날"로 표시하거나 아낀 돈을 적을 수 있나 — 기간 안 · 오늘까지. 기간이 끝난 뒤에도 지난 날은 적을 수 있다(재촉 0) */
    fun accepts(day: LocalDate, today: LocalDate): Boolean = !day.isBefore(startsOn) && !day.isAfter(minOf(lastDay, today))

    fun checkDay(day: LocalDate, today: LocalDate) {
        if (day.isAfter(today)) throw InvalidChallenge("CHALLENGE_DATE_FUTURE", "day is in the future")
        if (!accepts(day, today)) throw InvalidChallenge("CHALLENGE_DATE_OUTSIDE", "day is outside the challenge period")
    }

    companion object {
        const val TITLE_MAX = 40

        /** 기간 상한 — 한 분기. 더 길면 "끝"이 보이지 않아 고르기의 뜻이 흐려진다 */
        const val PERIOD_DAYS_MAX = 92L

        /** 시작은 오늘부터 30일 안 — 지난날 시작은 받지 않는다(기간을 거꾸로 채우는 기록이 되지 않게) */
        const val START_AHEAD_DAYS_MAX = 30L

        /** 동시에 진행 · 예정인 챌린지 상한 — 화면 한 장. 끝난 것은 세지 않는다 */
        const val OPEN_MAX = 5

        fun create(userId: String, title: String, startsOn: LocalDate, endsOn: LocalDate, today: LocalDate, now: Instant): Challenge {
            val name = title.trim()
            if (name.isEmpty()) throw InvalidChallenge("CHALLENGE_TITLE_REQUIRED", "title is required")
            if (name.length > TITLE_MAX) throw InvalidChallenge("CHALLENGE_TITLE_TOO_LONG", "title must be at most $TITLE_MAX characters")
            if (startsOn.isBefore(today)) throw InvalidChallenge("CHALLENGE_START_PAST", "startsOn must be today or later")
            if (startsOn.isAfter(today.plusDays(START_AHEAD_DAYS_MAX))) throw InvalidChallenge("CHALLENGE_START_TOO_FAR", "startsOn is too far ahead")
            if (endsOn.isBefore(startsOn)) throw InvalidChallenge("CHALLENGE_PERIOD_INVALID", "endsOn must not be before startsOn")
            if (endsOn.isAfter(startsOn.plusDays(PERIOD_DAYS_MAX - 1))) throw InvalidChallenge("CHALLENGE_PERIOD_TOO_LONG", "period must be at most $PERIOD_DAYS_MAX days")
            return Challenge(ChallengeId(UUID.randomUUID()), userId, name, startsOn, endsOn, null, now)
        }
    }
}

@JvmInline
value class ChallengeSavingId(val value: UUID) {
    override fun toString(): String = value.toString()

    companion object {
        fun parse(raw: String): ChallengeSavingId? = runCatching { ChallengeSavingId(UUID.fromString(raw)) }.getOrNull()
    }
}

/** 목표에 보탠 기록 — 어느 목표 · 언제. 저축 쪽 적립은 이 아낀 돈 id 를 출처로 한 번만 생긴다(판단 4) */
data class Contribution(val goalId: UUID, val at: Instant)

/** 아낀 돈 한 줄 — 사용자가 적은 "안 쓴 돈". 실제로 옮긴 돈이 아니다 */
data class ChallengeSaving(
    val id: ChallengeSavingId,
    val challengeId: ChallengeId,
    val userId: String,
    val amount: Money,
    val savedOn: LocalDate,
    val note: String?,
    val contribution: Contribution?,
    val createdAt: Instant,
) {
    companion object {
        const val NOTE_MAX = 100

        /** 한 줄 상한 — 오타 막기. 아낀 돈은 하루치 몫이라 지출 상한보다 훨씬 작다 */
        val MAX_AMOUNT: Money = Money.krw(10_000_000L)

        fun create(challenge: Challenge, amount: Money, savedOn: LocalDate, note: String?, today: LocalDate, now: Instant): ChallengeSaving {
            if (amount.isNegative() || amount.isZero()) throw InvalidChallenge("CHALLENGE_SAVING_AMOUNT_INVALID", "amount must be positive")
            if (!Expense.isWholeWon(amount)) throw InvalidChallenge("CHALLENGE_SAVING_AMOUNT_INVALID", "amount must be whole won")
            if (amount > MAX_AMOUNT) throw InvalidChallenge("CHALLENGE_SAVING_AMOUNT_TOO_LARGE", "amount is too large")
            val text = note?.trim()?.ifEmpty { null }
            if (text != null && text.length > NOTE_MAX) throw InvalidChallenge("CHALLENGE_SAVING_NOTE_TOO_LONG", "note must be at most $NOTE_MAX characters")
            challenge.checkDay(savedOn, today)
            return ChallengeSaving(ChallengeSavingId(UUID.randomUUID()), challenge.id, challenge.userId, amount, savedOn, text, null, now)
        }
    }
}

/** 챌린지 하나의 화면 몫 — 표시한 날 · 아낀 돈. 합계는 도메인이 낸다(프론트 더하기 0) */
data class ChallengeSummary(
    val challenge: Challenge,
    val phase: ChallengePhase,
    /** 표시한 날 — 날짜 순. 개수만 센다(연속 0) */
    val days: List<LocalDate>,
    val savings: List<ChallengeSaving>,
    val savedTotal: Money,
    /** 그중 목표에 보탠 합 */
    val contributedTotal: Money,
    /** 오늘을 "한 날"로 표시할 수 있나 — 진행 중이고 오늘이 기간 안 */
    val todayMarkable: Boolean,
) {
    companion object {
        fun of(challenge: Challenge, days: List<LocalDate>, savings: List<ChallengeSaving>, today: LocalDate): ChallengeSummary {
            val zero = Money.krw(0)
            return ChallengeSummary(
                challenge = challenge,
                phase = challenge.phase(today),
                days = days.sorted(),
                savings = savings.sortedWith(compareByDescending<ChallengeSaving> { it.savedOn }.thenByDescending { it.createdAt }),
                savedTotal = savings.fold(zero) { acc, s -> acc + s.amount },
                contributedTotal = savings.filter { it.contribution != null }.fold(zero) { acc, s -> acc + s.amount },
                todayMarkable = challenge.accepts(today, today),
            )
        }

        /** 목록 순서 — 진행 중 · 시작 전 먼저(시작일 순), 끝난 것은 뒤(최근 끝난 순) */
        fun order(items: List<ChallengeSummary>): List<ChallengeSummary> {
            val (open, ended) = items.partition { it.phase != ChallengePhase.ENDED }
            return open.sortedWith(compareBy<ChallengeSummary> { it.challenge.startsOn }.thenBy { it.challenge.createdAt }) +
                ended.sortedWith(compareByDescending<ChallengeSummary> { it.challenge.lastDay }.thenByDescending { it.challenge.createdAt })
        }
    }
}

interface Challenges {
    fun add(challenge: Challenge)

    /** 본인 것만 */
    fun find(id: ChallengeId, userId: String): Challenge?

    /** 최근 만든 순 [limit] 개 — 목록 화면 */
    fun recent(userId: String, limit: Int): List<Challenge>

    /** 아직 끝나지 않은 것(그만두지 않았고 끝 날이 오늘 이후) 수 — 상한 검사 */
    fun countOpen(userId: String, today: LocalDate): Int

    /** 그만둔 날을 적는다 — 이미 그만뒀으면 0행(멱등) */
    fun end(id: ChallengeId, userId: String, on: LocalDate): Int

    /** "한 날" 표시 — 있으면 아무것도 쓰지 않는다 */
    fun markDay(id: ChallengeId, userId: String, day: LocalDate, now: Instant)

    fun unmarkDay(id: ChallengeId, userId: String, day: LocalDate): Int

    /** [ids] 챌린지의 표시한 날 — 한 문장 */
    fun daysOf(ids: List<ChallengeId>): Map<ChallengeId, List<LocalDate>>

    /** 그 달에 "한 날"로 표시된 날짜(챌린지 무엇이든) — 달력 스티커 */
    fun markedInMonth(userId: String, month: java.time.YearMonth): Set<LocalDate>
}

interface ChallengeSavings {
    fun add(saving: ChallengeSaving)

    fun find(id: ChallengeSavingId, userId: String): ChallengeSaving?

    /** [ids] 챌린지의 아낀 돈 — 한 문장 */
    fun of(ids: List<ChallengeId>): Map<ChallengeId, List<ChallengeSaving>>

    /** 아직 보태지 않은 것만 지운다 — 보탠 것 · 남의 것 · 없는 것은 0 */
    fun deleteUncontributed(id: ChallengeSavingId, userId: String): Int

    /** 보탰다고 적는다 — 아직 비어 있을 때만(조건부 UPDATE). 0 이면 이미 적혀 있다 */
    fun markContributed(id: ChallengeSavingId, userId: String, contribution: Contribution): Int
}

class InvalidChallenge(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)

class ChallengeNotFound(id: String) : DomainError("CHALLENGE_NOT_FOUND", ErrorKind.NOT_FOUND, "Challenge not found", mapOf("challengeId" to id))

class ChallengeSavingNotFound(id: String) :
    DomainError("CHALLENGE_SAVING_NOT_FOUND", ErrorKind.NOT_FOUND, "Challenge saving not found", mapOf("savingId" to id))

class ChallengeLimitReached(limit: Int) :
    DomainError("CHALLENGE_LIMIT_REACHED", ErrorKind.CONFLICT, "Too many open challenges", mapOf("limit" to limit))

/** 이미 다른 목표에 보탠 아낀 돈 · 보탠 뒤 지우기 */
class ChallengeSavingContributed(id: String) :
    DomainError("CHALLENGE_SAVING_CONTRIBUTED", ErrorKind.CONFLICT, "Saving is already added to a goal", mapOf("savingId" to id))
