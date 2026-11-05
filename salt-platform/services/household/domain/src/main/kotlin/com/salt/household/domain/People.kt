package com.salt.household.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import com.salt.kernel.Money
import java.time.Instant
import java.time.LocalDate
import java.time.Year
import java.util.UUID

/**
 * 사람 장부 · 비정기 경조사 봉투(`SRV-REQ-046` FR-14 · `DB-REQ-038` FR-9 · FEATURE-013 FR-14, 가계부 S1h).
 *
 * 누구에게 · 어떤 일로 · 얼마를 주고받았는지 적어 두는 **기억 장부**다. 갚아야 할 돈 · 빚 · "덜 줬다" 같은 판단 문구가 없다 —
 * 사람별 준 합 · 받은 합 · 마지막 날만(슬라이스 판단 4). 상대 이름은 **민감 정보** — 이벤트 · 로그 · 이야기 카드에 나가지 않는다.
 * 경조사는 달마다 오지 않아 달 봉투 대신 **해 봉투**(사용자가 정한 한 해 금액 − 그해 준 합, 넘으면 회색 음수 — 막지 않는다).
 * 지출 기록과 따로다 — 준 돈을 지출로도 적을지는 사용자가 바로 적기에서 고른다(판단 5 — 자동으로 지출을 만들지 않는다).
 */
@JvmInline
value class PersonEntryId(val value: UUID) {
    override fun toString(): String = value.toString()

    companion object {
        fun parse(raw: String): PersonEntryId? = runCatching { PersonEntryId(UUID.fromString(raw)) }.getOrNull()
    }
}

enum class GiftDirection(val key: String) {
    GAVE("gave"),
    RECEIVED("received"),
    ;

    companion object {
        fun parse(raw: String): GiftDirection? = entries.firstOrNull { it.key == raw }
    }
}

/** 어떤 일 — 키만(이름은 프론트) */
enum class Occasion(val key: String) {
    WEDDING("wedding"),
    FUNERAL("funeral"),
    FIRST_BIRTHDAY("first_birthday"),
    BIRTHDAY("birthday"),
    HOUSEWARMING("housewarming"),
    HOLIDAY("holiday"),
    OTHER("other"),
    ;

    companion object {
        fun parse(raw: String): Occasion? = entries.firstOrNull { it.key == raw }
    }
}

data class PersonEntry(
    val id: PersonEntryId,
    val userId: String,
    val person: String,
    val direction: GiftDirection,
    val amount: Money,
    val occasion: Occasion,
    val happenedOn: LocalDate,
    val memo: String?,
    val createdAt: Instant,
) {
    companion object {
        /** 이름 칸 — 사람 이름 · "회사 김 과장" 정도 */
        const val PERSON_MAX = 20
        const val MEMO_MAX = 100

        /** 한 줄 상한 — 오타 막기 */
        val MAX_AMOUNT: Money = Money.krw(100_000_000L)

        /** 적을 수 있는 가장 이른 날 — 오래된 기억도 옮겨 적게 넉넉히 */
        val EARLIEST: LocalDate = LocalDate.of(2000, 1, 1)

        fun create(userId: String, person: String, direction: GiftDirection, amount: Money, occasion: Occasion, happenedOn: LocalDate, memo: String?, today: LocalDate, now: Instant): PersonEntry {
            val v = validated(person, amount, happenedOn, memo, today)
            return PersonEntry(PersonEntryId(UUID.randomUUID()), userId, v.person, direction, amount, occasion, happenedOn, v.memo, now)
        }

        fun edited(entry: PersonEntry, person: String, direction: GiftDirection, amount: Money, occasion: Occasion, happenedOn: LocalDate, memo: String?, today: LocalDate): PersonEntry {
            val v = validated(person, amount, happenedOn, memo, today)
            return entry.copy(person = v.person, direction = direction, amount = amount, occasion = occasion, happenedOn = happenedOn, memo = v.memo)
        }

        /** 이름 맞추기 — 앞뒤 · 안쪽 연속 공백을 하나로. 같은 사람 묶기는 이 값 그대로(대소문자 · 띄어쓰기 추측 0) */
        fun cleanPerson(raw: String): String {
            val name = raw.trim().replace(Regex("\\s+"), " ")
            if (name.isEmpty()) throw InvalidPersonEntry("PERSON_NAME_REQUIRED", "person is required")
            if (name.length > PERSON_MAX) throw InvalidPersonEntry("PERSON_NAME_TOO_LONG", "person must be at most $PERSON_MAX chars")
            if (name.any { it.isISOControl() }) throw InvalidPersonEntry("PERSON_NAME_INVALID", "person has control characters")
            return name
        }

        private data class Valid(val person: String, val memo: String?)

        private fun validated(person: String, amount: Money, happenedOn: LocalDate, memo: String?, today: LocalDate): Valid {
            val name = cleanPerson(person)
            if (amount.isNegative() || amount.isZero() || !Expense.isWholeWon(amount)) throw InvalidPersonEntry("PERSON_AMOUNT_INVALID", "amount must be a positive whole won")
            if (amount > MAX_AMOUNT) throw InvalidPersonEntry("PERSON_AMOUNT_TOO_LARGE", "amount is too large")
            if (happenedOn.isAfter(today)) throw InvalidPersonEntry("PERSON_DATE_FUTURE", "happenedOn is in the future")
            if (happenedOn.isBefore(EARLIEST)) throw InvalidPersonEntry("PERSON_DATE_TOO_OLD", "happenedOn is too old")
            val text = memo?.trim()?.ifEmpty { null }
            if (text != null && text.length > MEMO_MAX) throw InvalidPersonEntry("PERSON_MEMO_TOO_LONG", "memo must be at most $MEMO_MAX chars")
            return Valid(name, text)
        }
    }
}

