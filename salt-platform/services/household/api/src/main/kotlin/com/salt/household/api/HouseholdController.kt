package com.salt.household.api

import com.salt.household.application.CloseMonth
import com.salt.household.application.ConfirmOccurrence
import com.salt.household.application.CreateTemplate
import com.salt.household.application.DeleteExpense
import com.salt.household.application.EditTemplate
import com.salt.household.application.EndTemplate
import com.salt.household.application.ListTemplates
import com.salt.household.application.RecordResult
import com.salt.household.application.SkipOccurrence
import com.salt.household.application.TemplateInput
import com.salt.household.application.todayKst
import com.salt.household.domain.InstallmentBand
import com.salt.household.domain.MonthClose
import com.salt.household.domain.OccurrenceStage
import com.salt.household.domain.RecurringOccurrence
import com.salt.household.domain.RecurringRules
import com.salt.household.domain.ReviewAnswers
import com.salt.household.domain.TemplateWithOccurrence
import java.time.Clock
import com.salt.household.application.ExpenseInput
import com.salt.household.application.GetBudget
import com.salt.household.application.GetMonth
import com.salt.household.application.HomeCard
import com.salt.household.application.MonthView
import com.salt.household.application.ParseInput
import com.salt.household.application.RecordExpenses
import com.salt.household.application.SetBudget
import com.salt.household.application.Suggestions
import com.salt.household.domain.Budget
import com.salt.household.domain.Category
import com.salt.household.domain.EnvelopeStatus
import com.salt.household.domain.Expense
import com.salt.household.domain.InputParser
import com.salt.household.domain.InvalidExpense
import com.salt.household.domain.Landing
import com.salt.household.domain.LandingTrack
import com.salt.kernel.Money
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
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
import java.time.YearMonth
import java.time.format.DateTimeParseException

/**
 * 가계부 서비스 HTTP(`SRV-REQ-046` · 슬라이스 가계부 S1a). **금액 · 착지 · 봉투 잔액은 전부 여기 응답이 준다** — BFF 는 중계, 프론트는 표시만.
 * 금액은 원 단위 정수로 응답 직전 1회 반올림(`toKrwInteger`, 이 층에서만 — ArchUnit). 문구는 내리지 않는다 — 상태 키만.
 * **예산 초과에 경고 · 차단 필드가 없다**(수용 기준 2) — 넘친 봉투는 `remaining` 이 음수일 뿐이다.
 */
