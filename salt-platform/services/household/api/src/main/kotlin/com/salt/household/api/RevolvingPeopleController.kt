package com.salt.household.api

import com.salt.household.application.AddPersonEntry
import com.salt.household.application.AddRevolving
import com.salt.household.application.DeletePersonEntry
import com.salt.household.application.EditPersonEntry
import com.salt.household.application.EditRevolving
import com.salt.household.application.EndRevolving
import com.salt.household.application.GetPeople
import com.salt.household.application.ListRevolving
import com.salt.household.application.PersonEntryInput
import com.salt.household.application.RevolvingInput
import com.salt.household.application.SetOccasionEnvelope
import com.salt.household.domain.EnvelopeStatusOfYear
import com.salt.household.domain.InvalidRevolving
import com.salt.household.domain.Occasion
import com.salt.household.domain.PersonEntry
import com.salt.household.domain.RevolvingBand
import com.salt.household.domain.RevolvingCharge
import com.salt.household.domain.RevolvingMath
import com.salt.household.domain.RevolvingPlan
import com.salt.household.domain.RevolvingProjection
import com.salt.kernel.Money
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
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
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeParseException

/**
 * 리볼빙 명세서 · 사람 장부 HTTP(가계부 S1h — `SRV-REQ-046` FR-10 · FR-14). 가계부 컨트롤러와 같은 `/api/household` 아래, 파일만 나눴다.
 * 리볼빙은 **추정**이다 — 응답에 가정(`assumption`)을 싣고, 결제비율 · 해지에 관한 지시 칸이 없다.
 * 사람 장부에는 차액 · "갚을 돈" 칸이 없다 — 준 합 · 받은 합만. 금액은 여기서 한 번 반올림.
 */
