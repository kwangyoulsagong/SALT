package com.salt.household.application

import com.salt.household.domain.EnvelopeStatusOfYear
import com.salt.household.domain.GiftDirection
import com.salt.household.domain.InvalidPersonEntry
import com.salt.household.domain.Occasion
import com.salt.household.domain.OccasionEnvelope
import com.salt.household.domain.OccasionEnvelopes
import com.salt.household.domain.PeopleRules
import com.salt.household.domain.PersonEntries
import com.salt.household.domain.PersonEntry
import com.salt.household.domain.PersonEntryId
import com.salt.household.domain.PersonEntryNotFound
import com.salt.household.domain.PersonTally
import com.salt.household.domain.RevolvingEnded
import com.salt.household.domain.RevolvingId
import com.salt.household.domain.RevolvingLimitReached
import com.salt.household.domain.RevolvingMath
import com.salt.household.domain.RevolvingNotFound
import com.salt.household.domain.RevolvingPlan
import com.salt.household.domain.RevolvingPlans
import com.salt.household.domain.RevolvingProjection
import com.salt.kernel.Money
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Clock
import java.time.LocalDate
import java.time.Year
import java.time.YearMonth

/**
 * 가계부 S1h — 리볼빙 명세서(`SRV-REQ-046` FR-10 남은 몫) · 사람 장부 · 해 경조사 봉투(FR-14).
 * **이벤트 0 · 로그 0** — 둘 다 사용자 금융 · 민감 정보라 서비스 밖으로 나가지 않는다(슬라이스 판단 6).
 * 쓰기 응답은 그 화면 한 장(화면이 다시 묻지 않게).
 */

/** 관리 화면에 싣는 끝낸 명세서 수 */
const val REVOLVING_ENDED_LIMIT = 10

data class RevolvingInput(val label: String?, val balance: Money, val payRatio: Int, val annualRate: BigDecimal, val statementMonth: YearMonth)

open class ListRevolving(private val plans: RevolvingPlans, private val clock: Clock) {
    data class View(
        /** 끝내지 않은 것 — 추정 붙음 */
        val open: List<RevolvingProjection>,
        val ended: List<RevolvingPlan>,
        val limit: Int,
        val today: LocalDate,
    )

    /** 문장 2 */
    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String): View {
        val all = plans.list(userId, REVOLVING_ENDED_LIMIT)
        val (open, ended) = all.partition { it.endedOn == null }
        return View(open.map(RevolvingMath::project), ended, RevolvingPlan.OPEN_MAX, clock.todayKst())
    }
}

/** 적기 — 끝내지 않은 것이 상한이면 409(동시 두 요청이 하나 넘길 수 있다 — 잠그지 않는다, 챌린지와 같다) */
open class AddRevolving(private val plans: RevolvingPlans, private val list: ListRevolving, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, input: RevolvingInput): ListRevolving.View {
        val plan = RevolvingPlan.create(userId, input.label, input.balance, input.payRatio, input.annualRate, input.statementMonth, clock.todayKst(), clock.instant())
        if (plans.countOpen(userId) >= RevolvingPlan.OPEN_MAX) throw RevolvingLimitReached(RevolvingPlan.OPEN_MAX)
        plans.add(plan)
        return list.execute(userId)
    }
}

/** 새 명세서로 고치기 — 끝낸 것은 409 */
open class EditRevolving(private val plans: RevolvingPlans, private val list: ListRevolving, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String, input: RevolvingInput): ListRevolving.View {
        val plan = plans.owned(userId, rawId)
        if (plan.endedOn != null) throw RevolvingEnded(rawId)
        val edited = RevolvingPlan.edited(plan, input.label, input.balance, input.payRatio, input.annualRate, input.statementMonth, clock.todayKst())
        if (plans.update(edited, clock.instant()) == 0) throw RevolvingEnded(rawId)
        return list.execute(userId)
    }
}

/** 다 갚았어요 · 해지했어요 — 다시 눌러도 같다. 그 달부터 띠에서 빠진다 */
open class EndRevolving(private val plans: RevolvingPlans, private val list: ListRevolving, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String): ListRevolving.View {
        val plan = plans.owned(userId, rawId)
        plans.end(plan.id, userId, clock.todayKst())
        return list.execute(userId)
    }
}

private fun RevolvingPlans.owned(userId: String, rawId: String): RevolvingPlan {
    val id = RevolvingId.parse(rawId) ?: throw RevolvingNotFound(rawId)
    return find(id, userId) ?: throw RevolvingNotFound(rawId)
}

// ---------- 사람 장부 ----------

data class PersonEntryInput(
    val person: String,
    val direction: String,
    val amount: Money,
    val occasion: String,
    /** 비우면 오늘 */
    val happenedOn: LocalDate?,
    val memo: String?,
)

