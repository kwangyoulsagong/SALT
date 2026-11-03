package com.salt.savings.application

import com.salt.kernel.Money
import com.salt.savings.domain.Calculation
import com.salt.savings.domain.Deposit
import com.salt.savings.domain.DepositTotals
import com.salt.savings.domain.Deposits
import com.salt.savings.domain.Frame
import com.salt.savings.domain.Goal
import com.salt.savings.domain.GoalId
import com.salt.savings.domain.GoalNotFound
import com.salt.savings.domain.GoalStatus
import com.salt.savings.domain.GoalTemplate
import com.salt.savings.domain.Goals
import com.salt.savings.domain.InterestPlan
import com.salt.savings.domain.InvalidGoal
import com.salt.savings.domain.IssuedProjection
import com.salt.savings.domain.Milestone
import com.salt.savings.domain.Projection
import com.salt.savings.domain.ProjectionEngine
import com.salt.savings.domain.Projections
import com.salt.savings.domain.SavingsEvents
import com.salt.savings.domain.SavingsMath
import com.salt.savings.domain.progressOf
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.util.UUID

/** savings 서비스의 트랜잭션 매니저 이름 — 서비스마다 DB 계정이 달라 매니저도 따로다(`ServiceDatabase`). */
const val SAVINGS_TX = "savingsTx"

/** 날짜 해석은 한국 시간 — "이번 달" · 적립일이 사용자의 달력과 같아야 한다. 저장 시각은 UTC Instant */
val KST: ZoneId = ZoneId.of("Asia/Seoul")

fun Clock.todayKst(): LocalDate = LocalDate.ofInstant(instant(), KST)

/** 목록 · 상세가 같이 쓰는 한 목표의 계산 결과 — 숫자는 전부 여기서 나온다(프론트 계산 0) */
data class GoalSummary(
    val goal: Goal,
    val saved: Money,
    val remaining: Money,
    /** 0~1 */
    val progress: BigDecimal,
    val frame: Frame,
    val depositCount: Int,
    val lastDepositedOn: LocalDate?,
    val milestone: Milestone,
    val projection: Projection,
) {
    /** 구간 계산이 실패해 계획값만 있다 — 응답 `degraded` · `degradedReasons` */
    val degraded: Boolean get() = projection.reason == com.salt.savings.domain.ProjectionReason.DEGRADED
}

data class GoalDetail(
    val summary: GoalSummary,
    val recentDeposits: List<Deposit>,
    /** 지금 상태로 다시 계산한 기한 · 월 적립(만들기 화면과 같은 계산) */
    val plan: Calculation,
)

/** 템플릿 기준선 — 원문 대조 전이라 금액을 내리지 않는다(슬라이스 판단 3). 열린 질문이 닫히면 값 + 출처 + 기준 연도 */
data class TemplateInfo(val template: GoalTemplate, val baseline: Baseline?, val baselineReason: String?) {
    data class Baseline(val amount: Money, val source: String, val year: Int, val verified: Boolean)
}

class ListTemplates {
    fun execute(): List<TemplateInfo> = GoalTemplate.entries.map { TemplateInfo(it, null, "unverified_source") }
}

/** 저장하지 않는 계산(`SRV-REQ-045` FR-3) — 만들기 화면이 입력 중에 부른다 */
class Calculate(private val clock: Clock) {
    data class Command(val target: Money, val saved: Money, val deadline: LocalDate?, val monthly: Money?, val interest: InterestPlan?)

    fun execute(cmd: Command): Calculation {
        if (cmd.target.isNegative() || cmd.target.isZero()) throw InvalidGoal("GOAL_AMOUNT_INVALID", "targetAmount must be positive")
        val today = clock.todayKst()
        return when {
            cmd.monthly != null -> {
                if (cmd.monthly.isNegative() || cmd.monthly.isZero()) throw InvalidGoal("GOAL_MONTHLY_INVALID", "monthly must be positive")
                SavingsMath.byMonthly(cmd.target, cmd.saved, cmd.monthly, cmd.interest, today)
            }
            cmd.deadline != null -> SavingsMath.byDeadline(cmd.target, cmd.saved, cmd.deadline, cmd.interest, today)
            else -> throw InvalidGoal("GOAL_PLAN_REQUIRED", "deadline or monthly is required")
        }
    }
}

/**
 * 목록 · 상세 · 쓰기 응답이 같은 모양을 쓰게 하는 조립. **구간은 늘 지금 기준으로 다시 계산한다** — 발행 기록(`projection_issued`)은 채점 보관용이고
 * 화면이 읽으면 시간이 지나 낡고 · 목록과 상세가 갈리고 · 실패(`degraded`)가 가려진다(코드 리뷰 2026-11-03).
 * 쿼리: 목록 3회(목표 · 적립 집계 · 월별 적립) · 상세 4회(목표 · 그 목표 집계 · 월별 · 최근 적립)
 */
