package com.salt.savings.api

import com.salt.kernel.Money
import com.salt.savings.application.AddItemUnit
import com.salt.savings.application.Calculate
import com.salt.savings.application.CompareEmergency
import com.salt.savings.application.DeleteItemUnit
import com.salt.savings.application.SimulateBalance
import com.salt.savings.application.UpdateMonthlyPlans
import com.salt.savings.application.CreateGoal
import com.salt.savings.application.GetGoal
import com.salt.savings.application.GoalDetail
import com.salt.savings.application.GoalSummary
import com.salt.savings.application.HasGoals
import com.salt.savings.application.HomeCard
import com.salt.savings.application.ListGoals
import com.salt.savings.application.ListTemplates
import com.salt.savings.application.RecordDeposits
import com.salt.savings.domain.Calculation
import com.salt.savings.domain.EmergencyComparison
import com.salt.savings.domain.ItemUnit
import com.salt.savings.domain.Projection
import com.salt.savings.domain.Scene
import com.salt.savings.domain.GoalTemplate
import com.salt.savings.domain.InterestPlan
import com.salt.savings.domain.InvalidGoal
import com.salt.savings.domain.ProjectionReason
import com.salt.savings.domain.SavingsMath
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate

/**
 * 저축 서비스 HTTP(`SRV-REQ-045` · 슬라이스 S1a · S1b). **모든 금액 · 날짜 · 구간을 여기 응답이 준다** — BFF 는 중계, 프론트는 표시만.
 * 금액은 원 단위 정수로 응답 직전 1회 반올림(`toKrwInteger`, 이 층에서만 — ArchUnit). 문구는 내리지 않는다 — 상태 키만(FR-8).
 */
