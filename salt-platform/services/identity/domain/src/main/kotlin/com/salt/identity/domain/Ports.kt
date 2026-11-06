package com.salt.identity.domain

/** 셸 설정 저장(`identity.user_domain_pref`). 행 없음 = [ShellPrefs.EMPTY]. 저장은 사용자 하나에 한 행 — 한 문장 upsert */
interface ShellPrefsStore {
    fun of(userId: String): ShellPrefs

    fun save(userId: String, prefs: ShellPrefs, at: java.time.Instant)
}
