package com.salt.household.infrastructure

import com.salt.household.domain.Challenge
import com.salt.household.domain.ChallengeId
import com.salt.household.domain.ChallengeSaving
import com.salt.household.domain.ChallengeSavingId
import com.salt.household.domain.ChallengeSavings
import com.salt.household.domain.Challenges
import com.salt.household.domain.Contribution
import com.salt.household.infrastructure.jooq.Tables.CHALLENGE
import com.salt.household.infrastructure.jooq.Tables.CHALLENGE_DAY
import com.salt.household.infrastructure.jooq.Tables.CHALLENGE_SAVING
import com.salt.household.infrastructure.jooq.tables.records.ChallengeRecord
import com.salt.household.infrastructure.jooq.tables.records.ChallengeSavingRecord
import org.jooq.DSLContext
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth

/**
 * 챌린지 · "한 날" · 아낀 돈(가계부 S1d — `SRV-REQ-046` FR-19 · `DB-REQ-038` FR-10 · 11). 상태 값은 `active` · `ended` 둘 — 실패 없음.
 * 화면 하나에 문장 셋(챌린지 · 날 · 아낀 돈) — 챌린지마다 따로 묻지 않는다(N+1 0).
 */
class JooqChallenges(private val dsl: DSLContext) : Challenges {
    override fun add(challenge: Challenge) {
        dsl.insertInto(CHALLENGE)
            .set(CHALLENGE.ID, challenge.id.value)
            .set(CHALLENGE.USER_ID, challenge.userId)
            .set(CHALLENGE.TITLE, challenge.title)
            .set(CHALLENGE.STARTS_ON, challenge.startsOn)
            .set(CHALLENGE.ENDS_ON, challenge.endsOn)
            .set(CHALLENGE.STATUS, ACTIVE)
            .set(CHALLENGE.CREATED_AT, challenge.createdAt.utc())
            .execute()
    }

    override fun find(id: ChallengeId, userId: String): Challenge? =
        dsl.selectFrom(CHALLENGE).where(CHALLENGE.ID.eq(id.value).and(CHALLENGE.USER_ID.eq(userId))).fetchOne(::toChallenge)

    override fun recent(userId: String, limit: Int): List<Challenge> =
        dsl.selectFrom(CHALLENGE).where(CHALLENGE.USER_ID.eq(userId))
            .orderBy(CHALLENGE.CREATED_AT.desc())
            .limit(limit)
            .fetch(::toChallenge)

    override fun countOpen(userId: String, today: LocalDate): Int =
        dsl.fetchCount(CHALLENGE, CHALLENGE.USER_ID.eq(userId).and(CHALLENGE.STATUS.eq(ACTIVE)).and(CHALLENGE.ENDS_ON.ge(today)))

    /** 아직 진행 중일 때만 — 두 번 눌러도 처음 날이 남는다(조건부 UPDATE) */
    override fun end(id: ChallengeId, userId: String, on: LocalDate): Int =
        dsl.update(CHALLENGE)
            .set(CHALLENGE.STATUS, ENDED)
            .set(CHALLENGE.ENDED_ON, on)
            .where(CHALLENGE.ID.eq(id.value).and(CHALLENGE.USER_ID.eq(userId)).and(CHALLENGE.STATUS.eq(ACTIVE)))
            .execute()

    override fun markDay(id: ChallengeId, userId: String, day: LocalDate, now: Instant) {
        dsl.insertInto(CHALLENGE_DAY)
            .set(CHALLENGE_DAY.CHALLENGE_ID, id.value)
            .set(CHALLENGE_DAY.USER_ID, userId)
            .set(CHALLENGE_DAY.MARKED_ON, day)
            .set(CHALLENGE_DAY.CREATED_AT, now.utc())
            .onConflictDoNothing()
            .execute()
    }

    override fun unmarkDay(id: ChallengeId, userId: String, day: LocalDate): Int =
        dsl.deleteFrom(CHALLENGE_DAY)
            .where(CHALLENGE_DAY.CHALLENGE_ID.eq(id.value).and(CHALLENGE_DAY.USER_ID.eq(userId)).and(CHALLENGE_DAY.MARKED_ON.eq(day)))
            .execute()