/**
 * 사람 장부 화면 — 해 하나(그해 줄 · 해 봉투) 또는 한 사람(모든 해 줄). 사람별 합은 늘(모든 해 — 주고받음은 해를 넘는다).
 * 문장: 사람별 합 1 + 줄 1 + (해면) 봉투 1 · 그해 준 합 1.
 */
open class GetPeople(private val entries: PersonEntries, private val envelopes: OccasionEnvelopes, private val clock: Clock) {
    data class View(
        val year: Year,
        /** 한 사람만 볼 때 그 이름 — 아니면 null */
        val person: String?,
        val people: List<PersonTally>,
        val entries: List<PersonEntry>,
        /** 해 봉투 — 해를 볼 때만, 정하지 않았으면 null */
        val envelope: EnvelopeStatusOfYear?,
        /** 그해 준 합 · 받은 합(해를 볼 때) / 그 사람 합(사람을 볼 때) */
        val gave: Money,
        val received: Money,
        val today: LocalDate,
    )

    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String, rawYear: Int?, rawPerson: String?): View {
        val today = clock.todayKst()
        val year = Year.of(rawYear ?: today.year).also { OccasionEnvelope.checkYear(it, today) }
        val person = rawPerson?.let(PersonEntry::cleanPerson)
        val people = entries.tallies(userId, PeopleRules.PEOPLE_LIMIT)
        val list = if (person != null) entries.ofPerson(userId, person, PeopleRules.ENTRY_LIMIT) else entries.inYear(userId, year, PeopleRules.ENTRY_LIMIT)
        val zero = Money.krw(0)
        val gave = list.filter { it.direction == GiftDirection.GAVE }.fold(zero) { acc, e -> acc + e.amount }
        val received = list.filter { it.direction == GiftDirection.RECEIVED }.fold(zero) { acc, e -> acc + e.amount }
        // 봉투는 그해 준 "전부" — 목록 상한에 잘린 합이 아니라 따로 한 문장
        val envelope = if (person == null) envelopes.find(userId, year)?.let { EnvelopeStatusOfYear(it, entries.gaveInYear(userId, year)) } else null
        return View(year, person, people, PeopleRules.order(list), envelope, gave, received, today)
    }
}

open class AddPersonEntry(private val entries: PersonEntries, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, input: PersonEntryInput): PersonEntry {
        val today = clock.todayKst()
        val entry = PersonEntry.create(userId, input.person, direction(input.direction), input.amount, occasion(input.occasion), input.happenedOn ?: today, input.memo, today, clock.instant())
        entries.add(entry)
        return entry
    }
}

open class EditPersonEntry(private val entries: PersonEntries, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String, input: PersonEntryInput): PersonEntry {
        val today = clock.todayKst()
        val entry = entries.owned(userId, rawId)
        val edited = PersonEntry.edited(entry, input.person, direction(input.direction), input.amount, occasion(input.occasion), input.happenedOn ?: entry.happenedOn, input.memo, today)
        entries.update(edited)
        return edited
    }
}

/** 지우기 — 없어도 성공(다시 눌러도 같다) */
open class DeletePersonEntry(private val entries: PersonEntries) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String) {
        val id = PersonEntryId.parse(rawId) ?: throw PersonEntryNotFound(rawId)
        entries.delete(id, userId)
    }
}

/** 해 봉투 정하기 · 지우기 — 응답은 그해 봉투 상태(지우면 null) */
open class SetOccasionEnvelope(private val entries: PersonEntries, private val envelopes: OccasionEnvelopes, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawYear: Int, amount: Money?): EnvelopeStatusOfYear? {
        val today = clock.todayKst()
        val year = Year.of(rawYear).also { OccasionEnvelope.checkYear(it, today) }
        if (amount == null) {
            envelopes.delete(userId, year)
            return null
        }
        val envelope = OccasionEnvelope.of(year, amount, today)
        envelopes.put(userId, envelope, clock.instant())
        return EnvelopeStatusOfYear(envelope, entries.gaveInYear(userId, year))
    }
}

private fun PersonEntries.owned(userId: String, rawId: String): PersonEntry {
    val id = PersonEntryId.parse(rawId) ?: throw PersonEntryNotFound(rawId)
    return find(id, userId) ?: throw PersonEntryNotFound(rawId)
}

private fun direction(raw: String): GiftDirection = GiftDirection.parse(raw) ?: throw InvalidPersonEntry("PERSON_DIRECTION_INVALID", "direction must be gave or received")

private fun occasion(raw: String): Occasion = Occasion.parse(raw) ?: throw InvalidPersonEntry("PERSON_OCCASION_INVALID", "unknown occasion")
