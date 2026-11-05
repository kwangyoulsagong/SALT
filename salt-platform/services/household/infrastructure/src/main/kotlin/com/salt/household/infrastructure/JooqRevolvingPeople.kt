package com.salt.household.infrastructure

import com.salt.household.domain.GiftDirection
import com.salt.household.domain.Occasion
import com.salt.household.domain.OccasionEnvelope
import com.salt.household.domain.OccasionEnvelopes
import com.salt.household.domain.PersonEntries
import com.salt.household.domain.PersonEntry
import com.salt.household.domain.PersonEntryId
import com.salt.household.domain.PersonTally
import com.salt.household.domain.RevolvingId
import com.salt.household.domain.RevolvingPlan
import com.salt.household.domain.RevolvingPlans
import com.salt.household.infrastructure.jooq.Tables.OCCASION_ENVELOPE
import com.salt.household.infrastructure.jooq.Tables.PERSON_ENTRY
import com.salt.household.infrastructure.jooq.Tables.REVOLVING_PLAN
import com.salt.household.infrastructure.jooq.tables.records.PersonEntryRecord
import com.salt.household.infrastructure.jooq.tables.records.RevolvingPlanRecord
import com.salt.kernel.Money
import org.jooq.DSLContext
import org.jooq.impl.DSL
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.Year
import java.time.YearMonth

/**
 * 리볼빙 명세서(가계부 S1h — `SRV-REQ-046` FR-10 · `DB-REQ-038` FR-5). 청구 · 수수료는 저장하지 않는다(도메인 `RevolvingMath`).
 * 고치기 · 끝내기는 끝내지 않은 행만(조건부 UPDATE — 0행이면 부르는 쪽이 안다).
 */
class JooqRevolvingPlans(private val dsl: DSLContext) : RevolvingPlans {
    override fun add(plan: RevolvingPlan) {
        dsl.insertInto(REVOLVING_PLAN)
            .set(REVOLVING_PLAN.ID, plan.id.value)
            .set(REVOLVING_PLAN.USER_ID, plan.userId)
            .set(REVOLVING_PLAN.LABEL, plan.label)
            .set(REVOLVING_PLAN.BALANCE, plan.balance.toDecimal())
            .set(REVOLVING_PLAN.PAY_RATIO, plan.payRatio.toShort())
            .set(REVOLVING_PLAN.ANNUAL_RATE, plan.annualRate)
            .set(REVOLVING_PLAN.STATEMENT_MONTH, plan.statementMonth.atDay(1))
            .set(REVOLVING_PLAN.CREATED_AT, plan.createdAt.utc())
            .set(REVOLVING_PLAN.UPDATED_AT, plan.createdAt.utc())
            .execute()
    }

    override fun find(id: RevolvingId, userId: String): RevolvingPlan? =
        dsl.selectFrom(REVOLVING_PLAN).where(REVOLVING_PLAN.ID.eq(id.value).and(REVOLVING_PLAN.USER_ID.eq(userId))).fetchOne(::toPlan)

    /** 끝내지 않은 것 전부(만든 순) + 끝낸 것 최근 [endedLimit] 개 — 문장 2 */
    override fun list(userId: String, endedLimit: Int): List<RevolvingPlan> =
        dsl.selectFrom(REVOLVING_PLAN).where(REVOLVING_PLAN.USER_ID.eq(userId).and(REVOLVING_PLAN.ENDED_ON.isNull))
            .orderBy(REVOLVING_PLAN.CREATED_AT.asc())
            .fetch(::toPlan) +
            dsl.selectFrom(REVOLVING_PLAN).where(REVOLVING_PLAN.USER_ID.eq(userId).and(REVOLVING_PLAN.ENDED_ON.isNotNull))
                .orderBy(REVOLVING_PLAN.ENDED_ON.desc(), REVOLVING_PLAN.CREATED_AT.desc())
                .limit(endedLimit)
                .fetch(::toPlan)

    override fun forMonth(userId: String, month: YearMonth): List<RevolvingPlan> =
        dsl.selectFrom(REVOLVING_PLAN)
            .where(REVOLVING_PLAN.USER_ID.eq(userId))
            .and(REVOLVING_PLAN.STATEMENT_MONTH.le(month.atDay(1)))
            .and(REVOLVING_PLAN.ENDED_ON.isNull.or(REVOLVING_PLAN.ENDED_ON.gt(month.atEndOfMonth())))
            .fetch(::toPlan)

    override fun countOpen(userId: String): Int =
        dsl.fetchCount(REVOLVING_PLAN, REVOLVING_PLAN.USER_ID.eq(userId).and(REVOLVING_PLAN.ENDED_ON.isNull))