@Tag(name = "household-revolving-people", description = "가계부 — 리볼빙 명세서 · 사람 장부 · 해 경조사 봉투(SRV-REQ-046 FR-10 · FR-14)")
@RestController
@RequestMapping("/api/household")
class RevolvingPeopleController(
    private val listRevolving: ListRevolving,
    private val addRevolving: AddRevolving,
    private val editRevolving: EditRevolving,
    private val endRevolving: EndRevolving,
    private val getPeople: GetPeople,
    private val addPersonEntry: AddPersonEntry,
    private val editPersonEntry: EditPersonEntry,
    private val deletePersonEntry: DeletePersonEntry,
    private val setOccasionEnvelope: SetOccasionEnvelope,
) {
    // ---------- 요청 ----------

    data class RevolvingRequest(
        @field:Size(max = 60) val label: String?,
        @field:NotNull @field:Positive val balance: BigDecimal?,
        @field:NotNull val payRatio: Int?,
        @field:NotNull @field:Positive val annualRate: BigDecimal?,
        /** YYYY-MM */
        @field:NotBlank val statementMonth: String?,
    )

    data class PersonEntryRequest(
        @field:NotBlank @field:Size(max = 60) val person: String?,
        @field:NotBlank val direction: String?,
        @field:NotNull @field:Positive val amount: BigDecimal?,
        @field:NotBlank val occasion: String?,
        /** 비우면 오늘(고치기에선 그대로) */
        val happenedOn: LocalDate?,
        @field:Size(max = 200) val memo: String?,
    )

    data class EnvelopeRequest(@field:NotNull @field:Positive val amount: BigDecimal?)

    // ---------- 응답 ----------

    data class RevolvingPlanView(
        val id: String,
        val label: String?,
        val balance: Long,
        val payRatio: Int,
        /** 연 % — 소수 둘째 자리 문자열("16.50") */
        val annualRate: String,
        val statementMonth: String,
        val endedOn: String?,
    )

    data class RevolvingChargeView(val month: String, val principal: Long, val fee: Long, val total: Long, val balanceAfter: Long)

    data class RevolvingProjectionView(
        val plan: RevolvingPlanView,
        val charges: List<RevolvingChargeView>,
        /** 추정 기간 수수료 합 */
        val feeTotal: Long,
        /** 추정 기간 뒤 남는 잔액 */
        val balanceAtEnd: Long,
        /** 추정 마지막 달 — 지나면 새 명세서를 적어야 띠가 다시 나온다 */
        val horizonEnd: String,
    )

    data class RevolvingListView(
        val open: List<RevolvingProjectionView>,
        val ended: List<RevolvingPlanView>,
        val limit: Int,
        val canAdd: Boolean,
        /** 입력 경계 — 화면 안내 · 칸 min/max. 넘으면 서버가 거절한다 */
        val ratioMin: Int,
        val ratioMax: Int,
        val rateMax: String,
        /** 명세서 달 칸 min · max(YYYY-MM) */
        val monthMin: String,
        val monthMax: String,
        val horizonMonths: Int,
        /** 가정 키 — 문장은 프론트("새로 쓰는 돈 없이 이대로 낸다면") */
        val assumption: String,
    )

    data class PersonEntryView(
        val id: String,
        val person: String,
        val direction: String,
        val amount: Long,
        val occasion: String,
        val happenedOn: String,
        val memo: String?,
    )

    data class PersonTallyView(val person: String, val gave: Long, val received: Long, val count: Int, val lastOn: String)

    data class EnvelopeView(val year: Int, val amount: Long, val gave: Long, val remaining: Long)

    data class PeopleView(
        val year: Int,
        val person: String?,
        val people: List<PersonTallyView>,
        val entries: List<PersonEntryView>,
        val envelope: EnvelopeView?,
        val gave: Long,
        val received: Long,
        val occasions: List<String>,
        val today: String,
        /** 해 고르기 칸 범위 */
        val yearMin: Int,
        val yearMax: Int,
    )

    // ---------- 리볼빙 ----------

    @Operation(summary = "리볼빙 명세서 목록", description = "끝내지 않은 것(앞으로 6개월 추정 포함) + 최근 끝낸 것. 추정은 새로 쓰는 돈 없이 이대로 낼 때")
    @GetMapping("/revolving")
    fun revolving(user: AuthenticatedUser): ResponseEntity<ApiResponse<RevolvingListView>> = ApiResponse.ok(listView(listRevolving.execute(user.userId)))

    @Operation(summary = "리볼빙 명세서 적기", description = "이월 잔액 · 약정결제비율(10~100%) · 연 수수료율(0 초과 20% 이하) · 명세서 달(이번 달~6개월 전). 5개면 409")
    @PostMapping("/revolving")
    fun addRevolving(user: AuthenticatedUser, @Valid @RequestBody body: RevolvingRequest): ResponseEntity<ApiResponse<RevolvingListView>> =
        ApiResponse.created(listView(addRevolving.execute(user.userId, input(body))))

    @Operation(summary = "새 명세서로 고치기", description = "같은 검사. 끝낸 것은 409")
    @PutMapping("/revolving/{id}")
    fun editRevolving(user: AuthenticatedUser, @PathVariable id: String, @Valid @RequestBody body: RevolvingRequest): ResponseEntity<ApiResponse<RevolvingListView>> =
        ApiResponse.ok(listView(editRevolving.execute(user.userId, id, input(body))))

    @Operation(summary = "다 갚았어요 · 해지했어요", description = "그 달부터 띠에서 빠진다. 다시 눌러도 같다")
    @PostMapping("/revolving/{id}/end")
    fun endRevolving(user: AuthenticatedUser, @PathVariable id: String): ResponseEntity<ApiResponse<RevolvingListView>> =
        ApiResponse.ok(listView(endRevolving.execute(user.userId, id)))

    // ---------- 사람 장부 ----------

    @Operation(summary = "사람 장부", description = "year(기본 올해) 줄 · 해 봉투, 또는 person 한 사람의 모든 줄. 사람별 합은 늘 모든 해. 차액 칸 없음")
    @GetMapping("/people")
    fun people(user: AuthenticatedUser, @RequestParam(required = false) year: Int?, @RequestParam(required = false) person: String?): ResponseEntity<ApiResponse<PeopleView>> {
        val v = getPeople.execute(user.userId, year, person?.takeIf { it.isNotBlank() })
        return ApiResponse.ok(
            PeopleView(
                year = v.year.value,
                person = v.person,
                people = v.people.map { PersonTallyView(it.person, it.gave.toKrwInteger(), it.received.toKrwInteger(), it.count, it.lastOn.toString()) },
                entries = v.entries.map(::entryView),
                envelope = v.envelope?.let(::envelopeView),
                gave = v.gave.toKrwInteger(),
                received = v.received.toKrwInteger(),
                occasions = Occasion.entries.map { it.key },
                today = v.today.toString(),
                yearMin = PersonEntry.EARLIEST.year,
                yearMax = v.today.year + 1,
            ),
        )
    }

    @Operation(summary = "사람 장부 적기", description = "이름(20자) · 준 돈/받은 돈 · 금액 · 어떤 일 · 날(오늘까지)")
    @PostMapping("/people/entries")
    fun addEntry(user: AuthenticatedUser, @Valid @RequestBody body: PersonEntryRequest): ResponseEntity<ApiResponse<PersonEntryView>> =
        ApiResponse.created(entryView(addPersonEntry.execute(user.userId, input(body))))

    @Operation(summary = "사람 장부 고치기")
    @PutMapping("/people/entries/{id}")
    fun editEntry(user: AuthenticatedUser, @PathVariable id: String, @Valid @RequestBody body: PersonEntryRequest): ResponseEntity<ApiResponse<PersonEntryView>> =
        ApiResponse.ok(entryView(editPersonEntry.execute(user.userId, id, input(body))))

    @Operation(summary = "사람 장부 지우기", description = "없어도 성공")
    @DeleteMapping("/people/entries/{id}")
    fun deleteEntry(user: AuthenticatedUser, @PathVariable id: String): ResponseEntity<ApiResponse<Map<String, Boolean>>> {
        deletePersonEntry.execute(user.userId, id)
        return ApiResponse.ok(mapOf("deleted" to true))
    }

    @Operation(summary = "해 경조사 봉투 정하기", description = "그해 한 금액. 다시 정하면 바꾼다. 남은 금액 = 봉투 − 그해 준 합(음수 가능 · 막지 않음)")
    @PutMapping("/people/envelope/{year}")
    fun putEnvelope(user: AuthenticatedUser, @PathVariable year: Int, @Valid @RequestBody body: EnvelopeRequest): ResponseEntity<ApiResponse<EnvelopeView>> =
        ApiResponse.ok(envelopeView(setOccasionEnvelope.execute(user.userId, year, Money.krw(body.amount!!))!!))

    @Operation(summary = "해 경조사 봉투 지우기", description = "없어도 성공")
    @DeleteMapping("/people/envelope/{year}")
    fun deleteEnvelope(user: AuthenticatedUser, @PathVariable year: Int): ResponseEntity<ApiResponse<Map<String, Boolean>>> {
        setOccasionEnvelope.execute(user.userId, year, null)
        return ApiResponse.ok(mapOf("deleted" to true))
    }

    // ---------- 변환 — 반올림은 여기서 한 번 ----------

    private fun input(b: RevolvingRequest): RevolvingInput {
        val month = try {
            YearMonth.parse(b.statementMonth!!)
        } catch (e: DateTimeParseException) {
            throw InvalidRevolving("REVOLVING_MONTH_INVALID", "statementMonth must be YYYY-MM")
        }
        return RevolvingInput(b.label, Money.krw(b.balance!!), b.payRatio!!, b.annualRate!!, month)
    }

    private fun input(b: PersonEntryRequest) = PersonEntryInput(b.person!!, b.direction!!, Money.krw(b.amount!!), b.occasion!!, b.happenedOn, b.memo)

    private fun listView(v: ListRevolving.View): RevolvingListView {
        val current = YearMonth.from(v.today)
        return RevolvingListView(
            open = v.open.map(::projectionView),
            ended = v.ended.map(::revolvingPlanView),
            limit = v.limit,
            canAdd = v.open.size < v.limit,
            ratioMin = RevolvingPlan.RATIO_MIN,
            ratioMax = RevolvingPlan.RATIO_MAX,
            rateMax = RevolvingPlan.RATE_MAX.setScale(2).toPlainString(),
            monthMin = current.minusMonths(RevolvingPlan.STATEMENT_BACK_MONTHS).toString(),
            monthMax = current.toString(),
            horizonMonths = RevolvingMath.HORIZON_MONTHS,
            assumption = REVOLVING_ASSUMPTION,
        )
    }

    private fun projectionView(p: RevolvingProjection) = RevolvingProjectionView(
        plan = revolvingPlanView(p.plan),
        charges = p.charges.map(::chargeView),
        feeTotal = p.feeTotal.toKrwInteger(),
        balanceAtEnd = p.balanceAtEnd.toKrwInteger(),
        horizonEnd = p.plan.horizonEnd.toString(),
    )

    private fun entryView(e: PersonEntry) =
        PersonEntryView(e.id.toString(), e.person, e.direction.key, e.amount.toKrwInteger(), e.occasion.key, e.happenedOn.toString(), e.memo)

    private fun envelopeView(s: EnvelopeStatusOfYear) =
        EnvelopeView(s.envelope.year.value, s.envelope.amount.toKrwInteger(), s.gave.toKrwInteger(), s.remaining.toKrwInteger())
}

