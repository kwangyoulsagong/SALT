package com.salt.household.application

import com.salt.household.domain.CategoryBook
import com.salt.household.domain.CustomCategories
import com.salt.household.domain.InvalidStory
import com.salt.household.domain.Story
import com.salt.household.domain.StoryPeriod
import com.salt.household.domain.StoryRules
import com.salt.household.domain.StorySources
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

/**
 * 이야기 카드(`SRV-REQ-046` FR-20, 가계부 S1g). 읽기만 — 이벤트 · 저장 0.
 * 아직 볼 수 없는 기간이면 재료를 읽지 않는다(쿼리 0) — 볼 수 있으면 재료 5 + 분류 표 1.
 */
open class GetStory(private val sources: StorySources, private val categories: CustomCategories, private val clock: Clock) {
    data class Result(val story: Story, val book: CategoryBook)

    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String, rawPeriod: String): Result {
        val period = StoryPeriod.parse(rawPeriod) ?: throw InvalidStory("STORY_PERIOD_INVALID", "period must be YYYY-MM or YYYY")
        val readyOn = StoryRules.readyOn(period, clock.todayKst())
        if (readyOn != null) return Result(Story(period, readyOn, emptyList()), CategoryBook.DEFAULTS_ONLY)
        val book = CategoryBook(categories.list(userId))
        val facts = sources.facts(userId, period.from, period.to)
        return Result(Story(period, null, StoryRules.lines(period, facts, book)), book)
    }
}
