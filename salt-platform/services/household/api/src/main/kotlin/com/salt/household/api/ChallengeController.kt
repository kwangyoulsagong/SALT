package com.salt.household.api

import com.salt.household.application.DeleteChallengeSaving
import com.salt.household.application.EndChallenge
import com.salt.household.application.GetChallengeSaving
import com.salt.household.application.ListChallenges
import com.salt.household.application.MarkChallengeDay
import com.salt.household.application.MarkSavingContributed
import com.salt.household.application.RecordChallengeSaving
import com.salt.household.application.StartChallenge
import com.salt.household.application.UnmarkChallengeDay
import com.salt.household.domain.Challenge
import com.salt.household.domain.ChallengeSaving
import com.salt.household.domain.ChallengeSummary
import com.salt.household.domain.InvalidChallenge
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
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.util.UUID

/**
 * 내가 고르는 챌린지 HTTP(가계부 S1d — `SRV-REQ-046` FR-19). 가계부 컨트롤러와 같은 `/api/household` 아래, 파일만 나눴다(한 파일 700줄을 넘지 않게).
 * 응답에 **실패 · 성공률 · 연속 일수 칸이 없다** — 단계(`upcoming` · `running` · `ended`) · 표시한 날 · 아낀 돈 합만. 금액은 여기서 한 번 반올림.
 */
