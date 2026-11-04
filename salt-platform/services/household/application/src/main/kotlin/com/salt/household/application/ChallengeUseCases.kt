package com.salt.household.application

import com.salt.household.domain.Challenge
import com.salt.household.domain.ChallengeId
import com.salt.household.domain.ChallengeLimitReached
import com.salt.household.domain.ChallengeNotFound
import com.salt.household.domain.ChallengePreset
import com.salt.household.domain.ChallengeSaving
import com.salt.household.domain.ChallengeSavingContributed
import com.salt.household.domain.ChallengeSavingId
import com.salt.household.domain.ChallengeSavingNotFound
import com.salt.household.domain.ChallengeSavings
import com.salt.household.domain.ChallengeSummary
import com.salt.household.domain.Challenges
import com.salt.household.domain.Contribution
import com.salt.kernel.Money
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.util.UUID

/**
 * 가계부 S1d — 내가 고르는 챌린지(`SRV-REQ-046` FR-19 · FR-16 챌린지 스티커). 고르기 · 그만두기 · "한 날" · 아낀 돈.
 * **실패 · 연속 일수 · 재촉이 없다.** 쓰기 응답은 그 챌린지 한 장(화면이 그 카드만 바꾼다).
 * 목표에 보태기는 서비스 둘에 걸친다 — 저축 적립은 BFF 가 저축 서비스에 부르고, 여기는 "보탰다"만 적는다(슬라이스 판단 4).
 */

/** 목록에 싣는 챌린지 수 — 최근 만든 순. 끝난 것이 쌓여도 화면 한 장 */
const val CHALLENGE_LIST_LIMIT = 30

/** 한 챌린지 카드 — 날 · 아낀 돈을 붙인다(문장 2) */
internal fun summaryOf(challenge: Challenge, challenges: Challenges, savings: ChallengeSavings, today: LocalDate): ChallengeSummary {
    val ids = listOf(challenge.id)
    return ChallengeSummary.of(challenge, challenges.daysOf(ids)[challenge.id].orEmpty(), savings.of(ids)[challenge.id].orEmpty(), today)
}

internal fun Challenges.owned(userId: String, rawId: String): Challenge {
    val id = ChallengeId.parse(rawId) ?: throw ChallengeNotFound(rawId)
    return find(id, userId) ?: throw ChallengeNotFound(rawId)
}

open class ListChallenges(private val challenges: Challenges, private val savings: ChallengeSavings, private val clock: Clock) {
    data class View(
        val items: List<ChallengeSummary>,
        val presets: List<ChallengePreset>,
        /** 진행 · 예정 상한 */
        val limit: Int,
        /** 지금 진행 · 예정 수 — 상한에 닿았는지는 서버가 정한다 */
        val openCount: Int,
        val today: LocalDate,
    )

    /** 문장 4 — 챌린지 · 열린 수 · 날 · 아낀 돈 */
    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String): View {
        val today = clock.todayKst()
        val list = challenges.recent(userId, CHALLENGE_LIST_LIMIT)
        val ids = list.map { it.id }
        val days = challenges.daysOf(ids)
        val saved = savings.of(ids)
        val items = list.map { ChallengeSummary.of(it, days[it.id].orEmpty(), saved[it.id].orEmpty(), today) }
        return View(ChallengeSummary.order(items), ChallengePreset.entries, Challenge.OPEN_MAX, challenges.countOpen(userId, today), today)
    }
}

/**
 * 고르기 — 진행 · 예정이 상한이면 409. 상한은 화면 한 장을 지키는 편의라 동시 두 요청이 하나 넘길 수 있다(잠그지 않는다 — 판단 6).
 */
open class StartChallenge(private val challenges: Challenges, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, title: String, startsOn: LocalDate?, endsOn: LocalDate): ChallengeSummary {
        val today = clock.todayKst()
        val challenge = Challenge.create(userId, title, startsOn ?: today, endsOn, today, clock.instant())
        if (challenges.countOpen(userId, today) >= Challenge.OPEN_MAX) throw ChallengeLimitReached(Challenge.OPEN_MAX)
        challenges.add(challenge)
        return ChallengeSummary.of(challenge, emptyList(), emptyList(), today)
    }
}

