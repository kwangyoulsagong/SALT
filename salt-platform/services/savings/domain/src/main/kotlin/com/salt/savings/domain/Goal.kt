package com.salt.savings.domain

import com.salt.kernel.Money
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.util.UUID

/**
 * 저축 목표(`SRV-REQ-045` · `DB-REQ-037`). 목표는 이름 · 금액 · 날짜 칸이 아니라 **계산기**다 — 월 적립액 ↔ 도달 월을 이 서비스가 계산하고
 * 프론트는 표시만 한다(제품 공통 기준 3). 앱은 칭찬 · 재촉하지 않는다 — 이 패키지의 상태 이름도 사실만 적는다.
 */
@JvmInline
value class GoalId(val value: UUID) {
    override fun toString(): String = value.toString()

    companion object {
        fun parse(raw: String): GoalId? = runCatching { GoalId(UUID.fromString(raw)) }.getOrNull()

        fun new(): GoalId = GoalId(UUID.randomUUID())
    }
}

/** 생애 이벤트 템플릿 7종(FEATURE-012 FR-1). [key] 가 저장 · 응답 값이다. */
enum class GoalTemplate(val key: String) {
    WEDDING("wedding"),
    HOUSING("housing"),
    FIRST_CAR("first_car"),
    TRAVEL("travel"),
    EMERGENCY("emergency"),
    CHILDBIRTH("childbirth"),
    OTHER("other"),
    ;

    companion object {
        fun fromKey(key: String): GoalTemplate? = entries.firstOrNull { it.key == key }

        /** 옛 `GoalCategory`(travel · first_car · startup · wedding · creative · other) → 템플릿. 창업 · 창작은 기타로, 원래 값은 `legacy_category` 가 든다(`DB-REQ-037` FR-1) */
        fun fromLegacyCategory(category: String): GoalTemplate = when (category) {
            "travel" -> TRAVEL
            "first_car" -> FIRST_CAR
            "wedding" -> WEDDING
            else -> OTHER
        }
    }
}

enum class GoalStatus(val key: String) {
    ACTIVE("active"),
    COMPLETED("completed"),
    PAUSED("paused"),
    ;

    companion object {
        fun fromKey(key: String): GoalStatus = entries.first { it.key == key }
    }
}

/**
 * 이자 계산 조건 — 사용자가 넣은 연 이율(%, 세전). 상품을 고르거나 안내하지 않는다(FEATURE-012 정책).
 * 세율은 [SavingsMath.INTEREST_TAX_RATE] — 제도 파라미터 사본(`SRV-REQ-045` FR-13)이 생기면 그 값으로 바꾼다.
 */
data class InterestPlan(val annualRatePercent: BigDecimal) {
    init {
        require(annualRatePercent.signum() >= 0 && annualRatePercent <= BigDecimal("30")) { "연 이율은 0~30%" }
    }
}