/** 추정 가정 키 — 새로 쓰는 돈 없이 · 약정결제비율대로 · 수수료율 그대로 */
const val REVOLVING_ASSUMPTION = "no_new_use"

internal fun revolvingPlanView(p: RevolvingPlan) = RevolvingPeopleController.RevolvingPlanView(
    id = p.id.toString(),
    label = p.label,
    balance = p.balance.toKrwInteger(),
    payRatio = p.payRatio,
    annualRate = p.annualRate.setScale(2).toPlainString(),
    statementMonth = p.statementMonth.toString(),
    endedOn = p.endedOn?.toString(),
)

private fun chargeView(c: RevolvingCharge) =
    RevolvingPeopleController.RevolvingChargeView(c.month.toString(), c.principal.toKrwInteger(), c.fee.toKrwInteger(), c.total.toKrwInteger(), c.balanceAfter.toKrwInteger())

/** 월 화면 리볼빙 띠 — 이 달 청구 줄 · 앞으로 6개월 합 · 추정이 지난 명세서 */
data class RevolvingBandView(
    val lines: List<RevolvingBandLineView>,
    val monthCharge: Long,
    val upcoming: List<HouseholdController.MonthChargeView>,
    val stale: List<RevolvingPeopleController.RevolvingPlanView>,
    val assumption: String,
)

data class RevolvingBandLineView(val plan: RevolvingPeopleController.RevolvingPlanView, val charge: RevolvingPeopleController.RevolvingChargeView)

internal fun revolvingBandView(b: RevolvingBand) = RevolvingBandView(
    lines = b.lines.map { RevolvingBandLineView(revolvingPlanView(it.projection.plan), chargeView(it.charge)) },
    monthCharge = b.monthCharge.toKrwInteger(),
    upcoming = b.upcoming.map { HouseholdController.MonthChargeView(it.month.toString(), it.amount.toKrwInteger()) },
    stale = b.stale.map(::revolvingPlanView),
    assumption = REVOLVING_ASSUMPTION,
)
