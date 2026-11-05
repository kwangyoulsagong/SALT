package com.salt.household.api

import com.salt.household.application.GetStory
import com.salt.household.domain.StoryLine
import com.salt.household.domain.StoryPeriod
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 이야기 카드(`SRV-REQ-046` FR-20, 가계부 S1g). 어떤 줄을 보일지 · 금액 · 몫은 여기 응답이 준다 — 문구는 내리지 않는다(줄 종류 키만).
 * 금액은 그대로 준다 — 공유 이미지의 금액 가림(기본)은 화면 몫이고, 어느 값이 금액인지는 줄 종류가 말한다(`amount` 칸).
 */
@Tag(name = "household", description = "가계부 — 이야기 카드(SRV-REQ-046 FR-20)")
@RestController
@RequestMapping("/api/household/story")
class StoryController(private val getStory: GetStory) {
    /**
     * 줄 하나 — 종류(`kind`)마다 쓰는 칸만 찬다.
     * spent: amount · count · days · approx / top_category: category · amount · sharePercent / top_month: month · amount /
     * no_spend_days · challenge_days: days / challenge_saved: amount / feelings_tagged: count
     */
    data class StoryLineView(
        val kind: String,
        val amount: Long? = null,
        val count: Int? = null,
        val days: Int? = null,
        val approx: Boolean? = null,
        val category: String? = null,
        val sharePercent: Int? = null,
        val month: String? = null,
    )

    /** [scope] month | year · [readyOn] 아직이면 볼 수 있는 첫날(그땐 lines 빈 목록) · [categories] 내 분류 이름(월 화면과 같은 꼴) */
    data class StoryView(
        val period: String,
        val scope: String,
        val ready: Boolean,
        val readyOn: String?,
        val lines: List<StoryLineView>,
        val categories: List<HouseholdController.CategoryView>,
    )

    @Operation(
        summary = "이야기 카드",
        description = "period = YYYY-MM(달) | YYYY(해). 지난 기간은 바로, 이번 기간은 마지막 3일부터(ready=false 면 readyOn). " +
            "값이 없는 줄은 빠진다. 오지 않은 기간은 400 STORY_PERIOD_FUTURE",
    )
    @GetMapping("/{period}")
    fun story(user: AuthenticatedUser, @PathVariable period: String): ResponseEntity<ApiResponse<StoryView>> {
        val r = getStory.execute(user.userId, period)
        val s = r.story
        return ApiResponse.ok(
            StoryView(
                period = s.period.key,
                scope = if (s.period is StoryPeriod.Month) "month" else "year",
                ready = s.ready,
                readyOn = s.readyOn?.toString(),
                lines = s.lines.map(::lineView),
                categories = categoryViews(r.book),
            ),
        )
    }

    private fun lineView(l: StoryLine): StoryLineView = when (l) {
        is StoryLine.Spent -> StoryLineView(l.kind, amount = l.total.toKrwInteger(), count = l.count, days = l.recordedDays, approx = l.approx)
        is StoryLine.TopCategory -> StoryLineView(l.kind, amount = l.amount.toKrwInteger(), category = l.category.key, sharePercent = l.sharePercent)
        is StoryLine.TopMonth -> StoryLineView(l.kind, amount = l.amount.toKrwInteger(), month = l.month.toString())
        is StoryLine.NoSpendDays -> StoryLineView(l.kind, days = l.days)
        is StoryLine.ChallengeDays -> StoryLineView(l.kind, days = l.days)
        is StoryLine.ChallengeSaved -> StoryLineView(l.kind, amount = l.amount.toKrwInteger())
        is StoryLine.FeelingsTagged -> StoryLineView(l.kind, count = l.count)
    }
}
