package com.salt.household.infrastructure

import com.salt.household.domain.Bucket
import com.salt.household.domain.Category
import com.salt.household.domain.CustomCategories
import com.salt.household.domain.CustomCategory
import com.salt.household.infrastructure.jooq.Tables.CUSTOM_CATEGORY
import org.jooq.DSLContext
import org.jooq.impl.DSL
import java.time.Instant
import java.util.UUID

/** 사용자 분류(가계부 S1f) — 넣기 · 바꾸기는 조건을 문장 안에 둔다(먼저 읽고 쓰지 않는다 · 오류 코드로 가르지 않는다) */
class JooqCustomCategories(private val dsl: DSLContext) : CustomCategories {
    private val C = CUSTOM_CATEGORY

    override fun list(userId: String): List<CustomCategory> =
        dsl.selectFrom(C).where(C.USER_ID.eq(userId)).orderBy(C.CREATED_AT.asc(), C.ID.asc()).fetch().mapNotNull { r ->
            val category = Category.parse(r.category)?.takeIf { it.isCustom } ?: return@mapNotNull null
            CustomCategory(category, r.userId, r.name, Bucket.fromKey(r.bucket) ?: Bucket.WANTS, r.archivedAt != null, r.createdAt.toInstant())
        }

    /**
     * `INSERT … SELECT … WHERE (보관 안 한 수) < 상한 ON CONFLICT DO NOTHING` 한 문장 — 같은 이름은 부분 유일 인덱스가 막는다.
     * 상한은 느슨하다(동시에 두 번 누르면 21개가 될 수 있다) — 칩 줄 길이를 지키는 값이지 불변식이 아니다
     */
    override fun addIfRoom(category: CustomCategory): Boolean {
        val active = dsl.selectCount().from(C).where(C.USER_ID.eq(category.userId).and(C.ARCHIVED_AT.isNull))
        return dsl.insertInto(C, C.ID, C.USER_ID, C.CATEGORY, C.NAME, C.BUCKET, C.CREATED_AT)
            .select(
                dsl.select(
                    DSL.`val`(UUID.randomUUID()),
                    DSL.`val`(category.userId),
                    DSL.`val`(category.category.key),
                    DSL.`val`(category.name),
                    DSL.`val`(category.bucket.key),
                    DSL.`val`(category.createdAt.utc()),
                ).where(DSL.field(active).lt(CustomCategory.ACTIVE_MAX)),
            )
            .onConflictDoNothing()
            .execute() == 1
    }

    override fun update(userId: String, category: Category, name: String, bucket: Bucket): Int {
        val other = C.`as`("other")
        val sameName = dsl.selectOne().from(other).where(
            other.USER_ID.eq(userId)
                .and(other.ARCHIVED_AT.isNull)
                .and(DSL.lower(other.NAME).eq(DSL.lower(DSL.`val`(name))))
                .and(other.CATEGORY.ne(category.key)),
        )
        return dsl.update(C)
            .set(C.NAME, name)
            .set(C.BUCKET, bucket.key)
            .where(C.USER_ID.eq(userId).and(C.CATEGORY.eq(category.key)).and(C.ARCHIVED_AT.isNull).andNotExists(sameName))
            .execute()
    }

    override fun archive(userId: String, category: Category, now: Instant): Int =
        dsl.update(C)
            .set(C.ARCHIVED_AT, now.utc())
            .where(C.USER_ID.eq(userId).and(C.CATEGORY.eq(category.key)).and(C.ARCHIVED_AT.isNull))
            .execute()
}
