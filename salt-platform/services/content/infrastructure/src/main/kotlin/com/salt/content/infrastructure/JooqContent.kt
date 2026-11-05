package com.salt.content.infrastructure

import com.salt.content.domain.ContentEvents
import com.salt.content.domain.Dismissals
import com.salt.content.domain.PolicyParam
import com.salt.content.domain.PolicyParams
import com.salt.content.domain.QuizAnswers
import com.salt.content.domain.QuizRecord
import com.salt.content.domain.Tip
import com.salt.content.domain.TipContext
import com.salt.content.domain.TipStatus
import com.salt.content.domain.Tips
import com.salt.content.domain.TriggerKind
import com.salt.content.domain.TriggerRule
import com.salt.content.domain.TriggerRules
import com.salt.content.domain.UserSignal
import com.salt.content.domain.UserSignals
import com.salt.content.infrastructure.jooq.Tables.POLICY_PARAM
import com.salt.content.infrastructure.jooq.Tables.QUIZ_ANSWER
import com.salt.content.infrastructure.jooq.Tables.TIP
import com.salt.content.infrastructure.jooq.Tables.TIP_DISMISSAL
import com.salt.content.infrastructure.jooq.Tables.TIP_REVISION
import com.salt.content.infrastructure.jooq.Tables.TRIGGER_RULE
import com.salt.content.infrastructure.jooq.Tables.USER_SIGNAL
import com.salt.content.infrastructure.jooq.tables.records.PolicyParamRecord
import com.salt.support.messaging.OutboxWriter
import com.salt.support.messaging.ProcessedEvents
import org.jooq.DSLContext
import org.jooq.impl.DSL
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

private fun Instant.utc() = atOffset(ZoneOffset.UTC)

class JooqTips(private val dsl: DSLContext) : Tips {
    override fun all(): List<Tips.Stored> =
        dsl.selectFrom(TIP).orderBy(TIP.SLUG).fetch { Tips.Stored(it.slug, it.contentHash, TipStatus.of(it.status), it.validUntil) }

    override fun save(tip: Tip, status: TipStatus, at: Instant) {
        val m = tip.meta
        dsl.insertInto(TIP)
            .set(TIP.SLUG, tip.slug)
            .set(TIP.TITLE, m.title)
            .set(TIP.SOURCE_URL, m.sourceUrl)
            .set(TIP.SOURCE_NAME, m.sourceName)
            .set(TIP.WRITTEN_ON, m.writtenOn)
            .set(TIP.REVIEWED_ON, m.reviewedOn)
            .set(TIP.BASE_YEAR, m.baseYear.toShort())
            .set(TIP.VALID_UNTIL, m.validUntil)
            .set(TIP.STATUS, status.key)
            .set(TIP.CONTENT_HASH, tip.contentHash)
            .set(TIP.UPDATED_AT, at.utc())
            .onConflict(TIP.SLUG).doUpdate()
            .set(TIP.TITLE, m.title)
            .set(TIP.SOURCE_URL, m.sourceUrl)
            .set(TIP.SOURCE_NAME, m.sourceName)
            .set(TIP.WRITTEN_ON, m.writtenOn)
            .set(TIP.REVIEWED_ON, m.reviewedOn)
            .set(TIP.BASE_YEAR, m.baseYear.toShort())
            .set(TIP.VALID_UNTIL, m.validUntil)
            .set(TIP.STATUS, status.key)
            .set(TIP.CONTENT_HASH, tip.contentHash)
            .set(TIP.UPDATED_AT, at.utc())
            .execute()
    }

    override fun retireMissing(present: Set<String>, at: Instant): List<String> =
        dsl.update(TIP)
            .set(TIP.STATUS, TipStatus.NEEDS_CHECK.key)
            .set(TIP.UPDATED_AT, at.utc())
            .where(TIP.SLUG.notIn(present).and(TIP.STATUS.eq(TipStatus.PUBLISHED.key)))
            .returning(TIP.SLUG)
            .fetch(TIP.SLUG)

    override fun setStatus(slug: String, status: TipStatus, at: Instant) {
        dsl.update(TIP).set(TIP.STATUS, status.key).set(TIP.UPDATED_AT, at.utc()).where(TIP.SLUG.eq(slug)).execute()
    }

    override fun addRevision(revision: Tips.Revision) {
        dsl.insertInto(TIP_REVISION)
            .set(TIP_REVISION.TIP_SLUG, revision.slug)
            .set(TIP_REVISION.REVISED_AT, revision.at.utc())
            .set(TIP_REVISION.SUMMARY, revision.summary)
            .set(TIP_REVISION.PREVIOUS_HASH, revision.previousHash)
            .set(TIP_REVISION.BODY_LINES, revision.lines?.joinToString(LINE_BREAK))
            .execute()
    }

