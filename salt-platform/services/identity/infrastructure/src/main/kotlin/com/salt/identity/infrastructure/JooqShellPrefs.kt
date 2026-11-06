package com.salt.identity.infrastructure

import com.salt.identity.domain.HomeLayout
import com.salt.identity.domain.ShellDomain
import com.salt.identity.domain.ShellPrefs
import com.salt.identity.domain.ShellPrefsStore
import com.salt.identity.infrastructure.jooq.Tables.USER_DOMAIN_PREF
import org.jooq.DSLContext
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset

/**
 * `user_domain_pref` — 사용자 하나에 한 행. 저장은 한 문장 upsert(경합에도 행 하나 — 오류 코드로 가르지 않는다).
 * 목록 열은 쉼표로 이은 키. 모르는 키(옛 값 · 손으로 고친 행)는 읽을 때 버린다 — 도메인 불변식을 깨는 값이 들어오지 않게.
 */
class JooqShellPrefs(private val dsl: DSLContext) : ShellPrefsStore {
    override fun of(userId: String): ShellPrefs {
        val row = dsl.selectFrom(USER_DOMAIN_PREF).where(USER_DOMAIN_PREF.USER_ID.eq(userId)).fetchOne() ?: return ShellPrefs.EMPTY
        val order = row.cardOrder?.let(::keys)
        val layout = if (order != null && order.size == ShellDomain.entries.size) HomeLayout(order, keys(row.hiddenCards).toSet()) else null
        return ShellPrefs(
            chosen = row.chosenDomains?.let { keys(it).toSet() }?.takeIf { it.isNotEmpty() },
            chosenAt = row.chosenAt?.toInstant(),
            onboardedAt = row.onboardedAt?.toInstant(),
            savedLayout = layout,
        )
    }

    override fun save(userId: String, prefs: ShellPrefs, at: Instant) {
        val chosen = prefs.chosen?.let(::join)
        val order = prefs.savedLayout?.order?.let(::join)
        val hidden = prefs.savedLayout?.hidden?.let(::join)
        dsl.insertInto(USER_DOMAIN_PREF)
            .set(USER_DOMAIN_PREF.USER_ID, userId)
            .set(USER_DOMAIN_PREF.CHOSEN_DOMAINS, chosen)
            .set(USER_DOMAIN_PREF.CHOSEN_AT, prefs.chosenAt?.utc())
            .set(USER_DOMAIN_PREF.ONBOARDED_AT, prefs.onboardedAt?.utc())
            .set(USER_DOMAIN_PREF.CARD_ORDER, order)
            .set(USER_DOMAIN_PREF.HIDDEN_CARDS, hidden)
            .set(USER_DOMAIN_PREF.UPDATED_AT, at.utc())
            .onConflict(USER_DOMAIN_PREF.USER_ID)
            .doUpdate()
            .set(USER_DOMAIN_PREF.CHOSEN_DOMAINS, chosen)
            .set(USER_DOMAIN_PREF.CHOSEN_AT, prefs.chosenAt?.utc())
            .set(USER_DOMAIN_PREF.ONBOARDED_AT, prefs.onboardedAt?.utc())
            .set(USER_DOMAIN_PREF.CARD_ORDER, order)
            .set(USER_DOMAIN_PREF.HIDDEN_CARDS, hidden)
            .set(USER_DOMAIN_PREF.UPDATED_AT, at.utc())
            .execute()
    }

    /** 집합은 기본 순서로 이어 적는다 — 같은 집합이 늘 같은 글자(모양 검사 · 비교가 쉽게) */
    private fun join(domains: Collection<ShellDomain>): String =
        (if (domains is List) domains else ShellDomain.DEFAULT_ORDER.filter { it in domains }).joinToString(",") { it.key }

    private fun keys(raw: String?): List<ShellDomain> =
        raw.orEmpty().split(',').filter { it.isNotBlank() }.mapNotNull { ShellDomain.parse(it.trim()) }

    private fun Instant.utc(): OffsetDateTime = atOffset(ZoneOffset.UTC)
}