    override fun daysOf(ids: List<ChallengeId>): Map<ChallengeId, List<LocalDate>> {
        if (ids.isEmpty()) return emptyMap()
        return dsl.select(CHALLENGE_DAY.CHALLENGE_ID, CHALLENGE_DAY.MARKED_ON).from(CHALLENGE_DAY)
            .where(CHALLENGE_DAY.CHALLENGE_ID.`in`(ids.map { it.value }))
            .orderBy(CHALLENGE_DAY.MARKED_ON.asc())
            .fetch()
            .groupBy({ ChallengeId(it.value1()) }, { it.value2() })
    }

    override fun markedInMonth(userId: String, month: YearMonth): Set<LocalDate> =
        dsl.selectDistinct(CHALLENGE_DAY.MARKED_ON).from(CHALLENGE_DAY)
            .where(CHALLENGE_DAY.USER_ID.eq(userId).and(CHALLENGE_DAY.MARKED_ON.between(month.atDay(1), month.atEndOfMonth())))
            .fetchSet(CHALLENGE_DAY.MARKED_ON)

    private fun toChallenge(r: ChallengeRecord) = Challenge(
        id = ChallengeId(r.id),
        userId = r.userId,
        title = r.title,
        startsOn = r.startsOn,
        endsOn = r.endsOn,
        endedOn = r.endedOn,
        createdAt = r.createdAt.toInstant(),
    )

    private companion object {
        const val ACTIVE = "active"
        const val ENDED = "ended"
    }
}

class JooqChallengeSavings(private val dsl: DSLContext) : ChallengeSavings {
    override fun add(saving: ChallengeSaving) {
        dsl.insertInto(CHALLENGE_SAVING)
            .set(CHALLENGE_SAVING.ID, saving.id.value)
            .set(CHALLENGE_SAVING.CHALLENGE_ID, saving.challengeId.value)
            .set(CHALLENGE_SAVING.USER_ID, saving.userId)
            .set(CHALLENGE_SAVING.AMOUNT, saving.amount.toDecimal())
            .set(CHALLENGE_SAVING.SAVED_ON, saving.savedOn)
            .set(CHALLENGE_SAVING.NOTE, saving.note)
            .set(CHALLENGE_SAVING.CREATED_AT, saving.createdAt.utc())
            .execute()
    }

    override fun find(id: ChallengeSavingId, userId: String): ChallengeSaving? =
        dsl.selectFrom(CHALLENGE_SAVING)
            .where(CHALLENGE_SAVING.ID.eq(id.value).and(CHALLENGE_SAVING.USER_ID.eq(userId)))
            .fetchOne(::toSaving)

    override fun of(ids: List<ChallengeId>): Map<ChallengeId, List<ChallengeSaving>> {
        if (ids.isEmpty()) return emptyMap()
        return dsl.selectFrom(CHALLENGE_SAVING)
            .where(CHALLENGE_SAVING.CHALLENGE_ID.`in`(ids.map { it.value }))
            .fetch(::toSaving)
            .groupBy { it.challengeId }
    }

    override fun deleteUncontributed(id: ChallengeSavingId, userId: String): Int =
        dsl.deleteFrom(CHALLENGE_SAVING)
            .where(CHALLENGE_SAVING.ID.eq(id.value).and(CHALLENGE_SAVING.USER_ID.eq(userId)).and(CHALLENGE_SAVING.GOAL_ID.isNull))
            .execute()

    override fun markContributed(id: ChallengeSavingId, userId: String, contribution: Contribution): Int =
        dsl.update(CHALLENGE_SAVING)
            .set(CHALLENGE_SAVING.GOAL_ID, contribution.goalId)
            .set(CHALLENGE_SAVING.CONTRIBUTED_AT, contribution.at.utc())
            .where(CHALLENGE_SAVING.ID.eq(id.value).and(CHALLENGE_SAVING.USER_ID.eq(userId)).and(CHALLENGE_SAVING.GOAL_ID.isNull))
            .execute()

    private fun toSaving(r: ChallengeSavingRecord) = ChallengeSaving(
        id = ChallengeSavingId(r.id),
        challengeId = ChallengeId(r.challengeId),
        userId = r.userId,
        amount = money(r.amount),
        savedOn = r.savedOn,
        note = r.note,
        contribution = r.goalId?.let { Contribution(it, r.contributedAt.toInstant()) },
        createdAt = r.createdAt.toInstant(),
    )
}
