package com.salt.content.application

import com.salt.content.domain.ContentCatalog
import com.salt.content.domain.ContentEvents
import com.salt.content.domain.Dismissals
import com.salt.content.domain.InvalidContext
import com.salt.content.domain.LineDiff
import com.salt.content.domain.MyFacts
import com.salt.content.domain.MyNumbers
import com.salt.content.domain.MyNumbersNotFound
import com.salt.content.domain.MyReading
import com.salt.content.domain.PolicyParam
import com.salt.content.domain.PolicyParamNotFound
import com.salt.content.domain.PolicyParamSet
import com.salt.content.domain.PolicyParams
import com.salt.content.domain.PublishCheck
import com.salt.content.domain.QuizAnswers
import com.salt.content.domain.QuizNotFound
import com.salt.content.domain.TimelyTipPicker
import com.salt.content.domain.Tip
import com.salt.content.domain.TipContext
import com.salt.content.domain.TipNotFound
import com.salt.content.domain.TipQuiz
import com.salt.content.domain.TipStatus
import com.salt.content.domain.Tips
import com.salt.content.domain.TriggerKind
import com.salt.content.domain.TriggerRule
import com.salt.content.domain.TriggerRules
import com.salt.content.domain.UserSignal
import com.salt.content.domain.UserSignals
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.UUID

/** content 서비스의 트랜잭션 매니저 이름(`ServiceDatabase` — 서비스마다 따로). */
const val CONTENT_TX = "contentTx"

private val KST: ZoneId = ZoneId.of("Asia/Seoul")

internal fun Clock.kstToday(): LocalDate = LocalDate.ofInstant(instant(), KST)

/**
 * 공개 플래그(`SRV-REQ-047` 수용 기준 3) — **법무 확인 기록 전엔 꺼짐**(FEATURE-014 열린 질문 · 사용자 결정 2026-10-30).
 * 꺼져 있으면 목록 0 · 글 404 · 때맞춘 팁 0. 원문 동기화 · 유효기한 점검 · 제도 파라미터 조회는 플래그와 무관하게 돈다
 * (파라미터는 저축 · 가계부 계산이 읽는 숫자라 공개 글과 다르다).
 */
data class ContentSettings(val publicEnabled: Boolean)

/** 원문 묶음이 발행 검사를 통과하지 못했다 — 기동을 멈춘다. 고칠 자리(파일 · 규칙)를 그대로 싣는다. */
class CatalogRejected(val problems: List<String>) : IllegalStateException("금융 팁 원문 발행 검사 실패:\n" + problems.joinToString("\n"))

/** 기동 때 읽은 원문 — 본문은 여기(원문이 주인), DB 는 메타 · 이력. [SyncCatalog] 가 채운다. */
class TipLibrary {
    @Volatile
    private var tips: Map<String, Tip> = emptyMap()

    fun replace(next: List<Tip>) {
        tips = next.associateBy { it.slug }
    }

    fun all(): Map<String, Tip> = tips
}

/**
 * 원문 → DB 동기화(FR-1 · FR-3) — 기동 때 한 번. 순서: **전부 검사 → 하나라도 틀리면 아무것도 안 쓰고 실패** → 쓰기.
 * 글: 새 글 · 해시가 바뀐 글은 변경 이력 한 줄. 원문에서 사라진 글은 지우지 않고 확인 필요로.
 * 파라미터: 같은 키 · 시작일이면 같은 줄 — 새 줄 · 바뀐 줄마다 `content.PolicyParamChanged`(같은 트랜잭션, 아웃박스).
 */
