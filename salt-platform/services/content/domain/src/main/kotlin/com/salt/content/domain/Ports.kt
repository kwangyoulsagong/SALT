package com.salt.content.domain

import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/** 원문 묶음(레포 파일) — 글 원문과 제도 파라미터 표. 구현은 클래스패스 자원(`infrastructure`). */
interface ContentCatalog {
    /** slug → 원문 */
    fun tipSources(): Map<String, String>

    fun policyParams(): List<PolicyParam>
}

/** 글 메타 · 변경 이력(`tip` · `tip_revision`). 본문은 원문이 주인이라 [Tips.save] 는 메타 · 해시만 쓴다. */
interface Tips {
    data class Stored(val slug: String, val contentHash: String, val status: TipStatus, val validUntil: LocalDate)

    data class Revision(val slug: String, val at: Instant, val summary: String, val previousHash: String?)

    fun all(): List<Stored>

    /** 새 글이면 넣고, 있으면 메타 · 해시 · 상태를 바꾼다 */
    fun save(tip: Tip, status: TipStatus, at: Instant)

    /** 원문에서 사라진 글 — 지우지 않고 확인 필요로(이력이 남는다). @return 바뀐 slug */
    fun retireMissing(present: Set<String>, at: Instant): List<String>

    fun setStatus(slug: String, status: TipStatus, at: Instant)

    fun addRevision(revision: Revision)

    fun revisions(slug: String): List<Revision>
}

interface TriggerRules {
    /** 원문의 규칙 전부로 갈아 끼운다 — 원문에 없는 규칙은 꺼진다(`active = false`) */
    fun replaceAll(rules: List<TriggerRule>)

    fun active(): List<TriggerRule>
}

interface PolicyParams {
    fun all(): List<PolicyParam>

    fun insert(param: PolicyParam)

    fun update(param: PolicyParam)

    fun valueAt(key: String, on: LocalDate): PolicyParam?
}

interface UserSignals {
    /** 이벤트 하나에 한 번 — 같은 이벤트가 두 번 와도 행 하나(`processed_event`). [signal] 이 null 이면 처리 기록만. @return 처음이면 true */
    fun recordOnce(eventId: UUID, eventType: String, signal: UserSignal?): Boolean

    fun recent(userId: String, since: Instant): List<UserSignal>
}

interface Dismissals {
    /** 같은 글을 두 번 닫아도 행 하나 */
    fun dismiss(userId: String, slug: String, at: Instant)

    fun dismissed(userId: String): Set<String>
}

/** 발행 포트 — `content.PolicyParamChanged`. 유스케이스와 같은 트랜잭션(아웃박스). */
interface ContentEvents {
    fun policyParamChanged(param: PolicyParam, change: String)
}