@Tag(name = "savings", description = "저축 목표 — 계산기 · 적립 · 도달 구간(SRV-REQ-045)")
@RestController
@RequestMapping("/api/savings")
class SavingsController(
    private val listTemplates: ListTemplates,
    private val calculate: Calculate,
    private val listGoals: ListGoals,
    private val getGoal: GetGoal,
    private val createGoal: CreateGoal,
    private val recordDeposits: RecordDeposits,
    private val homeCard: HomeCard,
    private val hasGoals: HasGoals,
    private val simulateBalance: SimulateBalance,
    private val updateMonthlyPlans: UpdateMonthlyPlans,
    private val compareEmergency: CompareEmergency,
    private val addItemUnit: AddItemUnit,
    private val deleteItemUnit: DeleteItemUnit,
) {
    // ---------- 요청 ----------

    data class CalculateRequest(
        @field:NotNull @field:Positive val targetAmount: BigDecimal?,
        @field:DecimalMin("0") val saved: BigDecimal?,
        val targetDate: LocalDate?,
        @field:Positive val monthly: BigDecimal?,
        val includeInterest: Boolean = false,
        @field:DecimalMin("0") @field:DecimalMax("30") val annualRate: BigDecimal?,
    )

    data class CreateGoalRequest(
        @field:NotBlank @field:Size(max = 100) val title: String?,
        @field:NotBlank val template: String?,
        @field:NotNull @field:Positive val targetAmount: BigDecimal?,
        val targetDate: LocalDate?,
        @field:Positive val monthlyPlan: BigDecimal?,
        val includeInterest: Boolean = false,
        @field:DecimalMin("0") @field:DecimalMax("30") val annualRate: BigDecimal?,
    )

    data class DepositRequest(
        @field:NotNull @field:Positive val amount: BigDecimal?,
        val depositedOn: LocalDate?,
        @field:Size(max = 200) val note: String?,
    )

    data class SplitPart(@field:NotBlank val goalId: String?, @field:NotNull @field:Positive val amount: BigDecimal?)

    data class SplitRequest(
        @field:NotNull @field:Positive val total: BigDecimal?,
        @field:NotEmpty @field:Valid val parts: List<SplitPart>?,
        val depositedOn: LocalDate?,
        @field:Size(max = 200) val note: String?,
    )

    data class PlanChange(@field:NotBlank val goalId: String?, @field:NotNull @field:Positive val monthly: BigDecimal?)

    data class PlanChangesRequest(@field:NotEmpty @field:Size(max = 20) @field:Valid val changes: List<PlanChange>?)

    data class EmergencyRequest(
        @field:NotNull @field:Positive val amount: BigDecimal?,
        @field:NotNull @field:DecimalMin("0") @field:DecimalMax("30") val loanRate: BigDecimal?,
        @field:NotNull @field:Min(1) @field:Max(120) val loanMonths: Int?,
    )

    data class ItemUnitRequest(@field:NotBlank @field:Size(max = 30) val name: String?, @field:NotNull @field:Positive val unitPrice: BigDecimal?)

    // ---------- 응답 ----------

    data class TemplateView(val key: String, val baseline: BaselineView?, val baselineReason: String?)

    data class BaselineView(val amount: Long, val source: String, val year: Int, val verified: Boolean)

    data class Assumptions(val interestTaxRatePercent: String, val interestOnSavedIncluded: Boolean)

    data class CalculationView(
        /** ok · reached · deadline_too_close · not_reachable */
        val state: String,
        val remaining: Long,
        val monthly: Long?,
        val months: Int?,
        /** "2027-11" */
        val reachMonth: String?,
        val expectedInterest: Long,
        val assumptions: Assumptions,
    )

    data class MilestoneView(val month: String, val deposited: Long, val plan: Long?, val difference: Long?, val state: String)

    data class ProjectionView(
        val method: String,
        val earlyMonth: String?,
        val lateMonth: String?,
        val planMonth: String?,
        val reason: String?,
        val monthsOfHistory: Int,
        /** 적중 이력 — 채점(FC-REQ-024)이 생기기 전엔 null 이고 [trackReason] 이 이유(FR-6: 둘 중 하나는 늘 있다) */
        val track: Any?,
        val trackReason: String?,
    )

    /** 모이는 장면 — kind 로 그림을, step/steps 로 칸을 고른다(FE 계산 0) */
    data class SceneView(val kind: String, val step: Int, val steps: Int)

    /** 실물 환산 한 줄 — 모은 돈으로 [count] 개(내림) */
    data class UnitView(val id: String, val name: String, val unitPrice: Long, val count: Long)

    data class PostcardView(val startedOn: String, val reachedOn: String, val daysTaken: Long, val depositCount: Int)

    data class MissedMonthsView(val observedMonths: Int, val skippedMonths: Int, val shiftMonths: Int?, val reason: String?)

    data class GoalView(
        val id: String,
        val title: String,
        val template: String,
        val status: String,
        val targetAmount: Long,
        val saved: Long,
        val remaining: Long,
        /** 0.0~100.0, 소수 한 자리 내림(99.96% 를 100.0 으로 보이지 않게) */
        val progressPercent: BigDecimal,
        /** 0~1, 소수 넷째 자리 내림 — 진척 막대용. 화면이 퍼센트를 나누지 않게(FE 계산 0) */
        val progressRatio: BigDecimal,
        val frame: String,
        val targetDate: String?,
        val monthlyPlan: Long?,
        val includeInterest: Boolean,
        val annualRate: String?,
        val depositCount: Int,
        val lastDepositedOn: String?,
        val createdAt: String,
        val completedAt: String?,
        val milestone: MilestoneView,
        val projection: ProjectionView,
        /** 구간 계산 실패 — projection 은 계획값만(`BFF-REQ-047` 수용 기준 2). 서버 응답 규약(`ddd-presentation.md` §5) */
        val degraded: Boolean,
        val degradedReasons: List<String>,
        val scene: SceneView,
        /** 도장 수 — 첫 도장 + 직접 넣은 적립(가져온 잔액 제외) */
        val stampCount: Int,
        /** 다 찬 목표만 */
        val postcard: PostcardView?,
        /** 첫 실물 단위의 환산 — 목록 한 줄. 단위가 없으면 null */
        val unitLine: UnitView?,
    )

    data class DepositView(val id: String, val amount: Long, val depositedOn: String, val note: String?, val splitGroupId: String?, val source: String)

    data class GoalDetailView(
        val goal: GoalView,
        val plan: CalculationView,
        val deposits: List<DepositView>,
        val missedMonths: MissedMonthsView,
        /** 이 목표의 실물 단위 전부(최대 3) */
        val units: List<UnitView>,
    )

    data class SimProjectionView(val method: String, val earlyMonth: String?, val lateMonth: String?, val planMonth: String?, val reason: String?)

    data class SimRowView(
        val goalId: String,
        val title: String,
        val template: String,
        val monthlyBefore: Long?,
        val monthlyAfter: Long?,
        val before: SimProjectionView,
        val after: SimProjectionView,
        /** 계획 도달 월이 몇 달 옮겨졌나(+ 늦어짐 · − 빨라짐). 어느 한쪽이 없으면 null */
        val planShiftMonths: Long?,
    )

    data class SimulationView(val totalMonthlyBefore: Long, val totalMonthlyAfter: Long, val rows: List<SimRowView>)

    data class WithdrawView(val planMonthBefore: String?, val planMonthAfter: String?, val delayMonths: Int?, val reason: String?)

    data class LoanView(val months: Int, val annualRate: String, val monthlyPayment: Long, val totalInterest: Long)

    data class EmergencyView(
        val amount: Long,
        val withdraw: WithdrawView,
        val loan: LoanView,
        /** 계산 가정 키 — 문장은 프론트. loan_paid_outside_goal: 상환은 목표 적립과 따로 낸다고 본다 */
        val assumptions: List<String>,
    )

    data class SplitView(val splitGroupId: String?, val goals: List<GoalDetailView>)

    data class NearestView(val goalId: String, val title: String, val template: String, val progressPercent: BigDecimal, val milestone: MilestoneView)

    data class HomeCardView(val totalGoals: Int, val activeGoals: Int, val totalSaved: Long?, val nearest: NearestView?)

    // ---------- 경로 ----------

    @Operation(summary = "목표 템플릿 7종", description = "기준선은 원문 대조 전이라 null + baselineReason(unverified_source)")
    @GetMapping("/templates")
    fun templates(user: AuthenticatedUser): ResponseEntity<ApiResponse<List<TemplateView>>> =
        ApiResponse.ok(
            listTemplates.execute().map { t ->
                TemplateView(t.template.key, t.baseline?.let { BaselineView(it.amount.toKrwInteger(), it.source, it.year, it.verified) }, t.baselineReason)
            },
        )

    @Operation(summary = "양방향 계산(저장 안 함)", description = "금액+기한 → 월 적립 / 금액+월 적립 → 도달 월. monthly 가 있으면 월 적립 모드")
    @PostMapping("/calculate")
    fun calculate(user: AuthenticatedUser, @Valid @RequestBody body: CalculateRequest): ResponseEntity<ApiResponse<CalculationView>> {
        val result = calculate.execute(
            Calculate.Command(
                target = Money.krw(body.targetAmount!!),
                saved = Money.krw(body.saved ?: BigDecimal.ZERO),
                deadline = body.targetDate,
                monthly = body.monthly?.let(Money::krw),
                interest = interestOf(body.includeInterest, body.annualRate),
            ),
        )
        return ApiResponse.ok(calculationView(result))
    }

    @Operation(summary = "내 목표 목록", description = "진척 · 이정표 · 프레임 · 도달 구간. 쿼리 3회")
    @GetMapping("/goals")
    fun list(user: AuthenticatedUser): ResponseEntity<ApiResponse<List<GoalView>>> =
        ApiResponse.ok(listGoals.execute(user.userId).map(::goalView))

    @Operation(summary = "목표 만들기", description = "기한만 주면 월 적립을 계산해 계획으로 저장. 첫 구간을 발행한다(savings.GoalCreated · ProjectionIssued)")
    @PostMapping("/goals")
    fun create(user: AuthenticatedUser, @Valid @RequestBody body: CreateGoalRequest): ResponseEntity<ApiResponse<GoalDetailView>> {
        val template = GoalTemplate.fromKey(body.template!!) ?: throw InvalidGoal("GOAL_TEMPLATE_INVALID", "unknown template")
        val detail = createGoal.execute(
            CreateGoal.Command(
                userId = user.userId,
                title = body.title!!,
                template = template,
                targetAmount = Money.krw(body.targetAmount!!),
                targetDate = body.targetDate,
                monthlyPlan = body.monthlyPlan?.let(Money::krw),
                interest = interestOf(body.includeInterest, body.annualRate),
            ),
        )
        return ApiResponse.created(detailView(detail), "Goal created successfully")
    }

    data class ExistsView(val exists: Boolean)

    /** 경로 순서: 이 고정 경로가 `/goals/{id}` 보다 먼저 맞는다(Spring 은 고정 경로를 우선한다) */
    @Operation(summary = "목표가 있나", description = "온보딩 set_plan 프로브(Express)용 — 쿼리 1")
    @GetMapping("/goals/exists")
    fun exists(user: AuthenticatedUser): ResponseEntity<ApiResponse<ExistsView>> = ApiResponse.ok(ExistsView(hasGoals.execute(user.userId)))

    @Operation(summary = "목표 상세", description = "도달 구간 · 적중 이력(또는 이유) · 최근 적립 20건 · 지금 기준 계획 재계산")
    @GetMapping("/goals/{id}")
    fun detail(user: AuthenticatedUser, @PathVariable id: String): ResponseEntity<ApiResponse<GoalDetailView>> =
        ApiResponse.ok(detailView(getGoal.execute(user.userId, id)))

    @Operation(summary = "적립 기록", description = "달성하면 savings.GoalReached. 구간을 다시 발행한다")
    @PostMapping("/goals/{id}/deposits")
    fun deposit(user: AuthenticatedUser, @PathVariable id: String, @Valid @RequestBody body: DepositRequest): ResponseEntity<ApiResponse<GoalDetailView>> {
        val detail = recordDeposits.single(user.userId, id, Money.krw(body.amount!!), body.depositedOn, body.note)
        return ApiResponse.created(detailView(detail), "Saving added successfully")
    }

    @Operation(summary = "여러 목표에 나눠 넣기", description = "parts 합 = total 이어야 한다. 한 묶음(splitGroupId)")
    @PostMapping("/deposits/split")
    fun split(user: AuthenticatedUser, @Valid @RequestBody body: SplitRequest): ResponseEntity<ApiResponse<SplitView>> {
        val result = recordDeposits.split(
            user.userId,
            Money.krw(body.total!!),
            body.parts!!.map { RecordDeposits.Part(it.goalId!!, Money.krw(it.amount!!)) },
            body.depositedOn,
            body.note,
        )
        return ApiResponse.created(SplitView(result.splitGroupId?.toString(), result.goals.map(::detailView)), "Saving added successfully")
    }

    @Operation(summary = "홈 저축 카드 숫자", description = "BFF 홈 카드(BFF-REQ-046)가 포맷한다. 목표가 없으면 totalSaved null")
    @GetMapping("/home-card")
    fun home(user: AuthenticatedUser): ResponseEntity<ApiResponse<HomeCardView>> {
        val view = homeCard.execute(user.userId)
        return ApiResponse.ok(
            HomeCardView(
                totalGoals = view.totalGoals,
                activeGoals = view.activeGoals,
                totalSaved = view.totalSaved?.toKrwInteger(),
                nearest = view.nearest?.let {
                    NearestView(it.goal.id.toString(), it.goal.title, it.goal.template.key, percent(it.progress), milestoneView(it))
                },
            ),
        )
    }

    @Operation(summary = "목표 저울(저장 안 함)", description = "진행 중 목표의 월 적립을 바꿔 보면 목표마다 구간이 어떻게 바뀌나. 바꾸지 않은 목표도 같이 돌려준다. 쿼리 3회")
    @PostMapping("/simulate")
    fun simulate(user: AuthenticatedUser, @Valid @RequestBody body: PlanChangesRequest): ResponseEntity<ApiResponse<SimulationView>> {
        val result = simulateBalance.execute(user.userId, body.changes!!.map { SimulateBalance.Change(it.goalId!!, Money.krw(it.monthly!!)) })
        return ApiResponse.ok(
            SimulationView(
                totalMonthlyBefore = result.totalBefore.toKrwInteger(RoundingMode.CEILING),
                totalMonthlyAfter = result.totalAfter.toKrwInteger(RoundingMode.CEILING),
                rows = result.rows.map { row ->
                    SimRowView(
                        goalId = row.goal.id.toString(),
                        title = row.goal.title,
                        template = row.goal.template.key,
                        monthlyBefore = row.monthlyBefore?.toKrwInteger(RoundingMode.CEILING),
                        monthlyAfter = row.monthlyAfter?.toKrwInteger(RoundingMode.CEILING),
                        before = simProjection(row.before),
                        after = simProjection(row.after),
                        planShiftMonths = if (row.before.plan != null && row.after.plan != null) {
                            java.time.temporal.ChronoUnit.MONTHS.between(row.before.plan, row.after.plan)
                        } else {
                            null
                        },
                    )
                },
            ),
        )
    }

    @Operation(summary = "저울 확정 — 월 계획 바꾸기", description = "진행 중 목표만. 바뀐 목표마다 구간을 다시 발행(savings.ProjectionIssued). 응답은 목록 전체")
    @PutMapping("/goals/plans")
    fun updatePlans(user: AuthenticatedUser, @Valid @RequestBody body: PlanChangesRequest): ResponseEntity<ApiResponse<List<GoalView>>> =
        ApiResponse.ok(
            updateMonthlyPlans.execute(user.userId, body.changes!!.map { UpdateMonthlyPlans.Change(it.goalId!!, Money.krw(it.monthly!!)) }).map(::goalView),
        )

    @Operation(summary = "비상시 비교(저장 안 함)", description = "목표에서 꺼내기 vs 사용자가 넣은 금리로 빌리기(원리금 균등). 상품 · 링크 없음")
    @PostMapping("/goals/{id}/emergency-compare")
    fun emergency(user: AuthenticatedUser, @PathVariable id: String, @Valid @RequestBody body: EmergencyRequest): ResponseEntity<ApiResponse<EmergencyView>> {
        val c = compareEmergency.execute(CompareEmergency.Command(user.userId, id, Money.krw(body.amount!!), body.loanRate!!, body.loanMonths!!))
        return ApiResponse.ok(emergencyView(c))
    }

    @Operation(summary = "실물 단위 만들기", description = "목표 하나에 3개까지(넘으면 409 UNIT_LIMIT). 응답은 갱신된 상세")
    @PostMapping("/goals/{id}/units")
    fun addUnit(user: AuthenticatedUser, @PathVariable id: String, @Valid @RequestBody body: ItemUnitRequest): ResponseEntity<ApiResponse<GoalDetailView>> =
        ApiResponse.created(detailView(addItemUnit.execute(user.userId, id, body.name!!, Money.krw(body.unitPrice!!))), "Item unit created")

    @Operation(summary = "실물 단위 지우기", description = "본인 단위만. 응답은 갱신된 상세")
    @DeleteMapping("/goals/{id}/units/{unitId}")
    fun deleteUnit(user: AuthenticatedUser, @PathVariable id: String, @PathVariable unitId: String): ResponseEntity<ApiResponse<GoalDetailView>> =
        ApiResponse.ok(detailView(deleteItemUnit.execute(user.userId, id, unitId)))

    // ---------- 변환 — 반올림은 여기서 한 번 ----------

    private fun simProjection(p: Projection) = SimProjectionView(p.method.key, p.early?.toString(), p.late?.toString(), p.plan?.toString(), p.reason)

    private fun unitView(u: ItemUnit, saved: Money) = UnitView(u.id.toString(), u.name, u.unitPrice.toKrwInteger(), u.countFor(saved))

    private fun emergencyView(c: EmergencyComparison) = EmergencyView(
        amount = c.amount.toKrwInteger(),
        withdraw = WithdrawView(c.withdraw.planMonthBefore?.toString(), c.withdraw.planMonthAfter?.toString(), c.withdraw.delayMonths, c.withdraw.reason),
        loan = LoanView(
            months = c.loan.months,
            annualRate = c.loan.annualRatePercent.stripTrailingZeros().toPlainString(),
            // 상환액은 올림(덜 내면 못 갚는다) · 이자 합은 상환 올림값 기준이 아니라 계산값 그대로 반올림
            monthlyPayment = c.loan.monthlyPayment.toKrwInteger(RoundingMode.CEILING),
            totalInterest = c.loan.totalInterest.toKrwInteger(),
        ),
        assumptions = listOf("loan_paid_outside_goal"),
    )

    private fun interestOf(include: Boolean, rate: BigDecimal?): InterestPlan? {
        if (!include) return null
        return InterestPlan(rate ?: throw InvalidGoal("GOAL_RATE_REQUIRED", "annualRate is required when includeInterest"))
    }

    private fun percent(progress: BigDecimal): BigDecimal = progress.multiply(BigDecimal(100)).setScale(1, RoundingMode.FLOOR)

    private fun calculationView(c: Calculation) = CalculationView(
        state = c.state.name.lowercase(),
        remaining = c.remaining.toKrwInteger(),
        monthly = c.monthly?.toKrwInteger(RoundingMode.CEILING),
        months = c.months,
        reachMonth = c.reachMonth?.toString(),
        expectedInterest = c.expectedInterest.toKrwInteger(RoundingMode.FLOOR),
        assumptions = Assumptions(SavingsMath.INTEREST_TAX_RATE.movePointRight(2).stripTrailingZeros().toPlainString(), false),
    )

    private fun milestoneView(s: GoalSummary) = MilestoneView(
        month = s.milestone.month.toString(),
        deposited = s.milestone.deposited.toKrwInteger(),
        plan = s.milestone.plan?.toKrwInteger(RoundingMode.CEILING),
        difference = s.milestone.difference?.toKrwInteger(),
        state = s.milestone.state.key,
    )

    private fun goalView(s: GoalSummary): GoalView {
        val g = s.goal
        val p = s.projection
        return GoalView(
            id = g.id.toString(),
            title = g.title,
            template = g.template.key,
            status = g.status.key,
            targetAmount = g.targetAmount.toKrwInteger(),
            saved = s.saved.toKrwInteger(),
            remaining = s.remaining.toKrwInteger(),
            progressPercent = percent(s.progress),
            progressRatio = s.progress.setScale(4, RoundingMode.FLOOR),
            frame = s.frame.key,
            targetDate = g.targetDate?.toString(),
            monthlyPlan = g.monthlyPlan?.toKrwInteger(RoundingMode.CEILING),
            includeInterest = g.interest != null,
            annualRate = g.interest?.annualRatePercent?.stripTrailingZeros()?.toPlainString(),
            depositCount = s.depositCount,
            lastDepositedOn = s.lastDepositedOn?.toString(),
            createdAt = g.createdAt.toString(),
            completedAt = g.completedAt?.toString(),
            milestone = milestoneView(s),
            projection = ProjectionView(
                method = p.method.key,
                earlyMonth = p.early?.toString(),
                lateMonth = p.late?.toString(),
                planMonth = p.plan?.toString(),
                reason = p.reason,
                monthsOfHistory = p.monthsOfHistory,
                track = null,
                trackReason = ProjectionReason.HISTORY_SHORT,
            ),
            degraded = s.degraded,
            degradedReasons = if (s.degraded) listOf("projection") else emptyList(),
            scene = SceneView(s.scene.kind.key, s.scene.step, Scene.STEPS),
            stampCount = s.stamps,
            postcard = s.postcard?.let { PostcardView(it.startedOn.toString(), it.reachedOn.toString(), it.daysTaken, it.depositActions) },
            unitLine = s.units.firstOrNull()?.let { unitView(it, s.saved) },
        )
    }

    private fun detailView(d: GoalDetail) = GoalDetailView(
        goal = goalView(d.summary),
        plan = calculationView(d.plan),
        deposits = d.recentDeposits.map {
            DepositView(it.id.toString(), it.amount.toKrwInteger(), it.depositedOn.toString(), it.note, it.splitGroupId?.toString(), it.source.key)
        },
        missedMonths = d.missedMonths.let { MissedMonthsView(it.observedMonths, it.skippedMonths, it.shiftMonths, it.reason) },
        units = d.summary.units.map { unitView(it, d.summary.saved) },
    )
}
