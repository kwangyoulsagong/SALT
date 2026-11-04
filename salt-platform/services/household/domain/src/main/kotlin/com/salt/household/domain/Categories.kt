package com.salt.household.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import java.time.Instant

/**
 * 사용자 분류(`SRV-REQ-046` FR-2 · `DB-REQ-038` FR-2, 가계부 S1f). 이름과 묶음(needs · wants)을 사용자가 정한다.
 * 지우기는 **보관**이다 — 고르는 칸에서만 빠지고, 그 키로 적은 지난 지출 · 봉투는 이름 그대로 보인다(슬라이스 판단 2).
 */
data class CustomCategory(
    val category: Category,
    val userId: String,
    val name: String,
    val bucket: Bucket,
    val archived: Boolean,
    val createdAt: Instant,
) {
    companion object {
        /** 칩 한 칸에 들어가는 길이 — 기본 분류 이름 중 가장 긴 것("경조사 · 선물")과 비슷하게 */
        const val NAME_MAX = 12

        /** 보관하지 않은 것 기준 — 칩 줄이 기본 12 + 20 을 넘지 않게 */
        const val ACTIVE_MAX = 20

        fun create(userId: String, rawName: String, bucket: Bucket, now: Instant): CustomCategory =
            CustomCategory(Category.newCustom(), userId, cleanName(rawName), bucket, false, now)

        /** 앞뒤 공백 · 안쪽 연속 공백을 하나로. 제어 문자는 거절 — 이름은 화면에 그대로 나간다 */
        fun cleanName(raw: String): String {
            val name = raw.trim().replace(Regex("\\s+"), " ")
            if (name.isEmpty()) throw InvalidCategory("CATEGORY_NAME_REQUIRED", "name is required")
            if (name.length > NAME_MAX) throw InvalidCategory("CATEGORY_NAME_TOO_LONG", "name must be at most $NAME_MAX chars")
            if (name.any { it.isISOControl() }) throw InvalidCategory("CATEGORY_NAME_INVALID", "name has control characters")
            return name
        }
    }
}

/**
 * 한 사용자의 분류 표 — 기본 12 + 사용자 분류(보관 포함). 묶음 · 고를 수 있는지 · 순서를 여기 한 곳에서 낸다
 * (지출 · 봉투 · 반복 템플릿 · 착지 · 화면이 같은 답을 쓰게).
 */
class CategoryBook(val custom: List<CustomCategory>) {
    private val byCategory: Map<Category, CustomCategory> = custom.associateBy { it.category }

    /** 기본 분류는 기본 묶음, 사용자 분류는 고른 묶음. 모르는 키(읽을 때 기타로 접힌 것 밖)는 wants — 기타와 같다 */
    fun bucketOf(category: Category): Bucket = Category.defaultBucket(category) ?: byCategory[category]?.bucket ?: Bucket.WANTS

    /** 새로 적거나 봉투를 만들 때 고를 수 있나 — 기본 분류 · 보관하지 않은 내 분류 */
    fun selectable(category: Category): Boolean = Category.defaultBucket(category) != null || byCategory[category]?.archived == false

    /** 요청 키 → 고를 수 있는 분류. 아니면 null(부르는 쪽이 자기 오류 코드로) */
    fun pick(key: String): Category? = Category.parse(key)?.takeIf(::selectable)

    fun nameOf(category: Category): String? = byCategory[category]?.name

    /** 화면 · 봉투 순서 — 기본 표 순서 다음 만든 순서(보관 포함 — 지난 봉투 · 지출이 제자리에) */
    val order: List<Category> get() = Category.entries + custom.map { it.category }

    val active: List<CustomCategory> get() = custom.filterNot { it.archived }

    companion object {
        val DEFAULTS_ONLY = CategoryBook(emptyList())
    }
}

interface CustomCategories {
    /** 보관 포함 · 만든 순서 */
    fun list(userId: String): List<CustomCategory>

    /**
     * 보관하지 않은 것이 [CustomCategory.ACTIVE_MAX] 개 아래이고 같은 이름(대소문자 무시)이 없을 때만 넣는다 — 한 문장
     * (`INSERT … SELECT … WHERE count < max ON CONFLICT DO NOTHING`). 넣었으면 true. 오류 코드로 가르지 않는다
     */
    fun addIfRoom(category: CustomCategory): Boolean

    /** 이름 · 묶음 바꾸기 — 보관하지 않은 다른 분류에 같은 이름이 없을 때만. 바꾼 행 수 */
    fun update(userId: String, category: Category, name: String, bucket: Bucket): Int

    /** 보관 — 이미 보관했거나 없으면 0 */
    fun archive(userId: String, category: Category, now: Instant): Int
}

class InvalidCategory(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)

class CategoryNotFound(key: String) : DomainError("CATEGORY_NOT_FOUND", ErrorKind.NOT_FOUND, "Category not found", mapOf("category" to key))

class CategoryConflict(code: String, message: String) : DomainError(code, ErrorKind.CONFLICT, message)