open class GoalReader(
    private val goals: Goals,
    private val deposits: Deposits,
    private val clock: Clock,
) {
    fun summaries(userId: String): List<GoalSummary> {
        val today = clock.todayKst()
        val list = goals.listOwned(userId)
        if (list.isEmpty()) return emptyList()
        val totals = deposits.totalsByGoal(userId, YearMonth.from(today))
        val monthly = deposits.monthlyByGoal(userId)
        return list.map { goal -> summarize(goal, totals[goal.id], monthly[goal.id].orEmpty(), today) }
    }

    fun detail(userId: String, rawId: String): GoalDetail {
        val id = GoalId.parse(rawId) ?: throw GoalNotFound(rawId)
        val goal = goals.findOwned(id, userId) ?: throw GoalNotFound(rawId)
        val today = clock.todayKst()
        val totals = deposits.totalsFor(goal.id, YearMonth.from(today))
        val summary = summarize(goal, totals, deposits.monthly(goal.id), today)
        val plan = when {
            goal.targetDate != null -> SavingsMath.byDeadline(goal.targetAmount, summary.saved, goal.targetDate!!, goal.interest, today)
            else -> SavingsMath.byMonthly(goal.targetAmount, summary.saved, goal.monthlyPlan!!, goal.interest, today)
        }
        return GoalDetail(summary, deposits.recent(goal.id, RECENT_LIMIT), plan)
    }

    private fun summarize(goal: Goal, totals: DepositTotals?, monthly: List<com.salt.savings.domain.MonthlyDeposit>, today: LocalDate): GoalSummary {
        val zero = Money.zero(goal.targetAmount.currency)
        val saved = totals?.saved ?: zero
        val remainingRaw = goal.targetAmount - saved
        val progress = progressOf(saved, goal.targetAmount)
        val projection = ProjectionEngine.safely(goal, saved, today) { ProjectionEngine.project(goal, saved, monthly, today) }
        return GoalSummary(
            goal = goal,
            saved = saved,
            remaining = if (remainingRaw.isNegative()) zero else remainingRaw,
            progress = progress,
            frame = Frame.of(progress),
            depositCount = totals?.count ?: 0,
            lastDepositedOn = totals?.lastDepositedOn,
            milestone = Milestone.of(goal, totals?.thisMonth ?: zero, today, saved),
            projection = projection,
        )
    }

    companion object {
        const val RECENT_LIMIT = 20
    }
}

open class ListGoals(private val reader: GoalReader) {
    @Transactional(transactionManager = SAVINGS_TX, readOnly = true)
    open fun execute(userId: String): List<GoalSummary> = reader.summaries(userId)
}

open class GetGoal(private val reader: GoalReader) {
    @Transactional(transactionManager = SAVINGS_TX, readOnly = true)
    open fun execute(userId: String, goalId: String): GoalDetail = reader.detail(userId, goalId)
}

/** 구간 발행 — 상태가 바뀐 쓰기(만들기 · 적립) 뒤에만. 조회는 발행하지 않는다(슬라이스 판단 5) */
class ProjectionIssuer(
    private val deposits: Deposits,
    private val projections: Projections,
    private val events: SavingsEvents,
    private val clock: Clock,
) {
    /** @return 발행 기록. 구간 계산이 실패하면(degraded) 발행하지 않고 null — 채점 근거에 실패한 구간을 남기지 않는다 */
    fun issue(goal: Goal, saved: Money): IssuedProjection? {
        val history = deposits.monthly(goal.id)
        val today = clock.todayKst()
        val projection = ProjectionEngine.safely(goal, saved, today) { ProjectionEngine.project(goal, saved, history, today) }
        if (projection.reason == com.salt.savings.domain.ProjectionReason.DEGRADED) return null
        val issued = IssuedProjection(UUID.randomUUID(), goal.id, clock.instant(), projection)
        projections.issue(issued)
        events.projectionIssued(issued)
        return issued
    }
}

open class CreateGoal(
    private val goals: Goals,
    private val issuer: ProjectionIssuer,
    private val events: SavingsEvents,
    private val reader: GoalReader,
    private val clock: Clock,
) {
    data class Command(
        val userId: String,
        val title: String,
        val template: GoalTemplate,
        val targetAmount: Money,
        val targetDate: LocalDate?,
        val monthlyPlan: Money?,
        val interest: InterestPlan?,
    )

    @Transactional(transactionManager = SAVINGS_TX)
    open fun execute(cmd: Command): GoalDetail {
        val goal = Goal.create(cmd.userId, cmd.title, cmd.template, cmd.targetAmount, cmd.targetDate, cmd.monthlyPlan, cmd.interest, clock.todayKst(), clock.instant())
        goals.save(goal)
        events.goalCreated(goal)
        issuer.issue(goal, Money.zero(goal.targetAmount.currency))
        return reader.detail(cmd.userId, goal.id.toString())
    }
}

