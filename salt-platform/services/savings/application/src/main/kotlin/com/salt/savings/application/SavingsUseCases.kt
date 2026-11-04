package com.salt.savings.application

import com.salt.kernel.Currency
import com.salt.kernel.Money
import com.salt.savings.domain.Calculation
import com.salt.savings.domain.Deposit
import com.salt.savings.domain.DepositTotals
import com.salt.savings.domain.Deposits
import com.salt.savings.domain.Frame
import com.salt.savings.domain.Goal
import com.salt.savings.domain.GoalClock
import com.salt.savings.domain.GoalId
import com.salt.savings.domain.GoalNotFound
import com.salt.savings.domain.GoalStatus
import com.salt.savings.domain.GoalTemplate
import com.salt.savings.domain.Goals
import com.salt.savings.domain.InterestPlan
import com.salt.savings.domain.InvalidGoal
import com.salt.savings.domain.ItemUnit
import com.salt.savings.domain.ItemUnits
import com.salt.savings.domain.MissedMonths
import com.salt.savings.domain.MonthlyDeposit
import com.salt.savings.domain.Postcard
import com.salt.savings.domain.EmergencyComparison
import com.salt.savings.domain.ItemUnitLimit
import com.salt.savings.domain.ItemUnitNotFound
import com.salt.savings.domain.Scene
import com.salt.savings.domain.Simulation
import com.salt.savings.domain.SimulationRow
import com.salt.savings.domain.stampCount
import com.salt.savings.domain.IssuedProjection
import com.salt.savings.domain.Milestone
import com.salt.savings.domain.Projection
import com.salt.savings.domain.ProjectionEngine
import com.salt.savings.domain.ProjectionReason
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

/** 응답 `degradedReasons` 값 — 구간 · 놓친 달. 문장은 프론트 */
const val DEGRADED_PROJECTION = "projection"
const val DEGRADED_MISSED_MONTHS = "missed_months"

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
    /** 모이는 장면 단계(FR-16) */
    val scene: Scene,
    /** 도장 수 — 첫 도장 + 직접 넣은 적립(FR-17) */
    val stamps: Int,
    /** 다 찬 목표의 엽서(FR-18). 진행 중이면 null */
    val postcard: Postcard?,
    /** 이 목표의 실물 단위(FR-16) — 만든 순서. 목록은 첫 단위로 한 줄 환산 */
    val units: List<ItemUnit>,
) {
    /** 구간 계산이 실패해 계획값만 있다 — 응답 `degraded` · `degradedReasons` */
    val degraded: Boolean get() = projection.reason == ProjectionReason.DEGRADED

    /** 이 목표 칸의 불완전 이유 — 목록 · 상세 · 쓰기 응답이 같은 값을 쓴다(규칙 한 곳, 리뷰 11차) */
    val degradedReasons: List<String> get() = if (degraded) listOf(DEGRADED_PROJECTION) else emptyList()
}

data class GoalDetail(
    val summary: GoalSummary,
    val recentDeposits: List<Deposit>,
    /** 지금 상태로 다시 계산한 기한 · 월 적립(만들기 화면과 같은 계산) */
    val plan: Calculation,
    /** 놓친 달 회고(FR-11) */
    val missedMonths: MissedMonths,
) {
    /**
     * 이 상세 어디든 계산이 불완전하면 그 칸 이름 — 구간(`projection`) · 놓친 달(`missed_months`). 응답 최상위 `degraded` 의 근거(리뷰 9 · 10차).
     * goal 칸(`GoalSummary.degraded`)은 목록 · 쓰기와 같은 모양으로 두고, 상세에만 있는 칸은 여기서 더한다
     */
    val degradedReasons: List<String>
        get() = summary.degradedReasons + if (missedMonths.reason == ProjectionReason.DEGRADED) listOf(DEGRADED_MISSED_MONTHS) else emptyList()
}

/** 놓친 달 계산 자리 — 기본은 [MissedMonths.of]. 테스트가 실패를 주입하는 자리(구간 `ProjectionEngine.safely` 의 compute 와 같은 구실) */
fun interface MissedMonthsCalculator {
    fun calculate(goal: Goal, saved: Money, history: List<MonthlyDeposit>, startMonth: YearMonth, today: LocalDate, endMonth: YearMonth?): MissedMonths
}

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
 * 쿼리: 목록 3회(목표 · 적립 집계+월별 한 문장 · 실물 단위) · 상세 5회(목표 · 그 목표 집계 · 월별 · 최근 적립 · 단위)
 */