class Goal(
    val id: GoalId,
    val userId: String,
    val title: String,
    val template: GoalTemplate,
    val targetAmount: Money,
    /** 기한 — 기한 모드에서만. 월 적립 모드면 null(도달 월은 계산값) */
    val targetDate: LocalDate?,
    /** 계획 월 적립액 — 기한 모드면 서버가 계산해 저장한 값, 월 적립 모드면 사용자가 넣은 값 */
    val monthlyPlan: Money?,
    val interest: InterestPlan?,
    val status: GoalStatus,
    val createdAt: Instant,
    val completedAt: Instant?,
) {
    companion object {
        const val TITLE_MAX = 100

        /**
         * 만들기 — 규칙: 이름 1~100자 · 금액 > 0 · 기한이나 월 적립 중 **하나 이상**. 기한이 이번 달이거나 지났으면 거부(계산할 달이 없다).
         * 기한만 주면 월 적립액을 계산해 계획으로 저장한다.
         */
        fun create(
            userId: String,
            title: String,
            template: GoalTemplate,
            targetAmount: Money,
            targetDate: LocalDate?,
            monthlyPlan: Money?,
            interest: InterestPlan?,
            today: LocalDate,
            now: Instant,
        ): Goal {
            val name = title.trim()
            if (name.isEmpty() || name.length > TITLE_MAX) throw InvalidGoal("GOAL_TITLE_INVALID", "title must be 1..$TITLE_MAX characters")
            if (targetAmount.isNegative() || targetAmount.isZero()) throw InvalidGoal("GOAL_AMOUNT_INVALID", "targetAmount must be positive")
            if (targetDate == null && monthlyPlan == null) throw InvalidGoal("GOAL_PLAN_REQUIRED", "targetDate or monthlyPlan is required")
            if (monthlyPlan != null && (monthlyPlan.isNegative() || monthlyPlan.isZero())) {
                throw InvalidGoal("GOAL_MONTHLY_INVALID", "monthlyPlan must be positive")
            }
            // 기한을 주면 월 적립을 같이 줘도 기한이 이번 달 뒤여야 한다 — 계획과 기한이 엇갈린 목표를 저장하지 않는다(코드 리뷰 2026-11-03)
            if (targetDate != null && SavingsMath.monthsUntil(today, targetDate) <= 0) {
                throw InvalidGoal("GOAL_DEADLINE_TOO_CLOSE", "targetDate must be in a later month than today")
            }
            val plan = when {
                monthlyPlan != null -> monthlyPlan
                else -> {
                    val calc = SavingsMath.byDeadline(targetAmount, Money.zero(targetAmount.currency), targetDate!!, interest, today)
                    if (calc.state == CalculationState.DEADLINE_TOO_CLOSE) {
                        throw InvalidGoal("GOAL_DEADLINE_TOO_CLOSE", "targetDate must be in a later month than today")
                    }
                    calc.monthly
                }
            }
            return Goal(GoalId.new(), userId, name, template, targetAmount, targetDate, plan, interest, GoalStatus.ACTIVE, now, null)
        }
    }

    /** 저울 확정 · 시뮬레이션 — 계획 월 적립만 바뀐다. 기한(있으면)은 그대로: 기한 모드 목표의 "필요 월 적립"은 상세가 따로 다시 계산한다 */
    fun withMonthlyPlan(plan: Money): Goal {
        if (plan.isNegative() || plan.isZero()) throw InvalidGoal("GOAL_MONTHLY_INVALID", "monthlyPlan must be positive")
        return Goal(id, userId, title, template, targetAmount, targetDate, plan, interest, status, createdAt, completedAt)
    }

    fun withCompleted(at: Instant): Goal =
        Goal(id, userId, title, template, targetAmount, targetDate, monthlyPlan, interest, GoalStatus.COMPLETED, createdAt, at)
}

enum class DepositSource(val key: String) {
    MANUAL("manual"),

    /** 가계부 챌린지로 "아낀 돈" — 실제 적립과 구분한다(F013 FR-19). 이번 슬라이스는 쓰지 않는다 */
    SAVED_BY_CHALLENGE("saved_by_challenge"),

    /** 옛 `goals.current_amount` 중 거래 기록이 없는 몫 — 가져오기에서 한 번(`savings-import.sql`) */
    IMPORTED_BALANCE("imported_balance"),
    ;

    companion object {
        fun fromKey(key: String): DepositSource = entries.first { it.key == key }
    }
}

class Deposit(
    val id: UUID,
    val goalId: GoalId,
    val userId: String,
    val amount: Money,
    val depositedOn: LocalDate,
    val note: String?,
    /** 여러 목표에 나눠 넣은 한 묶음 — 단건이면 null */
    val splitGroupId: UUID?,
    val source: DepositSource,
    val createdAt: Instant,
) {
    companion object {
        const val NOTE_MAX = 200

        fun manual(goal: Goal, amount: Money, depositedOn: LocalDate, note: String?, splitGroupId: UUID?, today: LocalDate, now: Instant): Deposit {
            if (amount.isNegative() || amount.isZero()) throw InvalidGoal("DEPOSIT_AMOUNT_INVALID", "amount must be positive")
            if (depositedOn.isAfter(today)) throw InvalidGoal("DEPOSIT_DATE_FUTURE", "depositedOn must not be in the future")
            if (note != null && note.length > NOTE_MAX) throw InvalidGoal("DEPOSIT_NOTE_TOO_LONG", "note must be at most $NOTE_MAX characters")
            return Deposit(UUID.randomUUID(), goal.id, goal.userId, amount, depositedOn, note?.trim()?.ifEmpty { null }, splitGroupId, DepositSource.MANUAL, now)
        }
    }
}

/** 한 달 적립 합계(KST 날짜 기준). 구간 계산의 표본 하나 */
data class MonthlyDeposit(val month: YearMonth, val amount: Money)

/** 목표 하나의 적립 집계 — 목록 쿼리 한 번으로 모든 목표 몫을 받는다(`SRV-REQ-045` FR-19) */
data class DepositTotals(
    val saved: Money,
    val count: Int,
    val lastDepositedOn: LocalDate?,
    /** 이번 달(KST) 넣은 돈 — 이정표용 */
    val thisMonth: Money,
    /** 직접 넣은 적립 건수 — 가져온 잔액 한 줄은 빼고. 도장 · 엽서가 센다 */
    val actions: Int,
)