    override fun update(plan: RevolvingPlan, now: Instant): Int =
        dsl.update(REVOLVING_PLAN)
            .set(REVOLVING_PLAN.LABEL, plan.label)
            .set(REVOLVING_PLAN.BALANCE, plan.balance.toDecimal())
            .set(REVOLVING_PLAN.PAY_RATIO, plan.payRatio.toShort())
            .set(REVOLVING_PLAN.ANNUAL_RATE, plan.annualRate)
            .set(REVOLVING_PLAN.STATEMENT_MONTH, plan.statementMonth.atDay(1))
            .set(REVOLVING_PLAN.UPDATED_AT, now.utc())
            .where(REVOLVING_PLAN.ID.eq(plan.id.value).and(REVOLVING_PLAN.USER_ID.eq(plan.userId)).and(REVOLVING_PLAN.ENDED_ON.isNull))
            .execute()

    override fun end(id: RevolvingId, userId: String, on: LocalDate): Int =
        dsl.update(REVOLVING_PLAN)
            .set(REVOLVING_PLAN.ENDED_ON, on)
            .where(REVOLVING_PLAN.ID.eq(id.value).and(REVOLVING_PLAN.USER_ID.eq(userId)).and(REVOLVING_PLAN.ENDED_ON.isNull))
            .execute()

    private fun toPlan(r: RevolvingPlanRecord) = RevolvingPlan(
        id = RevolvingId(r.id),
        userId = r.userId,
        label = r.label,
        balance = Money.krw(r.balance),
        payRatio = r.payRatio.toInt(),
        annualRate = r.annualRate.setScale(2),
        statementMonth = YearMonth.from(r.statementMonth),
        endedOn = r.endedOn,
        createdAt = r.createdAt.toInstant(),
    )
}

/**
 * 사람 장부(가계부 S1h — `SRV-REQ-046` FR-14 · `DB-REQ-038` FR-9). 상대 이름은 민감 정보 — 여기서 로그를 남기지 않는다.
 * 사람별 합은 `GROUP BY` 한 문장(사람마다 묻지 않는다).
 */
class JooqPersonEntries(private val dsl: DSLContext) : PersonEntries {
    override fun add(entry: PersonEntry) {
        dsl.insertInto(PERSON_ENTRY)
            .set(PERSON_ENTRY.ID, entry.id.value)
            .set(PERSON_ENTRY.USER_ID, entry.userId)
            .set(PERSON_ENTRY.PERSON, entry.person)
            .set(PERSON_ENTRY.DIRECTION, entry.direction.key)
            .set(PERSON_ENTRY.AMOUNT, entry.amount.toDecimal())
            .set(PERSON_ENTRY.OCCASION, entry.occasion.key)
            .set(PERSON_ENTRY.HAPPENED_ON, entry.happenedOn)
            .set(PERSON_ENTRY.MEMO, entry.memo)
            .set(PERSON_ENTRY.CREATED_AT, entry.createdAt.utc())
            .execute()
    }

    override fun find(id: PersonEntryId, userId: String): PersonEntry? =
        dsl.selectFrom(PERSON_ENTRY).where(PERSON_ENTRY.ID.eq(id.value).and(PERSON_ENTRY.USER_ID.eq(userId))).fetchOne(::toEntry)

    override fun update(entry: PersonEntry): Int =
        dsl.update(PERSON_ENTRY)
            .set(PERSON_ENTRY.PERSON, entry.person)
            .set(PERSON_ENTRY.DIRECTION, entry.direction.key)
            .set(PERSON_ENTRY.AMOUNT, entry.amount.toDecimal())
            .set(PERSON_ENTRY.OCCASION, entry.occasion.key)
            .set(PERSON_ENTRY.HAPPENED_ON, entry.happenedOn)
            .set(PERSON_ENTRY.MEMO, entry.memo)
            .where(PERSON_ENTRY.ID.eq(entry.id.value).and(PERSON_ENTRY.USER_ID.eq(entry.userId)))
            .execute()

    override fun delete(id: PersonEntryId, userId: String): Int =
        dsl.deleteFrom(PERSON_ENTRY).where(PERSON_ENTRY.ID.eq(id.value).and(PERSON_ENTRY.USER_ID.eq(userId))).execute()

    override fun inYear(userId: String, year: Year, limit: Int): List<PersonEntry> =
        dsl.selectFrom(PERSON_ENTRY)
            .where(PERSON_ENTRY.USER_ID.eq(userId).and(PERSON_ENTRY.HAPPENED_ON.between(year.atDay(1), year.atMonth(12).atEndOfMonth())))
            .orderBy(PERSON_ENTRY.HAPPENED_ON.desc(), PERSON_ENTRY.CREATED_AT.desc())
            .limit(limit)
            .fetch(::toEntry)