@Tag(name = "household-challenge", description = "가계부 — 내가 고르는 챌린지 · 한 날 · 아낀 돈(SRV-REQ-046 FR-19)")
@RestController
@RequestMapping("/api/household")
class ChallengeController(
    private val listChallenges: ListChallenges,
    private val startChallenge: StartChallenge,
    private val endChallenge: EndChallenge,
    private val markChallengeDay: MarkChallengeDay,
    private val unmarkChallengeDay: UnmarkChallengeDay,
    private val recordChallengeSaving: RecordChallengeSaving,
    private val deleteChallengeSaving: DeleteChallengeSaving,
    private val getChallengeSaving: GetChallengeSaving,
    private val markSavingContributed: MarkSavingContributed,
) {
    // ---------- 요청 ----------

    data class StartRequest(
        @field:NotBlank @field:Size(max = 100) val title: String?,
        /** 비우면 오늘 */
        val startsOn: LocalDate?,
        @field:NotNull val endsOn: LocalDate?,
    )

    data class SavingRequest(
        @field:NotNull @field:Positive val amount: BigDecimal?,
        /** 비우면 오늘 */
        val savedOn: LocalDate?,
        @field:Size(max = 200) val note: String?,
    )

    data class ContributionRequest(@field:NotBlank val goalId: String?)

    // ---------- 응답 ----------

    /** 아낀 돈 한 줄 — [goalId] 는 보탠 목표(없으면 null). 목표 이름은 BFF 가 저축 목록에서 붙인다 */
    data class SavingView(val id: String, val amount: Long, val savedOn: String, val note: String?, val goalId: String?, val contributedAt: String?)

    data class ChallengeView(
        val id: String,
        val title: String,
        val startsOn: String,
        val endsOn: String,
        /** 그만둔 날 — 기간 끝까지 갔으면 null */
        val endedOn: String?,
        /** upcoming · running · ended */
        val phase: String,
        /** 표시한 날(날짜 순) — 개수는 화면이 센다. 연속 0 */
        val days: List<String>,
        val todayMarkable: Boolean,
        val savedTotal: Long,
        val contributedTotal: Long,
        val savings: List<SavingView>,
    )

    data class ChallengeListView(
        val items: List<ChallengeView>,
        /** 고르기 예시 키 — 이름은 프론트 */
        val presets: List<String>,
        val limit: Int,
        val openCount: Int,
        /** 상한에 닿았나 — 서버가 정한다 */
        val canStart: Boolean,
        /** 기간 상한(일) — 화면 안내 글자. 넘으면 서버가 거절한다 */
        val periodDaysMax: Long,
        /** 오늘(KST) = 시작 칸 min · 기본값. [startMax] = 시작 칸 max — 화면이 날짜를 더하지 않게 서버가 준다 */
        val today: String,
        val startMax: String,
    )

    /** BFF 가 목표에 보태기 전에 읽는 한 줄 */
    data class SavingSourceView(val id: String, val challengeId: String, val amount: Long, val savedOn: String, val goalId: String?)

    // ---------- 경로 ----------

    @Operation(summary = "챌린지 목록", description = "진행 · 예정 먼저, 끝난 것은 뒤. 최근 30개. 실패 · 연속 일수 칸 없음")
    @GetMapping("/challenges")
    fun list(user: AuthenticatedUser): ResponseEntity<ApiResponse<ChallengeListView>> {
        val v = listChallenges.execute(user.userId)
        return ApiResponse.ok(
            ChallengeListView(
                items = v.items.map(::challengeView),
                presets = v.presets.map { it.key },
                limit = v.limit,
                openCount = v.openCount,
                canStart = v.openCount < v.limit,
                periodDaysMax = Challenge.PERIOD_DAYS_MAX,
                today = v.today.toString(),
                startMax = v.today.plusDays(Challenge.START_AHEAD_DAYS_MAX).toString(),
            ),
        )
    }

    @Operation(summary = "챌린지 고르기", description = "이름 · 기간(최대 92일, 시작은 오늘~30일 뒤). 진행 · 예정 5개면 409")
    @PostMapping("/challenges")
    fun start(user: AuthenticatedUser, @Valid @RequestBody body: StartRequest): ResponseEntity<ApiResponse<ChallengeView>> =
        ApiResponse.created(challengeView(startChallenge.execute(user.userId, body.title!!, body.startsOn, body.endsOn!!)))

    @Operation(summary = "챌린지 그만두기", description = "언제든 · 다시 눌러도 같다. 실패로 적지 않는다")
    @PostMapping("/challenges/{id}/end")
    fun end(user: AuthenticatedUser, @PathVariable id: String): ResponseEntity<ApiResponse<ChallengeView>> =
        ApiResponse.ok(challengeView(endChallenge.execute(user.userId, id)))

    @Operation(summary = "한 날 표시", description = "기간 안 · 오늘까지. 다시 눌러도 같다")
    @PutMapping("/challenges/{id}/days/{date}")
    fun markDay(user: AuthenticatedUser, @PathVariable id: String, @PathVariable date: String): ResponseEntity<ApiResponse<ChallengeView>> =
        ApiResponse.ok(challengeView(markChallengeDay.execute(user.userId, id, parseDay(date))))

    @Operation(summary = "한 날 표시 지우기", description = "없어도 성공")
    @DeleteMapping("/challenges/{id}/days/{date}")
    fun unmarkDay(user: AuthenticatedUser, @PathVariable id: String, @PathVariable date: String): ResponseEntity<ApiResponse<ChallengeView>> =
        ApiResponse.ok(challengeView(unmarkChallengeDay.execute(user.userId, id, parseDay(date))))

    @Operation(summary = "아낀 돈 적기", description = "기간 안의 날. 실제 적립이 아니다 — 목표에 보태기는 따로")
    @PostMapping("/challenges/{id}/savings")
    fun recordSaving(user: AuthenticatedUser, @PathVariable id: String, @Valid @RequestBody body: SavingRequest): ResponseEntity<ApiResponse<ChallengeView>> =
        ApiResponse.created(challengeView(recordChallengeSaving.execute(user.userId, id, Money.krw(body.amount!!), body.savedOn, body.note)))

    @Operation(summary = "아낀 돈 지우기", description = "목표에 보탠 것은 409")
    @DeleteMapping("/challenge-savings/{id}")
    fun deleteSaving(user: AuthenticatedUser, @PathVariable id: String): ResponseEntity<ApiResponse<ChallengeView>> =
        ApiResponse.ok(challengeView(deleteChallengeSaving.execute(user.userId, id)))

    @Operation(summary = "아낀 돈 한 줄(BFF 용)", description = "목표에 보태기 전에 금액 · 날짜를 읽는다")
    @GetMapping("/challenge-savings/{id}")
    fun saving(user: AuthenticatedUser, @PathVariable id: String): ResponseEntity<ApiResponse<SavingSourceView>> {
        val s = getChallengeSaving.execute(user.userId, id)
        return ApiResponse.ok(SavingSourceView(s.id.toString(), s.challengeId.toString(), s.amount.toKrwInteger(), s.savedOn.toString(), s.contribution?.goalId?.toString()))
    }

    @Operation(summary = "목표에 보탰다고 적기(BFF 용)", description = "저축 적립 뒤에 부른다. 같은 목표면 그대로, 다른 목표면 409")
    @PutMapping("/challenge-savings/{id}/contribution")
    fun contributed(user: AuthenticatedUser, @PathVariable id: String, @Valid @RequestBody body: ContributionRequest): ResponseEntity<ApiResponse<ChallengeView>> {
        val goalId = runCatching { UUID.fromString(body.goalId) }.getOrElse { throw InvalidChallenge("GOAL_ID_INVALID", "goalId must be a UUID") }
        return ApiResponse.ok(challengeView(markSavingContributed.execute(user.userId, id, goalId)))
    }

    // ---------- 변환 — 반올림은 여기서 한 번 ----------

    private fun parseDay(raw: String): LocalDate = try {
        LocalDate.parse(raw)
    } catch (e: DateTimeParseException) {
        throw InvalidChallenge("DATE_INVALID", "date must be YYYY-MM-DD")
    }

    private fun savingView(s: ChallengeSaving) =
        SavingView(s.id.toString(), s.amount.toKrwInteger(), s.savedOn.toString(), s.note, s.contribution?.goalId?.toString(), s.contribution?.at?.toString())

    private fun challengeView(c: ChallengeSummary) = ChallengeView(
        id = c.challenge.id.toString(),
        title = c.challenge.title,
        startsOn = c.challenge.startsOn.toString(),
        endsOn = c.challenge.endsOn.toString(),
        endedOn = c.challenge.endedOn?.toString(),
        phase = c.phase.key,
        days = c.days.map { it.toString() },
        todayMarkable = c.todayMarkable,
        savedTotal = c.savedTotal.toKrwInteger(),
        contributedTotal = c.contributedTotal.toKrwInteger(),
        savings = c.savings.map(::savingView),
    )
}