    /** 최근 것 먼저 — 화면의 "바뀐 것" 목록 순서 */
    override fun revisions(slug: String): List<Tips.Revision> =
        dsl.selectFrom(TIP_REVISION)
            .where(TIP_REVISION.TIP_SLUG.eq(slug))
            .orderBy(TIP_REVISION.REVISED_AT.desc(), TIP_REVISION.ID.desc())
            .fetch { Tips.Revision(it.tipSlug, it.revisedAt.toInstant(), it.summary, it.previousHash, it.bodyLines?.split(LINE_BREAK)) }

    private companion object {
        /** 줄 안엔 개행이 없다 — 문단은 한 줄로 편다(`PublishCheck.blocks`) */
        const val LINE_BREAK = "\n"
    }
}

class JooqTriggerRules(private val dsl: DSLContext) : TriggerRules {
    override fun replaceAll(rules: List<TriggerRule>) {
        dsl.update(TRIGGER_RULE).set(TRIGGER_RULE.ACTIVE, false).execute()
        rules.forEach { r ->
            val contexts = r.contexts.map { it.key }.sorted().joinToString(",")
            dsl.insertInto(TRIGGER_RULE)
                .set(TRIGGER_RULE.TIP_SLUG, r.tipSlug)
                .set(TRIGGER_RULE.KIND, r.kind.key)
                .set(TRIGGER_RULE.CONTEXTS, contexts)
                .set(TRIGGER_RULE.SORT_ORDER, r.order)
                .set(TRIGGER_RULE.ACTIVE, true)
                .onConflict(TRIGGER_RULE.TIP_SLUG, TRIGGER_RULE.KIND).doUpdate()
                .set(TRIGGER_RULE.CONTEXTS, contexts)
                .set(TRIGGER_RULE.SORT_ORDER, r.order)
                .set(TRIGGER_RULE.ACTIVE, true)
                .execute()
        }
    }

    /** 모르는 종류(코드에서 지운 트리거)는 건너뛴다 — 다음 동기화가 끈다 */
    override fun active(): List<TriggerRule> =
        dsl.selectFrom(TRIGGER_RULE).where(TRIGGER_RULE.ACTIVE.isTrue).orderBy(TRIGGER_RULE.SORT_ORDER).fetch().mapNotNull { r ->
            val kind = TriggerKind.parse(r.kind) ?: return@mapNotNull null
            TriggerRule(r.tipSlug, kind, r.contexts.split(',').mapNotNull(TipContext::parse).toSet(), r.sortOrder)
        }
}

class JooqPolicyParams(private val dsl: DSLContext) : PolicyParams {
    override fun all(): List<PolicyParam> = dsl.selectFrom(POLICY_PARAM).fetch(::toParam)

    override fun insert(param: PolicyParam) {
        dsl.insertInto(POLICY_PARAM)
            .set(POLICY_PARAM.PARAM_KEY, param.key)
            .set(POLICY_PARAM.VALID_FROM, param.validFrom)
            .set(POLICY_PARAM.VALID_TO, param.validTo)
            .set(POLICY_PARAM.NUM_VALUE, param.value)
            .set(POLICY_PARAM.TEXT_VALUE, param.text)
            .set(POLICY_PARAM.UNIT, param.unit)
            .set(POLICY_PARAM.SOURCE_URL, param.sourceUrl)
            .set(POLICY_PARAM.AS_OF, param.asOf)
            .execute()
    }

    override fun update(param: PolicyParam) {
        dsl.update(POLICY_PARAM)
            .set(POLICY_PARAM.VALID_TO, param.validTo)
            .set(POLICY_PARAM.NUM_VALUE, param.value)
            .set(POLICY_PARAM.TEXT_VALUE, param.text)
            .set(POLICY_PARAM.UNIT, param.unit)
            .set(POLICY_PARAM.SOURCE_URL, param.sourceUrl)
            .set(POLICY_PARAM.AS_OF, param.asOf)
            .where(POLICY_PARAM.PARAM_KEY.eq(param.key).and(POLICY_PARAM.VALID_FROM.eq(param.validFrom)))
            .execute()
    }

    override fun valueAt(key: String, on: LocalDate): PolicyParam? =
        dsl.selectFrom(POLICY_PARAM)
            .where(POLICY_PARAM.PARAM_KEY.eq(key))
            .and(POLICY_PARAM.VALID_FROM.le(on))
            .and(POLICY_PARAM.VALID_TO.isNull.or(POLICY_PARAM.VALID_TO.ge(on)))
            .fetchOne(::toParam)

    private fun toParam(r: PolicyParamRecord) =
        PolicyParam(r.paramKey, r.validFrom, r.validTo, r.numValue, r.textValue, r.unit, r.sourceUrl, r.asOf)
}

class JooqUserSignals(private val dsl: DSLContext) : UserSignals {
    /** 멱등 키 먼저(`processed_event`) — 처음일 때만 신호 한 줄. 두 쓰기가 유스케이스 트랜잭션 하나에 든다 */
    override fun recordOnce(eventId: UUID, eventType: String, signal: UserSignal?): Boolean {
        if (!ProcessedEvents.firstTime(dsl, eventId, eventType)) return false
        if (signal != null) {
            dsl.insertInto(USER_SIGNAL)
                .set(USER_SIGNAL.EVENT_ID, eventId)
                .set(USER_SIGNAL.USER_ID, signal.userId)
                .set(USER_SIGNAL.KIND, signal.kind.key)
                .set(USER_SIGNAL.OCCURRED_AT, signal.occurredAt.utc())
                .execute()
        }
        return true
    }

