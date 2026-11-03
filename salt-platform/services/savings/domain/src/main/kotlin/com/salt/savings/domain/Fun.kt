package com.salt.savings.domain

import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID

/**
 * 모으는 재미(`SRV-REQ-045` FR-16 · FEATURE-012 FR-15~18) — 장면 단계 · 실물 환산 · 도장 · 엽서. **숫자는 전부 서버가 정한다** —
 * 화면은 단계 번호로 그림을 고르고 개수를 그대로 보인다. 칭찬 · 재촉 상태는 없다: 단계 · 개수 · 일수 같은 사실만.
 */
enum class SceneKind(val key: String) {
    /** 지도 위 비행기가 한 칸씩 — 여행 */
    TRIP("trip"),

    /** 부품이 하나씩 붙는 차 — 첫 차 */
    CAR("car"),

    /** 우산이 한 살씩 펴진다 — 비상금 */
    UMBRELLA("umbrella"),

    /** 집이 한 층씩 — 주거 */
    HOUSE("house"),

    /** 병이 한 칸씩 차오른다 — 나머지 */
    JAR("jar"),
    ;

    companion object {
        fun of(template: GoalTemplate): SceneKind = when (template) {
            GoalTemplate.TRAVEL -> TRIP
            GoalTemplate.FIRST_CAR -> CAR
            GoalTemplate.EMERGENCY -> UMBRELLA
            GoalTemplate.HOUSING -> HOUSE
            else -> JAR
        }
    }
}

/**
 * 장면 단계 — 진척 10% 마다 한 칸(0~[STEPS]). 내림이라 99.9% 는 9칸, 다 차야 10칸.
 * 단계를 서버가 정해 웹 · 앱이 같은 칸을 그린다(FE 계산 0). 장면 종류는 템플릿에서(`goal.scene_kind` 열은 사용자 선택이 생기면 쓴다)
 */
data class Scene(val kind: SceneKind, val step: Int) {
    companion object {
        const val STEPS = 10

        fun of(template: GoalTemplate, progress: BigDecimal): Scene =
            Scene(SceneKind.of(template), progress.multiply(BigDecimal(STEPS)).setScale(0, RoundingMode.FLOOR).toInt().coerceIn(0, STEPS))
    }
}

/**
 * 도장 수(FR-17) — 목표를 만들 때 첫 도장 하나 + 직접 넣은 적립마다 하나. 가져온 잔액 한 줄은 적립 행동이 아니라 세지 않는다.
 * **표를 따로 두지 않는다**(`DB-REQ-037` FR-6 정정) — 적립 기록에서 바로 세면 도장과 적립이 갈라질 일이 없다
 */
fun stampCount(depositActions: Int): Int = 1 + depositActions

/**
 * 엽서(FR-18) — 다 찬 목표의 기록 한 장: 걸린 일수 · 적립 횟수. 사진은 파일 저장소가 정해지면(`OPS-001`) — 지금은 숫자만.
 * 표를 따로 두지 않는다 — 목표 · 적립에서 계산되는 값이라(`DB-REQ-037` FR-7 정정, 사진 열이 생길 때 표를 만든다)
 */
data class Postcard(val startedOn: LocalDate, val reachedOn: LocalDate, val daysTaken: Long, val depositActions: Int) {
    companion object {
        fun of(startedOn: LocalDate, reachedOn: LocalDate, depositActions: Int): Postcard =
            Postcard(startedOn, reachedOn, ChronoUnit.DAYS.between(startedOn, reachedOn).coerceAtLeast(0), depositActions)
    }
}

/**
 * 실물 단위(FR-16 · `DB-REQ-037` FR-5) — 사용자가 목표에 붙인 "제주 왕복 120,000원" 같은 단위. 템플릿 단위는 출처 · 기준일이 있는 값만
 * 넣는다(기준선과 같은 판단 — 원문 대조 전 숫자를 금액으로 내리지 않는다). 지금은 사용자 단위만.
 */
class ItemUnit(
    val id: UUID,
    val goalId: GoalId,
    val userId: String,
    val name: String,
    val unitPrice: Money,
    val createdAt: java.time.Instant,
) {
    /** 모은 돈으로 몇 개 — 내림(다 모으지 못한 한 개를 세지 않는다) */
    fun countFor(saved: Money): Long = saved.toDecimal().divide(unitPrice.toDecimal(), 0, RoundingMode.FLOOR).toLong().coerceAtLeast(0)

    companion object {
        const val NAME_MAX = 30

        /** 목표 하나에 단위 3개까지 — 한 줄 환산이 늘어나면 화면이 표가 된다 */
        const val PER_GOAL_MAX = 3

        fun create(goal: Goal, name: String, unitPrice: Money, now: java.time.Instant): ItemUnit {
            val trimmed = name.trim()
            if (trimmed.isEmpty() || trimmed.length > NAME_MAX) throw InvalidGoal("UNIT_NAME_INVALID", "name must be 1..$NAME_MAX characters")
            if (unitPrice.isNegative() || unitPrice.isZero()) throw InvalidGoal("UNIT_PRICE_INVALID", "unitPrice must be positive")
            return ItemUnit(UUID.randomUUID(), goal.id, goal.userId, trimmed, unitPrice, now)
        }
    }
}
