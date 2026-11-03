package com.salt.savings.api

import com.salt.kernel.Money
import com.salt.savings.application.Calculate
import com.salt.savings.application.CreateGoal
import com.salt.savings.application.GetGoal
import com.salt.savings.application.GoalDetail
import com.salt.savings.application.GoalSummary
import com.salt.savings.application.HomeCard
import com.salt.savings.application.ListGoals
import com.salt.savings.application.ListTemplates
import com.salt.savings.application.RecordDeposits
import com.salt.savings.domain.Calculation
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
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate

/**
 * 저축 서비스 HTTP(`SRV-REQ-045` · 슬라이스 S1a). **모든 금액 · 날짜 · 구간을 여기 응답이 준다** — BFF 는 중계, 프론트는 표시만.
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
        val issuedAt: String?,
        /** 적중 이력 — 채점(FC-REQ-024)이 생기기 전엔 null 이고 [trackReason] 이 이유(FR-6: 둘 중 하나는 늘 있다) */
        val track: Any?,
        val trackReason: String?,
    )

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
    )

    data class DepositView(val id: String, val amount: Long, val depositedOn: String, val note: String?, val splitGroupId: String?, val source: String)

    data class GoalDetailView(val goal: GoalView, val plan: CalculationView, val deposits: List<DepositView>)

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

    // ---------- 변환 — 반올림은 여기서 한 번 ----------

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
                issuedAt = s.projectionIssuedAt?.toString(),
                track = null,
                trackReason = ProjectionReason.HISTORY_SHORT,
            ),
        )
    }

    private fun detailView(d: GoalDetail) = GoalDetailView(
        goal = goalView(d.summary),
        plan = calculationView(d.plan),
        deposits = d.recentDeposits.map {
            DepositView(it.id.toString(), it.amount.toKrwInteger(), it.depositedOn.toString(), it.note, it.splitGroupId?.toString(), it.source.key)
        },
    )
}