@Tag(name = "household", description = "가계부 — 3초 입력 · 문자 붙여넣기 · 봉투 · 착지 구간(SRV-REQ-046)")
@RestController
@RequestMapping("/api/household")
class HouseholdController(
    private val recordExpenses: RecordExpenses,
    private val deleteExpense: DeleteExpense,
    private val parseInput: ParseInput,
    private val suggestions: Suggestions,
    private val getBudget: GetBudget,
    private val setBudget: SetBudget,
    private val getMonth: GetMonth,
    private val homeCard: HomeCard,
    private val listTemplates: ListTemplates,
    private val createTemplate: CreateTemplate,
    private val editTemplate: EditTemplate,
    private val endTemplate: EndTemplate,
    private val confirmOccurrence: ConfirmOccurrence,
    private val skipOccurrence: SkipOccurrence,
    private val closeMonth: CloseMonth,
    private val clock: Clock,
) {
    // ---------- 요청 ----------

    data class ExpenseRequest(
        @field:NotNull @field:Positive val amount: BigDecimal?,
        val spentOn: LocalDate?,
        @field:NotBlank val category: String?,
        val paymentMethod: String? = "card",
        @field:Size(max = 100) val merchant: String?,
        val precision: String? = "exact",
        val inputKind: String? = "quick",
        @field:Min(2) @field:Max(36) val installmentMonths: Int?,
        @field:Size(max = 400) val memo: String?,
    )

    data class BatchRequest(@field:NotEmpty @field:Size(max = InputParser.CANDIDATES_MAX) @field:Valid val expenses: List<ExpenseRequest>?)

    /**
     * 원문은 **이 객체에만** 산다. 길이 상한은 유스케이스가 코드로 답한다 — 형식 검증기(`@Size`)의 오류 바디는 필드 이름만 싣지만,
     * 상한을 한 곳(`InputParser.TEXT_MAX`)에 두려고 여기서는 비었는지만 본다
     */
    data class ParseRequest(@field:NotBlank val mode: String?, @field:NotNull val text: String?) {
        /** 데이터 클래스 기본 toString 은 필드를 다 찍는다 — 어디서든 이 객체가 문자열이 되면 원문이 새므로 막는다 */
        override fun toString(): String = "ParseRequest(mode=$mode, text=<${text?.length ?: 0} chars>)"
    }

    data class TemplateRequest(
        @field:NotBlank @field:Size(max = 100) val name: String?,
        @field:NotNull @field:Positive val amount: BigDecimal?,
        @field:NotBlank val category: String?,
        val paymentMethod: String? = "card",
        @field:NotNull @field:Min(1) @field:Max(31) val dayOfMonth: Int?,
        val confirmRequired: Boolean? = true,
    )

    /** 금액을 고쳐 확인할 수 있다(통신비가 달마다 조금 다르다). 비우면 예정 금액 */
    data class ConfirmRequest(@field:Positive val amount: BigDecimal?)

    /** 리뷰 3문항 — 다 비워도 닫힌다. 길이 상한은 도메인이 코드로 답한다 */
    data class CloseRequest(@field:Size(max = 1000) val satisfied: String?, @field:Size(max = 1000) val tryNext: String?, @field:Size(max = 1000) val knownNext: String?)

    data class BudgetRequest(
        @field:NotBlank val method: String?,
        @field:Positive val income: BigDecimal?,
        val envelopes: Map<String, BigDecimal>?,
    )

    // ---------- 응답 ----------

    data class ExpenseView(
        val id: String,
        val amount: Long,
        val spentOn: String,
        val category: String,
        val paymentMethod: String,
        val merchant: String?,
        val precision: String,
        val inputKind: String,
        val installmentMonths: Int?,
        val memo: String?,
        val createdAt: String,
    )

    /** 봉투 — `remaining` 은 음수 가능. 상태 · 경고 칸이 없다 */
    data class EnvelopeView(val key: String, val budget: Long, val spent: Long, val remaining: Long)

    /** [savedTotal] — 이번에 적은 합. BFF 가 목표 시계(저축 `goal-clock`)에 그대로 넘긴다 */
    data class RecordView(val expenses: List<ExpenseView>, val savedTotal: Long, val envelope: EnvelopeView?, val monthTotal: Long)

    data class CandidateView(
        val amount: Long,
        val merchant: String?,
        val spentOn: String,
        val installmentMonths: Int?,
        val paymentMethod: String,
        /** 제안 분류. 없으면 null — 화면이 고르게 */
        val category: String?,
        /** history(최근 같은 가맹점) · rule(낱말 표) · null */
        val categorySource: String?,
    )

    data class ParseView(val candidates: List<CandidateView>, val skipped: List<String>)

    data class MerchantView(val merchant: String, val category: String, val lastAmount: Long, val count: Int)

    data class CategoryView(val key: String, val bucket: String)

    data class SuggestionsView(val merchants: List<MerchantView>, val categories: List<CategoryView>)

    data class BudgetView(val method: String, val income: Long?, val savingsShare: Long?, val envelopes: List<BudgetEnvelopeView>, val total: Long?, val updatedAt: String)

    data class BudgetEnvelopeView(val key: String, val amount: Long)

    data class TotalsView(val total: Long, val exact: Long, val approx: Long, val count: Int)

    data class CategorySpentView(val key: String, val bucket: String, val spent: Long)

    data class LandingView(
        /** empirical_window(month_over 는 쓰지 않음 — 계약 값만) */
        val method: String,
        /** 어제까지 이 달 합 — 착지는 "오늘 시작 기준"(오늘 몫은 구간에 든다) */
        val spentSoFar: Long,
        /** 아직 확인 안 한 반복 예정 합 — low · high 에 이미 들어 있다(S1b) */
        val scheduled: Long,
        val low: Long?,
        val high: Long?,
        /** history_short · null */
        val reason: String?,
        val daysOfHistory: Int,
    )

    data class TrackView(val month: String, val issuedOn: String?, val low: Long?, val high: Long?, val actual: Long?, val hit: Boolean?, val reason: String?)

    data class MonthPageView(
        val month: String,
        val current: Boolean,
        val totals: TotalsView,
        val byCategory: List<CategorySpentView>,
        val budget: BudgetView?,
        val envelopes: List<EnvelopeView>,
        /** 봉투에 들지 않은 지출(봉투 방식). 예산이 없으면 null */
        val unbudgeted: Long?,
        /** 봉투 합 − 봉투에 든 지출. 음수 가능 */
        val remaining: Long?,
        /** 남은 금액 ÷ 오늘 포함 남은 날(내림). 이번 달 · 예산이 있을 때만 */
        val dailyAvailable: Long?,
        val daysLeft: Int?,
        val landing: LandingView?,
        val landingReason: String?,
        val track: TrackView?,
        val expenses: List<ExpenseView>,
        val recurring: RecurringMonthView,
        val installments: InstallmentBandView,
        /** 닫았으면 그 기록, 아니면 null */
        val close: CloseView?,
        /** 지금 닫을 수 있나(지난 달 · 이번 달 마지막 3일) — 서버가 정한다 */
        val closable: Boolean,
        /** 리뷰 문항 키(문장은 프론트) */
        val reviewQuestions: List<String>,
    )

    /** 예정 행 — [stage] ask · upcoming · confirmed · skipped(보여 줄 단계는 서버가 정한다) */
    data class OccurrenceView(
        val id: String,
        val templateId: String,
        val name: String,
        val amount: Long,
        val category: String,
        val dueOn: String,
        val stage: String,
        val expenseId: String?,
    )

    data class RecurringMonthView(val items: List<OccurrenceView>, val scheduledTotal: Long)

    data class TemplateView(
        val id: String,
        val name: String,
        val amount: Long,
        val category: String,
        val paymentMethod: String,
        val dayOfMonth: Int,
        val confirmRequired: Boolean,
        val startsMonth: String,
        /** 이번 달 예정 행 — 시작 달 전이면 null */
        val thisMonth: OccurrenceView?,
    )

    data class TemplateListView(val templates: List<TemplateView>, val limit: Int)

    data class ConfirmView(val occurrenceId: String, val record: RecordView)

    data class InstallmentLineView(
        val expenseId: String,
        val merchant: String?,
        val category: String,
        /** 원거래 금액 — 산 달 지출 합에 이미 들어 있다 */
        val amount: Long,
        val months: Int,
        /** 이 달이 몇 회차 */
        val index: Int,
        val charge: Long,
        val remainingAfter: Long,
        val firstMonth: String,
        val lastMonth: String,
    )

    data class MonthChargeView(val month: String, val amount: Long)

    data class InstallmentBandView(val lines: List<InstallmentLineView>, val monthCharge: Long, val upcoming: List<MonthChargeView>)

    data class AnswersView(val satisfied: String?, val tryNext: String?, val knownNext: String?)

    /** 닫은 달 — 이 달 화면의 예산 칸은 닫을 때 붙잡은 값이다(S1b 판단 6) */
    data class CloseView(val month: String, val closedAt: String, val answers: AnswersView)

    data class HomeCardView(val month: String, val spent: Long, val count: Int, val remaining: Long?, val landing: LandingView)

    // ---------- 경로 ----------

    @Operation(summary = "지출 적기(한 건)", description = "응답에 저장한 행 · 그 분류의 봉투 · 이번 달 합. 목표 시계는 BFF 가 저축 서비스에서 붙인다")
    @PostMapping("/expenses")
    fun record(user: AuthenticatedUser, @Valid @RequestBody body: ExpenseRequest): ResponseEntity<ApiResponse<RecordView>> =
        ApiResponse.created(recordView(recordExpenses.execute(user.userId, listOf(input(body)))), "Expense recorded")

    @Operation(summary = "지출 여러 건 적기", description = "붙여넣기 확인 목록 — 한 트랜잭션. 30건까지")
    @PostMapping("/expenses/batch")
    fun recordBatch(user: AuthenticatedUser, @Valid @RequestBody body: BatchRequest): ResponseEntity<ApiResponse<RecordView>> =
        ApiResponse.created(recordView(recordExpenses.execute(user.userId, body.expenses!!.map(::input))), "Expenses recorded")

    @Operation(summary = "지출 지우기", description = "본인 것만")
    @DeleteMapping("/expenses/{id}")
    fun delete(user: AuthenticatedUser, @PathVariable id: String): ResponseEntity<ApiResponse<Map<String, String>>> {
        deleteExpense.execute(user.userId, id)
        return ApiResponse.ok(mapOf("id" to id))
    }

    @Operation(
        summary = "한 줄 · 결제 문자 파싱(저장 안 함)",
        description = "mode=line|messages. 카드번호 · 이름은 파싱 전에 지운다. 원문은 저장 · 로그 0. 후보만 돌려준다",
    )
    @PostMapping("/parse")
    fun parse(user: AuthenticatedUser, @Valid @RequestBody body: ParseRequest): ResponseEntity<ApiResponse<ParseView>> {
        val result = parseInput.execute(user.userId, body.mode!!, body.text!!)
        return ApiResponse.ok(
            ParseView(
                result.candidates.map { s ->
                    val c = s.candidate
                    CandidateView(c.amount.toKrwInteger(), c.merchant, c.spentOn.toString(), c.installmentMonths, c.paymentMethod.key, s.category?.key, s.categorySource)
                },
                result.skipped,
            ),
        )
    }

    @Operation(summary = "빠른 입력 제안", description = "최근 30일 가맹점(횟수 순) · 분류 목록")
    @GetMapping("/suggestions")
    fun suggestions(user: AuthenticatedUser): ResponseEntity<ApiResponse<SuggestionsView>> =
        ApiResponse.ok(
            SuggestionsView(
                suggestions.execute(user.userId).map { MerchantView(it.merchant, it.category.key, it.lastAmount.toKrwInteger(), it.count) },
                Category.entries.map { CategoryView(it.key, it.bucket.key) },
            ),
        )

    @Operation(summary = "지금 예산", description = "없으면 data=null")
    @GetMapping("/budget")
    fun budget(user: AuthenticatedUser): ResponseEntity<ApiResponse<BudgetView?>> = ApiResponse.ok(getBudget.execute(user.userId)?.let(::budgetView))

    @Operation(summary = "예산 정하기", description = "method=50_30_20(income) | envelope(분류 키 → 금액). 통째로 바꾼다")
    @PutMapping("/budget")
    fun setBudget(user: AuthenticatedUser, @Valid @RequestBody body: BudgetRequest): ResponseEntity<ApiResponse<BudgetView>> =
        ApiResponse.ok(
            budgetView(setBudget.execute(user.userId, body.method!!, body.income?.let(Money::krw), body.envelopes.orEmpty().mapValues { Money.krw(it.value) })),
        )

    @Operation(summary = "한 달 화면", description = "합(정확/대략) · 분류별 · 봉투 · 하루 가용 · 착지 구간 · 지난달 같은 날짜 적중 · 지출 목록")
    @GetMapping("/month/{ym}")
    fun month(user: AuthenticatedUser, @PathVariable ym: String): ResponseEntity<ApiResponse<MonthPageView>> =
        ApiResponse.ok(monthView(getMonth.execute(user.userId, parseMonth(ym))))

    @Operation(summary = "홈 요약 카드", description = "이번 달 지출 · 착지 · 예산 남은 금액")
    @GetMapping("/home-card")
    fun homeCard(user: AuthenticatedUser): ResponseEntity<ApiResponse<HomeCardView>> {
        val v = homeCard.execute(user.userId)
        return ApiResponse.ok(HomeCardView(v.month.toString(), v.spent.toKrwInteger(), v.count, v.remaining?.toKrwInteger(), landingView(v.landing)))
    }

    @Operation(summary = "반복 템플릿 목록", description = "살아 있는 템플릿 + 이번 달 예정 행(stage)")
    @GetMapping("/templates")
    fun templates(user: AuthenticatedUser): ResponseEntity<ApiResponse<TemplateListView>> {
        val today = clock.todayKst()
        return ApiResponse.ok(TemplateListView(listTemplates.execute(user.userId).map { templateView(it, today) }, RecurringRules.TEMPLATE_MAX))
    }

    @Operation(summary = "반복 템플릿 만들기", description = "매달 하나. 이번 달 예정일이 오늘 이후면 이번 달 예정 행도 만든다")
    @PostMapping("/templates")
    fun createTemplate(user: AuthenticatedUser, @Valid @RequestBody body: TemplateRequest): ResponseEntity<ApiResponse<TemplateView>> =
        ApiResponse.created(templateView(createTemplate.execute(user.userId, templateInput(body)), clock.todayKst()), "Template created")

    @Operation(summary = "반복 템플릿 고치기", description = "이번 달 예정 행이 아직 예정이면 새 값으로")
    @PutMapping("/templates/{id}")
    fun editTemplate(user: AuthenticatedUser, @PathVariable id: String, @Valid @RequestBody body: TemplateRequest): ResponseEntity<ApiResponse<TemplateView>> =
        ApiResponse.ok(templateView(editTemplate.execute(user.userId, id, templateInput(body)), clock.todayKst()))

    @Operation(summary = "반복 템플릿 끝내기", description = "확인한 달은 남고 아직 예정인 행은 지운다")
    @DeleteMapping("/templates/{id}")
    fun endTemplate(user: AuthenticatedUser, @PathVariable id: String): ResponseEntity<ApiResponse<Map<String, String>>> {
        endTemplate.execute(user.userId, id)
        return ApiResponse.ok(mapOf("id" to id))
    }

    @Operation(summary = "이번 달에도 나갔어요", description = "예정 행 → 지출(input_kind template). 응답은 지출 저장과 같은 모양. 이미 정한 행이면 409")
    @PostMapping("/occurrences/{id}/confirm")
    fun confirm(user: AuthenticatedUser, @PathVariable id: String, @Valid @RequestBody(required = false) body: ConfirmRequest?): ResponseEntity<ApiResponse<ConfirmView>> {
        val r = confirmOccurrence.execute(user.userId, id, body?.amount?.let(Money::krw))
        return ApiResponse.created(ConfirmView(r.occurrenceId.toString(), recordView(r.record)), "Occurrence confirmed")
    }

    @Operation(summary = "이번 달은 안 나가요", description = "착지 예정에서 빠진다. 이미 정한 행이면 409")
    @PostMapping("/occurrences/{id}/skip")
    fun skip(user: AuthenticatedUser, @PathVariable id: String): ResponseEntity<ApiResponse<Map<String, String>>> {
        skipOccurrence.execute(user.userId, id)
        return ApiResponse.ok(mapOf("id" to id))
    }

    @Operation(summary = "월 마감 리뷰", description = "처음 닫으면 그달 예산을 붙잡는다. 다시 내면 답만 고친다. 점수 · 평가 0")
    @PostMapping("/month/{ym}/close")
    fun close(user: AuthenticatedUser, @PathVariable ym: String, @Valid @RequestBody body: CloseRequest): ResponseEntity<ApiResponse<CloseView>> =
        ApiResponse.ok(closeView(closeMonth.execute(user.userId, parseMonth(ym), ReviewAnswers.of(body.satisfied, body.tryNext, body.knownNext))))

    // ---------- 변환 — 반올림은 여기서 한 번 ----------

    private fun parseMonth(raw: String): YearMonth = try {
        YearMonth.parse(raw)
    } catch (e: DateTimeParseException) {
        throw InvalidExpense("MONTH_INVALID", "month must be YYYY-MM")
    }

    private fun input(r: ExpenseRequest) = ExpenseInput(
        amount = Money.krw(r.amount!!),
        spentOn = r.spentOn,
        category = r.category!!,
        paymentMethod = r.paymentMethod ?: "card",
        merchant = r.merchant,
        precision = r.precision ?: "exact",
        inputKind = r.inputKind ?: "quick",
        installmentMonths = r.installmentMonths,
        memo = r.memo,
    )

    private fun templateInput(r: TemplateRequest) = TemplateInput(
        name = r.name!!,
        amount = Money.krw(r.amount!!),
        category = r.category!!,
        paymentMethod = r.paymentMethod ?: "card",
        dayOfMonth = r.dayOfMonth!!,
        confirmRequired = r.confirmRequired ?: true,
    )

    private fun occurrenceView(o: RecurringOccurrence, today: LocalDate) = OccurrenceView(
        id = o.id.toString(),
        templateId = o.templateId.toString(),
        name = o.name,
        amount = o.amount.toKrwInteger(),
        category = o.category.key,
        dueOn = o.dueOn.toString(),
        stage = OccurrenceStage.of(o, today).key,
        expenseId = o.expenseId?.toString(),
    )

    private fun templateView(t: TemplateWithOccurrence, today: LocalDate) = TemplateView(
        id = t.template.id.toString(),
        name = t.template.name,
        amount = t.template.amount.toKrwInteger(),
        category = t.template.category.key,
        paymentMethod = t.template.paymentMethod.key,
        dayOfMonth = t.template.dayOfMonth,
        confirmRequired = t.template.confirmRequired,
        startsMonth = t.template.startsMonth.toString(),
        thisMonth = t.occurrence?.let { occurrenceView(it, today) },
    )

    private fun closeView(c: MonthClose) = CloseView(
        month = c.month.toString(),
        closedAt = c.closedAt.toString(),
        answers = AnswersView(c.answers.satisfied, c.answers.tryNext, c.answers.knownNext),
    )

    private fun installmentView(b: InstallmentBand) = InstallmentBandView(
        lines = b.lines.map { l ->
            InstallmentLineView(
                expenseId = l.plan.expense.id.toString(),
                merchant = l.plan.expense.merchant,
                category = l.plan.expense.category.key,
                amount = l.plan.expense.amount.toKrwInteger(),
                months = l.plan.months,
                index = l.index,
                charge = l.charge.toKrwInteger(),
                remainingAfter = l.remainingAfter.toKrwInteger(),
                firstMonth = l.plan.firstMonth.toString(),
                lastMonth = l.plan.lastMonth.toString(),
            )
        },
        monthCharge = b.monthCharge.toKrwInteger(),
        upcoming = b.upcoming.map { MonthChargeView(it.month.toString(), it.amount.toKrwInteger()) },
    )

    private fun expenseView(e: Expense) = ExpenseView(
        id = e.id.toString(),
        amount = e.amount.toKrwInteger(),
        spentOn = e.spentOn.toString(),
        category = e.category.key,
        paymentMethod = e.paymentMethod.key,
        merchant = e.merchant,
        precision = e.precision.key,
        inputKind = e.inputKind.key,
        installmentMonths = e.installmentMonths,
        memo = e.memo,
        createdAt = e.createdAt.toString(),
    )

    private fun envelopeView(e: EnvelopeStatus) = EnvelopeView(e.key, e.budget.toKrwInteger(), e.spent.toKrwInteger(), e.remaining.toKrwInteger())

    private fun recordView(r: RecordResult) = RecordView(r.saved.map(::expenseView), r.savedTotal.toKrwInteger(), r.envelope?.let(::envelopeView), r.monthTotal.toKrwInteger())

    private fun budgetView(b: Budget) = BudgetView(
        method = b.method.key,
        income = b.income?.toKrwInteger(),
        savingsShare = b.savingsShare?.toKrwInteger(),
        envelopes = b.envelopes.map { (k, v) -> BudgetEnvelopeView(k, v.toKrwInteger()) },
        total = b.total?.toKrwInteger(),
        updatedAt = b.updatedAt.toString(),
    )

    private fun landingView(l: Landing) = LandingView(
        method = l.method.key,
        spentSoFar = l.spentSoFar.toKrwInteger(),
        scheduled = l.scheduled.toKrwInteger(),
        // 구간 끝은 바깥쪽으로 — 반올림이 구간을 좁혀 적중 판정이 달라지지 않게
        low = l.low?.toKrwInteger(RoundingMode.FLOOR),
        high = l.high?.toKrwInteger(RoundingMode.CEILING),
        reason = l.reason,
        daysOfHistory = l.daysOfHistory,
    )

    private fun trackView(t: LandingTrack) = TrackView(
        month = t.month.toString(),
        issuedOn = t.issuedOn?.toString(),
        low = t.low?.toKrwInteger(RoundingMode.FLOOR),
        high = t.high?.toKrwInteger(RoundingMode.CEILING),
        actual = t.actual?.toKrwInteger(),
        hit = t.hit,
        reason = t.reason,
    )

    private fun monthView(m: MonthView) = MonthPageView(
        month = m.month.toString(),
        current = m.daysLeft != null,
        totals = m.summary.totals.let { TotalsView(it.total.toKrwInteger(), it.exact.toKrwInteger(), it.approx.toKrwInteger(), it.count) },
        byCategory = m.summary.byCategory.entries
            .sortedByDescending { it.value }
            .map { CategorySpentView(it.key.key, it.key.bucket.key, it.value.toKrwInteger()) },
        budget = m.budget?.let(::budgetView),
        envelopes = m.envelopes.map(::envelopeView),
        unbudgeted = m.unbudgeted?.toKrwInteger(),
        remaining = m.remaining?.toKrwInteger(),
        // 하루 가용은 내림 — 올리면 남은 날 합이 남은 금액을 넘는다
        dailyAvailable = m.dailyAvailable?.toKrwInteger(RoundingMode.FLOOR),
        daysLeft = m.daysLeft,
        landing = m.landing?.let(::landingView),
        landingReason = m.landingReason,
        track = m.track?.let(::trackView),
        expenses = m.expenses.map(::expenseView),
        recurring = clock.todayKst().let { today -> RecurringMonthView(m.occurrences.map { occurrenceView(it, today) }, m.scheduledTotal.toKrwInteger()) },
        installments = installmentView(m.installments),
        close = m.close?.let(::closeView),
        closable = m.closable,
        reviewQuestions = ReviewAnswers.QUESTION_KEYS,
    )
}