open class GoalReader(
    private val goals: Goals,
    private val deposits: Deposits,
    private val units: ItemUnits,
    private val clock: Clock,
    private val missedMonthsOf: MissedMonthsCalculator = MissedMonthsCalculator(MissedMonths::of),
) {
    /** @param withUnits 실물 단위까지 — 홈 카드는 쓰지 않아 쿼리 하나를 아낀다(코드 리뷰 2026-11-03) */
    fun summaries(userId: String, withUnits: Boolean = true): List<GoalSummary> {
        val today = clock.todayKst()
        val list = goals.listOwned(userId)
        if (list.isEmpty()) return emptyList()
        val overview = deposits.overviewByGoal(userId, YearMonth.from(today))
        val unitsByGoal = if (withUnits) units.byGoal(userId) else emptyMap()
        return list.map { goal -> summarize(goal, overview.totals[goal.id], overview.monthly[goal.id].orEmpty(), unitsByGoal[goal.id].orEmpty(), today) }
    }

    fun detail(userId: String, rawId: String): GoalDetail {
        val id = GoalId.parse(rawId) ?: throw GoalNotFound(rawId)
        val goal = goals.findOwned(id, userId) ?: throw GoalNotFound(rawId)
        val today = clock.todayKst()
        val totals = deposits.totalsFor(goal.id, YearMonth.from(today))
        val history = deposits.monthly(goal.id)
        val summary = summarize(goal, totals, history, units.forGoal(goal.id, userId), today)
        val plan = when {
            goal.targetDate != null -> SavingsMath.byDeadline(goal.targetAmount, summary.saved, goal.targetDate!!, goal.interest, today)
            else -> SavingsMath.byMonthly(goal.targetAmount, summary.saved, goal.monthlyPlan!!, goal.interest, today)
        }
        // 놓친 달 계산이 실패해도 상세 전체를 잃지 않는다 — 그 칸만 degraded(구간 `ProjectionEngine.safely` 와 같은 원칙, 리뷰 7차)
        val missed = try {
            missedMonthsOf.calculate(
                goal, summary.saved, history,
                YearMonth.from(goal.createdAt.atZone(KST)),
                today,
                goal.completedAt?.let { YearMonth.from(it.atZone(KST)) },
            )
        } catch (e: RuntimeException) {
            // 삼키지 않는다 — 결함이 영구 degraded 로 숨지 않게 남긴다(목표 id · 예외만, 금액 0 — `kotlin-platform.md` §6, 리뷰 8차)
            log.log(System.Logger.Level.ERROR, "missed months failed goal=${goal.id}", e)
            MissedMonths.degraded()
        }
        return GoalDetail(summary, deposits.recent(goal.id, RECENT_LIMIT), plan, missed)
    }

    /** 저울용 — 사용자 목표 전부와 집계 · 월별 적립(쿼리 2) */
    fun simulationInputs(userId: String): Triple<List<Goal>, Map<GoalId, DepositTotals>, Map<GoalId, List<MonthlyDeposit>>> {
        val today = clock.todayKst()
        val list = goals.listOwned(userId)
        if (list.isEmpty()) return Triple(emptyList(), emptyMap(), emptyMap())
        val overview = deposits.overviewByGoal(userId, YearMonth.from(today))
        return Triple(list, overview.totals, overview.monthly)
    }

    private fun summarize(goal: Goal, totals: DepositTotals?, monthly: List<MonthlyDeposit>, goalUnits: List<ItemUnit>, today: LocalDate): GoalSummary {
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
            scene = Scene.of(goal.template, progress),
            stamps = stampCount(totals?.actions ?: 0),
            postcard = goal.completedAt?.takeIf { goal.status == GoalStatus.COMPLETED }?.let {
                Postcard.of(LocalDate.ofInstant(goal.createdAt, KST), LocalDate.ofInstant(it, KST), totals?.actions ?: 0)
            },
            units = goalUnits,
        )
    }

    companion object {
        const val RECENT_LIMIT = 20
        /** JDK 내장 로거 — application 모듈에 로깅 라이브러리를 더하지 않는다(`kotlin-platform.md` §1 표 밖). Spring Boot 가 JUL 을 같은 로그로 잇는다 */
        private val log: System.Logger = System.getLogger(GoalReader::class.java.name)
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
        if (projection.reason == ProjectionReason.DEGRADED) return null
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

        locked.forEach { (goal, _) ->
            // 잠근 목표만 — 사용자 전체를 훑지 않는다
            val saved = deposits.totalsFor(goal.id, YearMonth.from(today))?.saved ?: Money.zero(goal.targetAmount.currency)
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
        val all = reader.summaries(userId, withUnits = false)
        val active = all.filter { it.goal.status == GoalStatus.ACTIVE }
        return View(
            totalGoals = all.size,
            activeGoals = active.size,
            totalSaved = all.map { it.saved }.reduceOrNull(Money::plus),
            nearest = active.maxByOrNull { it.progress },
        )
    }
}