open class SyncCatalog(
    private val catalog: ContentCatalog,
    private val library: TipLibrary,
    private val tips: Tips,
    private val rules: TriggerRules,
    private val params: PolicyParams,
    private val events: ContentEvents,
    private val clock: Clock,
) {
    data class Result(val tips: Int, val revised: Int, val retired: Int, val paramsChanged: Int)

    /**
     * 원문을 검사해 이 프로세스의 [TipLibrary] 에 싣는다 — DB 를 쓰지 않는다. 인스턴스마다 돈다(락 밖): 락을 못 잡은 인스턴스도
     * 본문을 가져야 글을 내준다. @throws CatalogRejected 하나라도 틀리면
     */
    open fun load(): List<Tip> {
        val outcomes = catalog.tipSources().toSortedMap().map { (slug, raw) -> PublishCheck.check(slug, raw) }
        val rejected = outcomes.filterIsInstance<PublishCheck.Outcome.Rejected>().flatMap { r -> r.problems.map { "${r.slug}: $it" } }
        val paramProblems = PolicyParamSet.validate(catalog.policyParams()).map { "policy-params: $it" }
        if (rejected.isNotEmpty() || paramProblems.isNotEmpty()) throw CatalogRejected(rejected + paramProblems)
        return outcomes.filterIsInstance<PublishCheck.Outcome.Ok>().map { it.tip }.also(library::replace)
    }

    /** DB 쓰기 — 락 안에서 한 인스턴스만(`ContentWorker`). 검사부터 다시 한다(그 사이 원문이 바뀌지 않았어도 값싸다) */
    @Transactional(transactionManager = CONTENT_TX)
    open fun execute(): Result {
        val parsed = load()
        val sourceParams = catalog.policyParams()
        val now = clock.instant()
        val today = clock.kstToday()
        val stored = tips.all().associateBy { it.slug }
        var revised = 0
        parsed.forEach { tip ->
            val before = stored[tip.slug]
            val status = tip.statusOn(today)
            when {
                before == null -> {
                    tips.save(tip, status, now)
                    // 처음 기록하는 글은 늘 "첫 판" — `change:` 는 앞 판과 견준 말이라 앞 판이 없는 DB(새 환경)에선 거짓이 된다
                    tips.addRevision(Tips.Revision(tip.slug, now, FIRST_EDITION, null, tip.revisionLines()))
                    revised++
                }
                before.contentHash != tip.contentHash -> {
                    tips.save(tip, status, now)
                    tips.addRevision(Tips.Revision(tip.slug, now, tip.change ?: "본문 수정", before.contentHash, tip.revisionLines()))
                    revised++
                }
                before.status != status -> {
                    tips.setStatus(tip.slug, status, now)
                    tips.addRevision(Tips.Revision(tip.slug, now, statusChange(status), before.contentHash, tip.revisionLines()))
                    revised++
                }
            }
        }
        val retired = tips.retireMissing(parsed.map { it.slug }.toSet(), now)
        retired.forEach { tips.addRevision(Tips.Revision(it, now, "원문에서 빠짐 — 확인 필요", stored[it]?.contentHash)) }

        var order = 0
        rules.replaceAll(parsed.flatMap { tip -> tip.triggers.map { TriggerRule(tip.slug, it, tip.contexts, order++) } })

        val existing = params.all().associateBy { it.key to it.validFrom }
        var changed = 0
        sourceParams.forEach { p ->
            val before = existing[p.key to p.validFrom]
            when {
                before == null -> {
                    params.insert(p)
                    events.policyParamChanged(p, "added")
                    changed++
                }
                !before.sameContent(p) -> {
                    params.update(p)
                    events.policyParamChanged(p, "updated")
                    changed++
                }
            }
        }
        return Result(parsed.size, revised, retired.size, changed)
    }
}

internal const val FIRST_EDITION = "첫 판"

internal fun statusChange(status: TipStatus): String = when (status) {
    TipStatus.NEEDS_CHECK -> "유효기한 지남 — 확인 필요"
    TipStatus.PUBLISHED -> "유효기한 안 — 다시 공개"
}

/**
 * 유효기한 점검(FR-2) — 워커가 매시 부른다(멱등 — 놓친 날을 다음 회차가 메운다). 기한 다음 날(KST)이 되면 확인 필요 · 변경 이력 한 줄.
 * 화면 상태는 늘 지금 날짜로 다시 계산한다([Tip.statusOn]) — 이 점검은 DB 기록(noindex 신호 · 이력)을 맞추는 몫이다.
 */
open class RunValidityCheck(private val tips: Tips, private val library: TipLibrary, private val clock: Clock) {
    @Transactional(transactionManager = CONTENT_TX)
    open fun execute(): Int {
        val today = clock.kstToday()
        val now = clock.instant()
        return tips.all()
            .filter { it.status == TipStatus.PUBLISHED && TipStatus.on(it.validUntil, today) == TipStatus.NEEDS_CHECK }
            .onEach {
                tips.setStatus(it.slug, TipStatus.NEEDS_CHECK, now)
                // 줄은 이 프로세스가 실은 원문에서 — 해시가 같을 때만(다른 판의 줄을 이 판으로 적지 않는다)
                val lines = library.all()[it.slug]?.takeIf { tip -> tip.contentHash == it.contentHash }?.revisionLines()
                tips.addRevision(Tips.Revision(it.slug, now, statusChange(TipStatus.NEEDS_CHECK), it.contentHash, lines))
            }
            .size
    }
}