/**
 * 적립 — 단건과 나눠 넣기가 같은 길을 지난다. 목표 행을 잠그고(동시 적립 두 건이 둘 다 "달성"을 내지 않게) 기록 → 달성 확인 → 구간 발행.
 */
open class RecordDeposits(
    private val goals: Goals,
    private val deposits: Deposits,
    private val issuer: ProjectionIssuer,
    private val events: SavingsEvents,
    private val reader: GoalReader,
    private val clock: Clock,
) {
    data class Part(val goalId: String, val amount: Money)

    data class Result(val goals: List<GoalDetail>, val splitGroupId: UUID?)

    @Transactional(transactionManager = SAVINGS_TX)
    open fun single(userId: String, goalId: String, amount: Money, depositedOn: LocalDate?, note: String?): GoalDetail =
        record(userId, listOf(Part(goalId, amount)), depositedOn, note, null).goals.single()

    /**
     * 여러 목표에 나눠 넣기(`SRV-REQ-045` FR-4) — [total] 과 나눈 합이 같아야 한다. 같은 목표가 두 번 나오면 거부(합칠지 나눌지 모른다)
     */
    @Transactional(transactionManager = SAVINGS_TX)
    open fun split(userId: String, total: Money, parts: List<Part>, depositedOn: LocalDate?, note: String?): Result {
        if (parts.size < 2) throw InvalidGoal("SPLIT_TOO_FEW", "split needs at least 2 parts")
        // 파싱한 id 로 비교한다 — 문자열로 보면 대소문자만 다른 같은 목표가 두 번 들어가 달성이 두 번 난다(코드 리뷰 2026-11-03)
        val ids = parts.map { GoalId.parse(it.goalId) ?: throw GoalNotFound(it.goalId) }
        if (ids.toSet().size != ids.size) throw InvalidGoal("SPLIT_DUPLICATE_GOAL", "each goal may appear once")
        val sum = parts.map { it.amount }.reduce(Money::plus)
        if (sum != total) throw InvalidGoal("SPLIT_SUM_MISMATCH", "parts must add up to total")
        return record(userId, parts, depositedOn, note, UUID.randomUUID())
    }

    private fun record(userId: String, parts: List<Part>, depositedOn: LocalDate?, note: String?, splitGroupId: UUID?): Result {
        val today = clock.todayKst()
        val now = clock.instant()
        val day = depositedOn ?: today
        // 잠금 순서를 UUID 순으로 — 두 나눠 넣기가 같은 목표 둘을 반대 순서로 잡아 교착하지 않게(문자열 순은 대소문자에 따라 달라진다)
        val parsed = parts.map { part -> (GoalId.parse(part.goalId) ?: throw GoalNotFound(part.goalId)) to part }
        val locked = parsed.sortedBy { it.first.value }.map { (id, part) ->
            val goal = goals.lockOwned(id, userId) ?: throw GoalNotFound(part.goalId)
            goal to part
        }
        locked.forEach { (goal, part) -> deposits.add(Deposit.manual(goal, part.amount, day, note, splitGroupId, today, now)) }

        val totals = deposits.totalsByGoal(userId, YearMonth.from(today))
        locked.forEach { (goal, _) ->
            val saved = totals[goal.id]?.saved ?: Money.zero(goal.targetAmount.currency)
            val current = if (goal.status != GoalStatus.COMPLETED && saved >= goal.targetAmount) {
                goals.markCompleted(goal.id, now)
                events.goalReached(goal, now)
                goal.withCompleted(now)
            } else {
                goal
            }
            issuer.issue(current, saved)
        }
        val details = parsed.map { (id, _) -> reader.detail(userId, id.toString()) }
        return Result(details, splitGroupId)
    }
}

/** 목표가 있나 — 온보딩 `set_plan` 프로브(Express)가 부른다. 홈 카드 전체 조립을 빌리지 않는다(코드 리뷰 2026-11-03) */
open class HasGoals(private val goals: Goals) {
    @Transactional(transactionManager = SAVINGS_TX, readOnly = true)
    open fun execute(userId: String): Boolean = goals.existsFor(userId)
}

/** 홈 저축 카드(`SRV-REQ-045` FR-15 · `BFF-REQ-046`) — 숫자만. 문장 · 포맷은 BFF 카드 계약이 한다 */
open class HomeCard(private val reader: GoalReader) {
    data class View(
        val totalGoals: Int,
        val activeGoals: Int,
        val totalSaved: Money?,
        /** 진척이 가장 큰 진행 중 목표 — 다 찬 목표는 빼고 */
        val nearest: GoalSummary?,
    )

    @Transactional(transactionManager = SAVINGS_TX, readOnly = true)
    open fun execute(userId: String): View {
        val all = reader.summaries(userId)
        val active = all.filter { it.goal.status == GoalStatus.ACTIVE }
        return View(
            totalGoals = all.size,
            activeGoals = active.size,
            totalSaved = all.map { it.saved }.reduceOrNull(Money::plus),
            nearest = active.maxByOrNull { it.progress },
        )
    }
}