/**
 * 목표 시계 조회(`SRV-REQ-045` FR-17 "가계부 응답용 조회 API") — 홈 카드와 같은 "가장 가까운 목표"(진척이 가장 큰 진행 중 목표)를 고른다.
 * 저장하지 않는다. 쿼리 3회(목록 읽기와 같다 — 실물 단위 제외)
 */
open class GoalClockQuery(private val reader: GoalReader, private val clock: Clock) {
    data class View(val goal: Goal?, val delayDays: Long?, val reason: String?)

    @Transactional(transactionManager = SAVINGS_TX, readOnly = true)
    open fun execute(userId: String, amount: Money): View {
        if (amount.isNegative() || amount.isZero()) throw InvalidGoal("CLOCK_AMOUNT_INVALID", "amount must be positive")
        val nearest = reader.summaries(userId, withUnits = false).filter { it.goal.status == GoalStatus.ACTIVE }.maxByOrNull { it.progress }
            ?: return View(null, null, GoalClock.NO_ACTIVE_GOAL)
        val goal = nearest.goal
        val pace = goal.monthlyPlan
            ?: goal.targetDate?.let { SavingsMath.byDeadline(goal.targetAmount, nearest.saved, it, goal.interest, clock.todayKst()).monthly }
        if (pace == null || pace.isZero() || pace.isNegative()) return View(goal, null, GoalClock.NO_PLAN)
        return View(goal, GoalClock.delayDays(amount, pace), null)
    }
}

/**
 * 목표 저울 — 저장하지 않는다(`SRV-REQ-045` FR-7). 바꾸지 않은 목표도 같이 돌려준다: 화면이 옮긴 돈의 합(전 · 후)을 한눈에 보게.
 * 다 찬 · 멈춘 목표는 옮길 대상이 아니다(진행 중만). 쿼리 2회 · 계산은 메모리 — 예산 300ms(FEATURE-012 비기능)
 */
open class SimulateBalance(private val reader: GoalReader, private val clock: Clock) {
    data class Change(val goalId: String, val monthly: Money)

    data class Result(val rows: List<SimulationRow>, val totalBefore: Money, val totalAfter: Money)

    @Transactional(transactionManager = SAVINGS_TX, readOnly = true)
    open fun execute(userId: String, changes: List<Change>): Result {
        if (changes.size > Simulation.MAX_GOALS) throw InvalidGoal("SIMULATE_TOO_MANY", "at most ${Simulation.MAX_GOALS} goals")
        val parsed = changes.associate { (GoalId.parse(it.goalId) ?: throw GoalNotFound(it.goalId)) to it.monthly }
        if (parsed.size != changes.size) throw InvalidGoal("SIMULATE_DUPLICATE_GOAL", "each goal may appear once")
        val today = clock.todayKst()
        val (goals, totals, monthly) = reader.simulationInputs(userId)
        val active = goals.filter { it.status == GoalStatus.ACTIVE }
        parsed.keys.firstOrNull { id -> active.none { it.id == id } }?.let { throw GoalNotFound(it.toString()) }
        val rows = active.map { goal ->
            val saved = totals[goal.id]?.saved ?: Money.zero(goal.targetAmount.currency)
            Simulation.row(goal, parsed[goal.id], saved, monthly[goal.id].orEmpty(), today)
        }
        val zero = Money.zero(Currency.KRW)
        return Result(
            rows,
            rows.mapNotNull { it.monthlyBefore }.fold(zero, Money::plus),
            rows.mapNotNull { it.monthlyAfter }.fold(zero, Money::plus),
        )
    }
}

/**
 * 저울 확정 — [확정]을 누른 목표만 계획 월 적립을 바꾼다(FEATURE-012 FR-6 "확정할 때만 저장"). 잠금은 UUID 순(교착 방지 — 나눠 넣기와 같은 규칙),
 * 상태가 바뀌었으니 구간을 다시 발행한다(슬라이스 S1a 판단 5)
 */
