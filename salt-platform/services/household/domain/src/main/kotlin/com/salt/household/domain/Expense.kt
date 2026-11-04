package com.salt.household.domain

import com.salt.kernel.Money
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/**
 * 가계부 지출(`SRV-REQ-046` · `DB-REQ-038` FR-1). 입력은 전부 수동이다(연동 0). 예산은 막지 않는다 —
 * 이 패키지에는 "초과" · "경고" 상태가 없다. 넘친 봉투는 음수 숫자일 뿐이다(FEATURE-013 정책).
 */
@JvmInline
value class ExpenseId(val value: UUID) {
    override fun toString(): String = value.toString()

    companion object {
        fun parse(raw: String): ExpenseId? = runCatching { ExpenseId(UUID.fromString(raw)) }.getOrNull()

        fun new(): ExpenseId = ExpenseId(UUID.randomUUID())
    }
}

/** 50/30/20 묶음. 지출 분류는 needs · wants 둘에만 든다 — savings 는 저축 서비스의 일이다 */
enum class Bucket(val key: String) {
    NEEDS("needs"),
    WANTS("wants"),
    ;

    companion object {
        fun fromKey(key: String): Bucket? = entries.firstOrNull { it.key == key }
    }
}

/**
 * 기본 분류 12개(슬라이스 판단 6 — 사용자 분류 표는 S1b). [key] 가 저장 · 응답 값, 이름(문구)은 프론트가 키로 고른다.
 * 묶음은 흔한 50/30/20 배정을 따른다 — 사용자가 바꾸는 자리는 사용자 분류와 같이 연다.
 */
enum class Category(val key: String, val bucket: Bucket) {
    FOOD("food", Bucket.NEEDS),
    CAFE("cafe", Bucket.WANTS),
    TRANSPORT("transport", Bucket.NEEDS),
    HOUSING("housing", Bucket.NEEDS),
    TELECOM("telecom", Bucket.NEEDS),
    LIVING("living", Bucket.NEEDS),
    HEALTH("health", Bucket.NEEDS),
    EDUCATION("education", Bucket.NEEDS),
    SHOPPING("shopping", Bucket.WANTS),
    CULTURE("culture", Bucket.WANTS),
    GIFT("gift", Bucket.WANTS),
    OTHER("other", Bucket.WANTS),
    ;

    companion object {
        fun fromKey(key: String): Category? = entries.firstOrNull { it.key == key }
    }
}

enum class PaymentMethod(val key: String) {
    CARD("card"),
    CASH("cash"),
    TRANSFER("transfer"),
    OTHER("other"),
    ;

    companion object {
        fun fromKey(key: String): PaymentMethod? = entries.firstOrNull { it.key == key }
    }
}

/** 정확 · 대략(FR-6). 대략은 "밀린 날 대략 합계" — 월 통계에서 따로 센다 */
enum class Precision(val key: String) {
    EXACT("exact"),
    APPROX("approx"),
    ;

    companion object {
        fun fromKey(key: String): Precision? = entries.firstOrNull { it.key == key }
    }
}

/** 어떻게 적었나 — 관측성(입력 방식별 사용, FEATURE-013 비기능). `TEMPLATE` 은 S1b 반복 템플릿 */
enum class InputKind(val key: String) {
    QUICK("quick"),
    LINE("line"),
    PASTE("paste"),
    TEMPLATE("template"),
    APPROX("approx"),
    ;

    companion object {
        fun fromKey(key: String): InputKind? = entries.firstOrNull { it.key == key }
    }
}

data class Expense(
    val id: ExpenseId,
    val userId: String,
    val amount: Money,
    val spentOn: LocalDate,
    val category: Category,
    val paymentMethod: PaymentMethod,
    val merchant: String?,
    val precision: Precision,
    val inputKind: InputKind,
    /** 할부 개월(2~36). 일시불이면 null — 슬라이스 판단 4 */
    val installmentMonths: Int?,
    val memo: String?,
    val createdAt: Instant,
) {
    companion object {
        fun isWholeWon(amount: Money): Boolean = amount.toDecimal().stripTrailingZeros().scale() <= 0

        /** 한 건 상한 — 오타(0 하나 더)로 달 통계가 무너지지 않게. 10억 원 */
        val MAX_AMOUNT: Money = Money.krw(1_000_000_000L)
        const val MERCHANT_MAX = 40
        const val MEMO_MAX = 200

        /** 사용자가 고른 날짜가 미래로 이만큼 넘으면 거절 — 예정 지출은 S1b 반복 템플릿 몫 */
        const val FUTURE_DAYS_MAX = 0L

        /** 과거로는 이만큼까지 — 밀린 날 메우기(FR-5)에 충분하고 오타 연도(2015)는 막는다 */
        const val PAST_DAYS_MAX = 400L

        /**
         * 도메인 규칙 한 곳 — 단건 · 붙여넣기 · 대략 합계가 같은 검사를 지난다(규칙이 입력 경로마다 갈라지지 않게).
         * 정밀도와 입력 방식의 짝(대략은 대략 입력에서만)은 DB CHECK 와 같은 뜻이다.
         */
        fun create(
            userId: String,
            amount: Money,
            spentOn: LocalDate,
            category: Category,
            paymentMethod: PaymentMethod,
            merchant: String?,
            precision: Precision,
            inputKind: InputKind,
            installmentMonths: Int?,
            memo: String?,
            today: LocalDate,
            now: Instant,
        ): Expense {
            if (amount.isNegative() || amount.isZero()) throw InvalidExpense("EXPENSE_AMOUNT_INVALID", "amount must be positive")
            if (amount > MAX_AMOUNT) throw InvalidExpense("EXPENSE_AMOUNT_TOO_LARGE", "amount is too large")
            // 원 단위만 — 소수 원은 저장하면 응답 반올림과 합이 어긋난다(2026-11-04 리뷰: 0.4원이 0원으로 보이고 목표 시계가 400)
            if (!isWholeWon(amount)) throw InvalidExpense("EXPENSE_AMOUNT_INVALID", "amount must be whole won")
            if (spentOn.isAfter(today.plusDays(FUTURE_DAYS_MAX))) throw InvalidExpense("EXPENSE_DATE_FUTURE", "spentOn is in the future")
            if (spentOn.isBefore(today.minusDays(PAST_DAYS_MAX))) throw InvalidExpense("EXPENSE_DATE_TOO_OLD", "spentOn is too old")
            if (installmentMonths != null && installmentMonths !in 2..36) {
                throw InvalidExpense("EXPENSE_INSTALLMENT_INVALID", "installmentMonths must be 2..36")
            }
            if ((precision == Precision.APPROX) != (inputKind == InputKind.APPROX)) {
                throw InvalidExpense("EXPENSE_PRECISION_INVALID", "approx precision goes with approx input")
            }
            return Expense(
                id = ExpenseId.new(),
                userId = userId,
                amount = amount,
                spentOn = spentOn,
                category = category,
                paymentMethod = paymentMethod,
                merchant = merchant?.trim()?.take(MERCHANT_MAX)?.ifBlank { null },
                precision = precision,
                inputKind = inputKind,
                installmentMonths = installmentMonths,
                memo = memo?.trim()?.take(MEMO_MAX)?.ifBlank { null },
                createdAt = now,
            )
        }
    }
}