/** 사람 한 명 몫 — 합은 서버가(프론트 더하기 0). 차액 · "갚을 돈" 칸이 없다 */
data class PersonTally(val person: String, val gave: Money, val received: Money, val count: Int, val lastOn: LocalDate)

/** 해 봉투 — 그해 준 합(사람 장부 기준). [remaining] 은 음수 가능(차단 · 경고 0) */
data class OccasionEnvelope(val year: Year, val amount: Money) {
    companion object {
        val MAX_AMOUNT: Money = Money.krw(1_000_000_000L)

        fun of(year: Year, amount: Money, today: LocalDate): OccasionEnvelope {
            if (amount.isNegative() || amount.isZero() || !Expense.isWholeWon(amount)) throw InvalidPersonEntry("ENVELOPE_AMOUNT_INVALID", "amount must be a positive whole won")
            if (amount > MAX_AMOUNT) throw InvalidPersonEntry("ENVELOPE_AMOUNT_TOO_LARGE", "amount is too large")
            checkYear(year, today)
            return OccasionEnvelope(year, amount)
        }

        /** 봉투 · 목록을 볼 수 있는 해 — 2000 ~ 내년(연말에 다음 해 봉투를 미리 정할 수 있게) */
        fun checkYear(year: Year, today: LocalDate) {
            if (year.value < PersonEntry.EARLIEST.year || year.value > today.year + 1) throw InvalidPersonEntry("PERSON_YEAR_INVALID", "year is out of range")
        }
    }
}

data class EnvelopeStatusOfYear(val envelope: OccasionEnvelope, val gave: Money) {
    val remaining: Money get() = envelope.amount - gave
}

object PeopleRules {
    /** 사람 목록 상한 — 화면 한 장(최근 주고받은 순) */
    const val PEOPLE_LIMIT = 200

    /** 한 해 · 한 사람 목록 상한 */
    const val ENTRY_LIMIT = 300

    fun order(entries: List<PersonEntry>): List<PersonEntry> =
        entries.sortedWith(compareByDescending<PersonEntry> { it.happenedOn }.thenByDescending { it.createdAt })
}

interface PersonEntries {
    fun add(entry: PersonEntry)

    fun find(id: PersonEntryId, userId: String): PersonEntry?

    fun update(entry: PersonEntry): Int

    fun delete(id: PersonEntryId, userId: String): Int

    /** 그해(happened_on) 줄 — 최신순 [limit] 개 */
    fun inYear(userId: String, year: Year, limit: Int): List<PersonEntry>

    /** 한 사람의 줄(모든 해) — 최신순 [limit] 개 */
    fun ofPerson(userId: String, person: String, limit: Int): List<PersonEntry>

    /** 사람별 합(모든 해) — `GROUP BY` 한 문장. 마지막 날 최신순 [limit] 명 */
    fun tallies(userId: String, limit: Int): List<PersonTally>

    /** 그해 준 합 — 봉투 */
    fun gaveInYear(userId: String, year: Year): Money
}

interface OccasionEnvelopes {
    fun find(userId: String, year: Year): OccasionEnvelope?

    /** 그해 봉투 정하기 — 있으면 바꾼다(`ON CONFLICT DO UPDATE`) */
    fun put(userId: String, envelope: OccasionEnvelope, now: Instant)

    fun delete(userId: String, year: Year): Int
}

class InvalidPersonEntry(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)

class PersonEntryNotFound(id: String) : DomainError("PERSON_ENTRY_NOT_FOUND", ErrorKind.NOT_FOUND, "Person entry not found", mapOf("entryId" to id))