open class UpdateMonthlyPlans(
    private val goals: Goals,
    private val issuer: ProjectionIssuer,
    private val deposits: Deposits,
    private val reader: GoalReader,
    private val clock: Clock,
) {
    data class Change(val goalId: String, val monthly: Money)

    @Transactional(transactionManager = SAVINGS_TX)
    open fun execute(userId: String, changes: List<Change>): List<GoalSummary> {
        if (changes.isEmpty()) throw InvalidGoal("PLAN_CHANGES_EMPTY", "at least one change")
        if (changes.size > Simulation.MAX_GOALS) throw InvalidGoal("SIMULATE_TOO_MANY", "at most ${Simulation.MAX_GOALS} goals")
        val parsed = changes.map { (GoalId.parse(it.goalId) ?: throw GoalNotFound(it.goalId)) to it.monthly }
        if (parsed.map { it.first }.toSet().size != parsed.size) throw InvalidGoal("SIMULATE_DUPLICATE_GOAL", "each goal may appear once")
        val now = clock.instant()
        val thisMonth = YearMonth.from(clock.todayKst())
        parsed.sortedBy { it.first.value }.forEach { (id, monthly) ->
            val goal = goals.lockOwned(id, userId) ?: throw GoalNotFound(id.toString())
            if (goal.status != GoalStatus.ACTIVE) throw InvalidGoal("GOAL_NOT_ACTIVE", "only active goals can change plan")
            val updated = goal.withMonthlyPlan(monthly)
            goals.updateMonthlyPlan(id, monthly, now)
            // 잠근 뒤에 읽는다 — 그 사이 들어온 적립이 발행 기록(채점 근거)에서 빠지지 않게(코드 리뷰 2026-11-03)
            issuer.issue(updated, deposits.totalsFor(id, thisMonth)?.saved ?: Money.zero(goal.targetAmount.currency))
        }
        return reader.summaries(userId)
    }
}

/** 비상시 비교 — 저장하지 않는다(`SRV-REQ-045` FR-12). 금리는 사용자가 넣은 숫자, 상품 · 링크 0 */
open class CompareEmergency(private val goals: Goals, private val deposits: Deposits, private val clock: Clock) {
    data class Command(val userId: String, val goalId: String, val amount: Money, val loanRatePercent: BigDecimal, val loanMonths: Int)

    @Transactional(transactionManager = SAVINGS_TX, readOnly = true)
    open fun execute(cmd: Command): EmergencyComparison {
        val id = GoalId.parse(cmd.goalId) ?: throw GoalNotFound(cmd.goalId)
        val goal = goals.findOwned(id, cmd.userId) ?: throw GoalNotFound(cmd.goalId)
        val today = clock.todayKst()
        val saved = deposits.totalsFor(id, YearMonth.from(today))?.saved ?: Money.zero(goal.targetAmount.currency)
        return EmergencyComparison.of(goal, saved, cmd.amount, cmd.loanRatePercent, cmd.loanMonths, today)
    }
}

/** 실물 단위 만들기 — 목표 하나에 [ItemUnit.PER_GOAL_MAX] 개까지. 목표 행을 잠가 동시 두 요청이 상한을 넘지 않게 */
open class AddItemUnit(private val goals: Goals, private val units: ItemUnits, private val reader: GoalReader, private val clock: Clock) {
    @Transactional(transactionManager = SAVINGS_TX)
    open fun execute(userId: String, goalId: String, name: String, unitPrice: Money): GoalDetail {
        val id = GoalId.parse(goalId) ?: throw GoalNotFound(goalId)
        val goal = goals.lockOwned(id, userId) ?: throw GoalNotFound(goalId)
        if (units.countFor(id, userId) >= ItemUnit.PER_GOAL_MAX) throw ItemUnitLimit()
        units.add(ItemUnit.create(goal, name, unitPrice, clock.instant()))
        return reader.detail(userId, goalId)
    }
}

open class DeleteItemUnit(private val units: ItemUnits, private val reader: GoalReader) {
    @Transactional(transactionManager = SAVINGS_TX)
    open fun execute(userId: String, goalId: String, unitId: String): GoalDetail {
        val id = GoalId.parse(goalId) ?: throw GoalNotFound(goalId)
        val unit = runCatching { UUID.fromString(unitId) }.getOrNull() ?: throw ItemUnitNotFound(unitId)
        if (units.delete(unit, id, userId) == 0) throw ItemUnitNotFound(unitId)
        return reader.detail(userId, goalId)
    }
}
