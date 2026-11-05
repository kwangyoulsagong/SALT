package com.salt.household.application

import com.salt.household.domain.Bucket
import com.salt.household.domain.Category
import com.salt.household.domain.CategoryBook
import com.salt.household.domain.CategoryConflict
import com.salt.household.domain.CategoryNotFound
import com.salt.household.domain.CustomCategories
import com.salt.household.domain.CustomCategory
import com.salt.household.domain.InvalidCategory
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

/** 사용자 분류 입력 — 형식 검증을 지난 값(api 층). 이름 규칙은 [CustomCategory.cleanName] */
data class CategoryInput(val name: String, val bucket: String)

private fun bucket(key: String): Bucket = Bucket.fromKey(key) ?: throw InvalidCategory("CATEGORY_BUCKET_INVALID", "bucket must be needs or wants")

/** 내 분류만 고른다 — 기본 분류 키 · 모르는 꼴은 없는 것과 같다(404) */
private fun customKey(raw: String): Category = Category.parse(raw)?.takeIf { it.isCustom } ?: throw CategoryNotFound(raw)

/** 분류 표 — 기본 12 + 내 분류(보관 포함 — 화면이 지난 지출 이름을 그린다). 한 문장 */
open class ListCategories(private val categories: CustomCategories) {
    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String): CategoryBook = CategoryBook(categories.list(userId))
}

/**
 * 만들기 — 넣는 문장이 상한 · 같은 이름을 같이 본다. 못 넣었으면 그 뒤에 한 번 읽어 까닭을 가른다(쓰기 전에 읽지 않는다 —
 * 읽고 쓰는 사이 경합이 없다). 둘 다 409: 상한 · 같은 이름
 */
open class AddCategory(private val categories: CustomCategories, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, input: CategoryInput): CustomCategory {
        val created = CustomCategory.create(userId, input.name, bucket(input.bucket), clock.instant())
        if (categories.addIfRoom(created)) return created
        val active = CategoryBook(categories.list(userId)).active
        if (active.size >= CustomCategory.ACTIVE_MAX) throw CategoryConflict("CATEGORY_TOO_MANY", "too many categories")
        throw CategoryConflict("CATEGORY_NAME_TAKEN", "a category with this name exists")
    }
}

/** 이름 · 묶음 바꾸기 — 지난 지출도 새 이름 · 새 묶음으로 보인다(키가 같다). 못 바꿨으면 까닭: 없음(보관 포함) 404 · 같은 이름 409 */
open class EditCategory(private val categories: CustomCategories) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawKey: String, input: CategoryInput): CustomCategory {
        val category = customKey(rawKey)
        val name = CustomCategory.cleanName(input.name)
        val picked = bucket(input.bucket)
        if (categories.update(userId, category, name, picked) == 1) {
            return CategoryBook(categories.list(userId)).active.first { it.category == category }
        }
        val exists = CategoryBook(categories.list(userId)).active.any { it.category == category }
        if (!exists) throw CategoryNotFound(rawKey)
        throw CategoryConflict("CATEGORY_NAME_TAKEN", "a category with this name exists")
    }
}

/** 보관 — 고르는 칸에서만 빠진다. 지난 지출 · 봉투 · 템플릿은 그대로(슬라이스 판단 2). 없거나 이미 보관했으면 404 */
open class ArchiveCategory(private val categories: CustomCategories, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawKey: String) {
        if (categories.archive(userId, customKey(rawKey), clock.instant()) == 0) throw CategoryNotFound(rawKey)
    }
}
