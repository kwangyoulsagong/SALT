package com.salt.identity.infrastructure

import com.salt.identity.domain.UsageMark
import com.salt.identity.domain.UsageStore
import org.jooq.DSLContext
import java.time.LocalDate

/**
 * `usage_day` — 하루 · 도메인 · 종류당 한 행, 한 문장 upsert 로 횟수만 더한다(경합에도 행 하나).
 * 사람 칸은 [USER_HASH] 식 하나 — 지우기 · 내보내기(`IdentityUserRows`)가 같은 식을 쓴다.
 */
class JooqUsage(private val dsl: DSLContext) : UsageStore {
    override fun count(userId: String, day: LocalDate, mark: UsageMark) {
        dsl.execute(
            "INSERT INTO usage_day (user_hash, on_day, shell_domain, kind, times) VALUES ($USER_HASH, ?, ?, ?, 1) " +
                "ON CONFLICT (user_hash, on_day, shell_domain, kind) DO UPDATE SET times = usage_day.times + 1",
            userId, day, mark.domain.key, mark.kind.key,
        )
    }

    companion object {
        /** 사용자 id(`?` 하나) → 해시. 비밀 값 없음 — 같은 DB 에 사용자 표가 있어 막는 것이 없다(V5 머리) */
        const val USER_HASH = "encode(sha256(convert_to(?, 'UTF8')), 'hex')"
    }
}