    override fun recent(userId: String, since: Instant): List<UserSignal> =
        dsl.selectFrom(USER_SIGNAL)
            .where(USER_SIGNAL.USER_ID.eq(userId).and(USER_SIGNAL.OCCURRED_AT.ge(since.utc())))
            .fetch()
            .mapNotNull { r -> TriggerKind.parse(r.kind)?.let { UserSignal(r.userId, it, r.occurredAt.toInstant()) } }
}

class JooqDismissals(private val dsl: DSLContext) : Dismissals {
    override fun dismiss(userId: String, slug: String, at: Instant) {
        dsl.insertInto(TIP_DISMISSAL)
            .set(TIP_DISMISSAL.USER_ID, userId)
            .set(TIP_DISMISSAL.TIP_SLUG, slug)
            .set(TIP_DISMISSAL.DISMISSED_AT, at.utc())
            .onConflictDoNothing()
            .execute()
    }

    override fun dismissed(userId: String): Set<String> =
        dsl.select(TIP_DISMISSAL.TIP_SLUG).from(TIP_DISMISSAL).where(TIP_DISMISSAL.USER_ID.eq(userId)).fetchSet(TIP_DISMISSAL.TIP_SLUG)
}

class JooqQuizAnswers(private val dsl: DSLContext) : QuizAnswers {
    /**
     * 한 문장 UPSERT — 동시에 두 번 풀어도 오류 없이 한 행(`prisma-database.md` 경합 규칙의 뜻). 카드 시각은 비어 있을 때만 채운다:
     * 처음 맞힌 시각이 남고, 그 뒤 틀려도 지우지 않는다.
     */
    override fun record(userId: String, slug: String, correct: Boolean, at: Instant): QuizRecord {
        val now = at.utc()
        val correctAt = if (correct) now else null
        return dsl.insertInto(QUIZ_ANSWER)
            .set(QUIZ_ANSWER.USER_ID, userId)
            .set(QUIZ_ANSWER.TIP_SLUG, slug)
            .set(QUIZ_ANSWER.ATTEMPTS, 1)
            .set(QUIZ_ANSWER.FIRST_ANSWERED_AT, now)
            .set(QUIZ_ANSWER.LAST_ANSWERED_AT, now)
            .set(QUIZ_ANSWER.CORRECT_AT, correctAt)
            .onConflict(QUIZ_ANSWER.USER_ID, QUIZ_ANSWER.TIP_SLUG).doUpdate()
            .set(QUIZ_ANSWER.ATTEMPTS, QUIZ_ANSWER.ATTEMPTS.plus(1))
            .set(QUIZ_ANSWER.LAST_ANSWERED_AT, DSL.greatest(QUIZ_ANSWER.LAST_ANSWERED_AT, DSL.excluded(QUIZ_ANSWER.LAST_ANSWERED_AT)))
            .set(QUIZ_ANSWER.CORRECT_AT, DSL.coalesce(QUIZ_ANSWER.CORRECT_AT, DSL.excluded(QUIZ_ANSWER.CORRECT_AT)))
            .returning()
            .fetchOne { QuizRecord(it.userId, it.tipSlug, it.attempts, it.correctAt?.toInstant()) }!!
    }

    override fun collected(userId: String): List<QuizRecord> =
        dsl.selectFrom(QUIZ_ANSWER)
            .where(QUIZ_ANSWER.USER_ID.eq(userId).and(QUIZ_ANSWER.CORRECT_AT.isNotNull))
            .orderBy(QUIZ_ANSWER.CORRECT_AT.desc(), QUIZ_ANSWER.TIP_SLUG)
            .fetch { QuizRecord(it.userId, it.tipSlug, it.attempts, it.correctAt?.toInstant()) }
}

/**
 * 도메인 이벤트 → 계약 본문(`contracts/events/content.PolicyParamChanged.json`). 금액은 문자열(NUMERIC 그대로) · 브로커 안에서만.
 * 구독 예정: 저축 제도 계산(F012 FR-12) · 가계부 공제 계기판(F013 FR-11) — 둘 다 법무 확인 뒤.
 */
class OutboxContentEvents(private val outbox: OutboxWriter) : ContentEvents {
    override fun policyParamChanged(param: PolicyParam, change: String) {
        outbox.append(
            POLICY_PARAM_CHANGED,
            mapOf(
                "key" to param.key,
                "validFrom" to param.validFrom.toString(),
                "validTo" to param.validTo?.toString(),
                "value" to param.value?.toPlainString(),
                "text" to param.text,
                "unit" to param.unit,
                "change" to change,
                "asOf" to param.asOf.toString(),
            ),
        )
    }

    companion object {
        const val POLICY_PARAM_CHANGED = "content.PolicyParamChanged"
    }
}