/** 공개 목록 — 원문 순서(slug). 확인 필요 글도 목록엔 남는다(띠 · noindex 로 보여 준다, FR-2). */
open class ListTips(private val library: TipLibrary, private val settings: ContentSettings, private val clock: Clock) {
    data class Item(val tip: Tip, val status: TipStatus)

    data class View(val public: Boolean, val items: List<Item>)

    fun execute(): View {
        if (!settings.publicEnabled) return View(false, emptyList())
        val today = clock.kstToday()
        return View(true, library.all().values.sortedBy { it.slug }.map { Item(it, it.statusOn(today)) })
    }
}

open class GetTip(private val library: TipLibrary, private val tips: Tips, private val settings: ContentSettings, private val clock: Clock) {
    /** [changes] — 앞 판과 바뀐 줄(FR-7). 첫 판 · 줄을 모르는 판이면 null */
    data class RevisionView(val revision: Tips.Revision, val changes: List<LineDiff.Change>?)

    data class View(val tip: Tip, val status: TipStatus, val revisions: List<RevisionView>)

    @Transactional(transactionManager = CONTENT_TX, readOnly = true)
    open fun execute(slug: String): View {
        if (!settings.publicEnabled) throw TipNotFound(slug)
        val tip = library.all()[slug] ?: throw TipNotFound(slug)
        val revisions = tips.revisions(slug)
        return View(tip, tip.statusOn(clock.kstToday()), revisions.zip(LineDiff.forRevisions(revisions), ::RevisionView))
    }
}

/** 퀴즈가 있는 공개 글 — 공개 플래그 · 원문 · 퀴즈 셋을 한 자리에서 본다(채점 둘이 같은 문으로 들어오게) */
private fun quizOf(library: TipLibrary, settings: ContentSettings, slug: String): Tip {
    if (!settings.publicEnabled) throw TipNotFound(slug)
    val tip = library.all()[slug] ?: throw TipNotFound(slug)
    if (tip.quiz == null) throw QuizNotFound(slug)
    return tip
}

/** 로그인 없이 맞혀 보기(FR-8) — 채점만, 기록 0. 정답 · 풀이는 고른 뒤에만 나간다 */
open class GradeQuiz(private val library: TipLibrary, private val settings: ContentSettings) {
    fun execute(slug: String, choice: Int): TipQuiz.Graded = quizOf(library, settings, slug).quiz!!.grade(choice)
}

/**
 * 로그인한 사람의 풀이(FR-8) — 채점 + 기록. 한 번이라도 맞히면 카드([QuizRecord.correctAt]).
 * [Result.collected] 는 **이번 풀이로 처음** 카드가 됐을 때만 true — 화면이 "모음에 담았어요"를 한 번만 말한다.
 */
open class AnswerQuiz(private val library: TipLibrary, private val answers: QuizAnswers, private val settings: ContentSettings, private val clock: Clock) {
    data class Result(val graded: TipQuiz.Graded, val collected: Boolean)

    @Transactional(transactionManager = CONTENT_TX)
    open fun execute(userId: String, slug: String, choice: Int): Result {
        val graded = quizOf(library, settings, slug).quiz!!.grade(choice)
        // DB 시각은 마이크로초 — 돌려받은 카드 시각과 같은지로 "이번에 처음"을 가른다
        val at = clock.instant().truncatedTo(ChronoUnit.MICROS)
        val record = answers.record(userId, slug, graded.correct, at)
        return Result(graded, graded.correct && record.correctAt == at)
    }
}

/**
 * 맞힌 카드 모음(FR-8) — 최근 것 먼저. 원문에서 빠진 글 · 퀴즈가 없어진 글의 카드는 보이지 않는다(기록은 남는다 — 다시 생기면 돌아온다).
 * [View.available] = 지금 풀 수 있는 문제 수(모음의 분모). 공개 전이면 둘 다 0.
 */
open class ListQuizCards(private val library: TipLibrary, private val answers: QuizAnswers, private val settings: ContentSettings) {
    data class Card(val tip: Tip, val collectedAt: Instant)

    data class View(val cards: List<Card>, val available: Int)