    override fun ofPerson(userId: String, person: String, limit: Int): List<PersonEntry> =
        dsl.selectFrom(PERSON_ENTRY)
            .where(PERSON_ENTRY.USER_ID.eq(userId).and(PERSON_ENTRY.PERSON.eq(person)))
            .orderBy(PERSON_ENTRY.HAPPENED_ON.desc(), PERSON_ENTRY.CREATED_AT.desc())
            .limit(limit)
            .fetch(::toEntry)

    override fun tallies(userId: String, limit: Int): List<PersonTally> {
        val gave = DSL.coalesce(DSL.sum(PERSON_ENTRY.AMOUNT).filterWhere(PERSON_ENTRY.DIRECTION.eq(GiftDirection.GAVE.key)), BigDecimal.ZERO)
        val received = DSL.coalesce(DSL.sum(PERSON_ENTRY.AMOUNT).filterWhere(PERSON_ENTRY.DIRECTION.eq(GiftDirection.RECEIVED.key)), BigDecimal.ZERO)
        val last = DSL.max(PERSON_ENTRY.HAPPENED_ON)
        return dsl.select(PERSON_ENTRY.PERSON, gave, received, DSL.count(), last)
            .from(PERSON_ENTRY)
            .where(PERSON_ENTRY.USER_ID.eq(userId))
            .groupBy(PERSON_ENTRY.PERSON)
            .orderBy(last.desc(), PERSON_ENTRY.PERSON.asc())
            .limit(limit)
            .fetch { r -> PersonTally(r.value1(), Money.krw(r.value2()), Money.krw(r.value3()), r.value4(), r.value5()) }
    }

    override fun gaveInYear(userId: String, year: Year): Money =
        dsl.select(DSL.coalesce(DSL.sum(PERSON_ENTRY.AMOUNT), BigDecimal.ZERO))
            .from(PERSON_ENTRY)
            .where(PERSON_ENTRY.USER_ID.eq(userId))
            .and(PERSON_ENTRY.DIRECTION.eq(GiftDirection.GAVE.key))
            .and(PERSON_ENTRY.HAPPENED_ON.between(year.atDay(1), year.atMonth(12).atEndOfMonth()))
            .fetchOne(0, BigDecimal::class.java)
            .let { Money.krw(it ?: BigDecimal.ZERO) }

    private fun toEntry(r: PersonEntryRecord) = PersonEntry(
        id = PersonEntryId(r.id),
        userId = r.userId,
        person = r.person,
        direction = GiftDirection.parse(r.direction) ?: GiftDirection.GAVE,
        amount = Money.krw(r.amount),
        occasion = Occasion.parse(r.occasion) ?: Occasion.OTHER,
        happenedOn = r.happenedOn,
        memo = r.memo,
        createdAt = r.createdAt.toInstant(),
    )
}

/** 해 경조사 봉투(가계부 S1h — `DB-REQ-038` FR-19). 한 해 한 줄 — 다시 정하면 바꾼다 */
class JooqOccasionEnvelopes(private val dsl: DSLContext) : OccasionEnvelopes {
    override fun find(userId: String, year: Year): OccasionEnvelope? =
        dsl.select(OCCASION_ENVELOPE.AMOUNT).from(OCCASION_ENVELOPE)
            .where(OCCASION_ENVELOPE.USER_ID.eq(userId).and(OCCASION_ENVELOPE.FOR_YEAR.eq(year.value.toShort())))
            .fetchOne { OccasionEnvelope(year, Money.krw(it.value1())) }

    override fun put(userId: String, envelope: OccasionEnvelope, now: Instant) {
        dsl.insertInto(OCCASION_ENVELOPE)
            .set(OCCASION_ENVELOPE.USER_ID, userId)
            .set(OCCASION_ENVELOPE.FOR_YEAR, envelope.year.value.toShort())
            .set(OCCASION_ENVELOPE.AMOUNT, envelope.amount.toDecimal())
            .set(OCCASION_ENVELOPE.UPDATED_AT, now.utc())
            .onConflict(OCCASION_ENVELOPE.USER_ID, OCCASION_ENVELOPE.FOR_YEAR)
            .doUpdate()
            .set(OCCASION_ENVELOPE.AMOUNT, envelope.amount.toDecimal())
            .set(OCCASION_ENVELOPE.UPDATED_AT, now.utc())
            .execute()
    }

    override fun delete(userId: String, year: Year): Int =
        dsl.deleteFrom(OCCASION_ENVELOPE)
            .where(OCCASION_ENVELOPE.USER_ID.eq(userId).and(OCCASION_ENVELOPE.FOR_YEAR.eq(year.value.toShort())))
            .execute()
}
