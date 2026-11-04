package com.salt.household.application

import com.salt.household.domain.Expense
import com.salt.household.domain.FixedCostCandidate
import com.salt.household.domain.FixedCostIncrease
import com.salt.household.domain.FixedCostRules
import com.salt.household.domain.HouseholdEvents
import com.salt.household.domain.InputKind
import com.salt.household.domain.InvalidFixedCost
import com.salt.household.domain.Precision
import com.salt.household.domain.RecurringTemplates
import com.salt.household.domain.SpendingPatterns
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.util.UUID

/**
 * 고정비 후보 한 번 세기(가계부 S1e) — 화면(월 화면)과 쓰기(증가 발행)가 같은 계산을 쓴다(규칙 한 곳).
 * 쿼리 3: 표본 · 숨긴 키 · 템플릿 이름. [templateKeys] 는 이상치 판정도 쓴다(월세 템플릿 이름이 가맹점과 같으면 이상치에서 뺀다)
 */
class FixedCostReader(private val patterns: SpendingPatterns, private val templates: RecurringTemplates) {
    data class Scan(val candidates: List<FixedCostCandidate>, val templateKeys: Set<String>) {
        /** 이상치에서 뺄 가맹점 — 고정비 후보 + 반복 템플릿 이름 */
        val fixedKeys: Set<String> get() = candidates.map { it.key }.toSet() + templateKeys
    }

    fun scan(userId: String, today: LocalDate): Scan {
        val templateKeys = templates.activeNames(userId).map(FixedCostRules::key).toSet()
        val excluded = patterns.hiddenKeys(userId) + templateKeys
        val charges = patterns.charges(userId, today.minusDays(FixedCostRules.LOOKBACK_DAYS))
        return Scan(FixedCostRules.detect(charges, today, excluded), templateKeys)
    }
}

/**
 * 적은 뒤 — 이번에 적은 지출이 고정비 후보의 마지막 회차이고 앞 회차보다 올랐으면 `FixedCostIncreased` 를 가맹점 · 달마다 한 번.
 * 가맹점 있는 정확한 직접 입력이 없으면 쿼리 0. 트랜잭션은 부르는 유스케이스의 것이다
 */
class FixedCostWatcher(
    private val reader: FixedCostReader,
    private val patterns: SpendingPatterns,
    private val events: HouseholdEvents,
) {
    fun afterInsert(userId: String, saved: List<Expense>, today: LocalDate, now: Instant) {
        val ids = saved.filter(::watchable).map { it.id }.toSet()
        if (ids.isEmpty()) return
        reader.scan(userId, today).candidates
            .filter { it.lastExpenseId in ids }
            .forEach { c ->
                if (c.increase == null) return@forEach
                val record = FixedCostIncrease(
                    UUID.randomUUID(), userId, c.key, YearMonth.from(c.lastOn), c.lastExpenseId, c.category, c.previousAmount, c.lastAmount, now,
                )
                if (patterns.recordIncrease(record)) events.fixedCostIncreased(record)
            }
    }

    private fun watchable(e: Expense): Boolean = e.merchant != null && e.precision == Precision.EXACT && e.inputKind != InputKind.TEMPLATE
}

/** "고정비 아니에요" — 그 가맹점 키를 후보 · 증가 발행에서 뺀다. 멱등 */
open class HideFixedCost(private val patterns: SpendingPatterns, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, key: String): String {
        val k = validKey(key)
        patterns.hide(userId, k, clock.instant())
        return k
    }
}

/** 숨긴 것 되돌리기 — 없던 키여도 성공(멱등) */
open class ShowFixedCost(private val patterns: SpendingPatterns) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, key: String): String {
        val k = validKey(key)
        patterns.show(userId, k)
        return k
    }
}

/** 키는 서버가 준 그대로만 받는다 — 다시 만들었을 때 같아야 한다(공백 · 대문자 · 길이 넘침이면 400) */
private fun validKey(key: String): String {
    if (key.isEmpty() || FixedCostRules.key(key) != key) throw InvalidFixedCost("FIXED_COST_KEY_INVALID", "key must be a merchant key from the month view")
    return key
}