    @Transactional(transactionManager = CONTENT_TX, readOnly = true)
    open fun execute(userId: String): View {
        if (!settings.publicEnabled) return View(emptyList(), 0)
        val quizzes = library.all().filterValues { it.quiz != null }
        val cards = answers.collected(userId).mapNotNull { r -> quizzes[r.slug]?.let { tip -> r.correctAt?.let { Card(tip, it) } } }
        return View(cards, quizzes.size)
    }
}

/** 때맞춘 팁(FR-4) — 화면 맥락 하나에 0~1건. 개인 신호는 이 사용자 것만(`user_id` 조건). */
open class TipForMe(
    private val library: TipLibrary,
    private val rules: TriggerRules,
    private val signals: UserSignals,
    private val dismissals: Dismissals,
    private val settings: ContentSettings,
    private val clock: Clock,
) {
    @Transactional(transactionManager = CONTENT_TX, readOnly = true)
    open fun execute(userId: String, rawContext: String?): TimelyTipPicker.Pick? {
        val context = TipContext.parse(rawContext) ?: throw InvalidContext(rawContext)
        if (!settings.publicEnabled) return null
        val now = clock.instant()
        return TimelyTipPicker.pick(
            context = context,
            today = clock.kstToday(),
            now = now,
            rules = rules.active(),
            tips = library.all(),
            signals = signals.recent(userId, now.minusSeconds(TimelyTipPicker.SIGNAL_DAYS * 86_400)),
            dismissed = dismissals.dismissed(userId),
        )
    }
}

/** 닫기(FR-4) — 한 번 닫으면 다시 안 띄움. 없는 글이면 404(남의 글 · 지어낸 slug 를 쌓지 않는다). 두 번 닫아도 같다. */
open class DismissTip(private val library: TipLibrary, private val dismissals: Dismissals, private val clock: Clock) {
    @Transactional(transactionManager = CONTENT_TX)
    open fun execute(userId: String, slug: String) {
        if (slug !in library.all()) throw TipNotFound(slug)
        dismissals.dismiss(userId, slug, clock.instant())
    }
}

/**
 * 내 숫자로 다시 읽기(FR-6, 금융 팁 S2d) — 사실([MyFacts])은 BFF 가 저축 · 가계부에서 읽어 넘긴다(서비스끼리 부르지 않는다).
 * 숫자는 오늘(KST) 유효한 제도 파라미터로. 사실은 저장하지 않는다 — 계산만(급여는 민감 정보). 공개 전이면 글과 같이 404.
 */
open class ReadMyNumbers(private val library: TipLibrary, private val params: PolicyParams, private val settings: ContentSettings, private val clock: Clock) {
    @Transactional(transactionManager = CONTENT_TX, readOnly = true)
    open fun execute(slug: String, facts: MyFacts): MyReading {
        if (!settings.publicEnabled) throw TipNotFound(slug)
        val tip = library.all()[slug] ?: throw TipNotFound(slug)
        val kind = tip.myNumbers ?: throw MyNumbersNotFound(slug)
        val today = clock.kstToday()
        return MyNumbers.read(kind, facts) { key -> params.valueAt(key, today) }
    }
}

/** 제도 파라미터 조회(FR-3) — 키 · 기준일 → 그날 유효한 줄. */
open class GetPolicyParam(private val params: PolicyParams) {
    @Transactional(transactionManager = CONTENT_TX, readOnly = true)
    open fun execute(key: String, on: LocalDate): PolicyParam = params.valueAt(key, on) ?: throw PolicyParamNotFound(key, on)
}

/**
 * 구독 — `savings.GoalCreated`(결혼 · 주거) · `savings.GoalReached` · `household.FixedCostIncreased`(주거, S2d) 를 신호로 남긴다. 같은 이벤트 두 번 = 한 번분.
 * 트리거가 붙지 않는 템플릿(여행 · 차 …) · 분류(식비 …)는 아무것도 남기지 않는다 — 처리 기록만(다시 와도 다시 보지 않게).
 */
open class RecordSignal(private val signals: UserSignals) {
    @Transactional(transactionManager = CONTENT_TX)
    open fun execute(eventId: UUID, eventType: String, userId: String, kind: TriggerKind?, occurredAt: Instant): Boolean =
        signals.recordOnce(eventId, eventType, kind?.let { UserSignal(userId, it, occurredAt) })
}