/** 그만두기 — 언제든 · 다시 눌러도 같다. 그만둔 날은 오늘(기간이 이미 지났으면 끝 날 — 기간보다 늦은 날을 적지 않는다) */
open class EndChallenge(private val challenges: Challenges, private val savings: ChallengeSavings, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String): ChallengeSummary {
        val today = clock.todayKst()
        val challenge = challenges.owned(userId, rawId)
        challenges.end(challenge.id, userId, minOf(today, challenge.endsOn))
        return summaryOf(challenges.find(challenge.id, userId)!!, challenges, savings, today)
    }
}

/** "한 날" 표시 — 기간 안 · 오늘까지. 다시 눌러도 같다(`ON CONFLICT DO NOTHING`) */
open class MarkChallengeDay(private val challenges: Challenges, private val savings: ChallengeSavings, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String, day: LocalDate): ChallengeSummary {
        val today = clock.todayKst()
        val challenge = challenges.owned(userId, rawId)
        challenge.checkDay(day, today)
        challenges.markDay(challenge.id, userId, day, clock.instant())
        return summaryOf(challenge, challenges, savings, today)
    }
}

/** 표시 지우기 — 없어도 성공 */
open class UnmarkChallengeDay(private val challenges: Challenges, private val savings: ChallengeSavings, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String, day: LocalDate): ChallengeSummary {
        val challenge = challenges.owned(userId, rawId)
        challenges.unmarkDay(challenge.id, userId, day)
        return summaryOf(challenge, challenges, savings, clock.todayKst())
    }
}

/** 아낀 돈 적기 — 기간 안의 날(기본 오늘). 실제 적립이 아니다 */
open class RecordChallengeSaving(private val challenges: Challenges, private val savings: ChallengeSavings, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String, amount: Money, savedOn: LocalDate?, note: String?): ChallengeSummary {
        val today = clock.todayKst()
        val challenge = challenges.owned(userId, rawId)
        savings.add(ChallengeSaving.create(challenge, amount, savedOn ?: today, note, today, clock.instant()))
        return summaryOf(challenge, challenges, savings, today)
    }
}

/** 아낀 돈 지우기 — 목표에 보탠 것은 409(저축 쪽 적립이 이 기록을 가리킨다) */
open class DeleteChallengeSaving(private val challenges: Challenges, private val savings: ChallengeSavings, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String): ChallengeSummary {
        val id = ChallengeSavingId.parse(rawId) ?: throw ChallengeSavingNotFound(rawId)
        val found = savings.find(id, userId) ?: throw ChallengeSavingNotFound(rawId)
        if (found.contribution != null || savings.deleteUncontributed(id, userId) == 0) throw ChallengeSavingContributed(rawId)
        return summaryOf(challenges.find(found.challengeId, userId)!!, challenges, savings, clock.todayKst())
    }
}

/** BFF 가 목표에 보태기 전에 금액 · 날짜를 읽는다 — 금액은 화면이 아니라 이 기록에서(판단 4) */
open class GetChallengeSaving(private val savings: ChallengeSavings) {
    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String, rawId: String): ChallengeSaving {
        val id = ChallengeSavingId.parse(rawId) ?: throw ChallengeSavingNotFound(rawId)
        return savings.find(id, userId) ?: throw ChallengeSavingNotFound(rawId)
    }
}

/**
 * 보탰다고 적기 — 저축 적립이 끝난 뒤 BFF 가 부른다. 같은 목표로 다시 오면 그대로(재시도), 다른 목표면 409.
 * 조건부 UPDATE 라 두 요청이 겹쳐도 하나만 적힌다.
 */
open class MarkSavingContributed(private val challenges: Challenges, private val savings: ChallengeSavings, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String, goalId: UUID): ChallengeSummary {
        val id = ChallengeSavingId.parse(rawId) ?: throw ChallengeSavingNotFound(rawId)
        val found = savings.find(id, userId) ?: throw ChallengeSavingNotFound(rawId)
        val existing = found.contribution
        if (existing == null) {
            if (savings.markContributed(id, userId, Contribution(goalId, clock.instant())) == 0) {
                // 그 사이 다른 요청이 적었다 — 다시 읽어 같은 목표인지 본다
                if (savings.find(id, userId)?.contribution?.goalId != goalId) throw ChallengeSavingContributed(rawId)
            }
        } else if (existing.goalId != goalId) {
            throw ChallengeSavingContributed(rawId)
        }
        return summaryOf(challenges.find(found.challengeId, userId)!!, challenges, savings, clock.todayKst())
    }
}
