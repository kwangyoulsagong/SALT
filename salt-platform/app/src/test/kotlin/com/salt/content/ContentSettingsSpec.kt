package com.salt.content

import com.salt.content.application.ContentSettings
import com.salt.content.application.GetTip
import com.salt.content.application.ListTips
import com.salt.content.application.TipForMe
import com.salt.content.application.TipLibrary
import com.salt.content.domain.Dismissals
import com.salt.content.domain.PublishCheck
import com.salt.content.domain.Tip
import com.salt.content.domain.TipNotFound
import com.salt.content.domain.TipStatus
import com.salt.content.domain.Tips
import com.salt.content.domain.TriggerKind
import com.salt.content.domain.TriggerRule
import com.salt.content.domain.TriggerRules
import com.salt.content.domain.UserSignal
import com.salt.content.domain.UserSignals
import com.salt.content.infrastructure.ClasspathCatalog
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import tools.jackson.databind.json.JsonMapper
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

/**
 * 공개 플래그(`SRV-REQ-047` 수용 기준 3) — **기본값이 꺼짐**이고, 꺼지면 목록 0 · 글 404 · 때맞춘 팁 0.
 * 통합 테스트는 컨텍스트 하나를 같이 쓰려고 켠 채로 돈다(`PlatformContainers`) — 꺼짐은 여기서 실제 원문 · 유스케이스로 본다.
 */
class ContentSettingsSpec : StringSpec({
    val clock = Clock.fixed(Instant.parse("2026-11-05T03:00:00Z"), ZoneOffset.UTC)
    val library = TipLibrary().apply {
        replace(ClasspathCatalog(JsonMapper.builder().build()).tipSources().map { (slug, raw) -> (PublishCheck.check(slug, raw) as PublishCheck.Outcome.Ok).tip })
    }
    val noRevisions = object : Tips {
        override fun all() = emptyList<Tips.Stored>()
        override fun save(tip: Tip, status: TipStatus, at: Instant) = Unit
        override fun retireMissing(present: Set<String>, at: Instant) = emptyList<String>()
        override fun setStatus(slug: String, status: TipStatus, at: Instant) = Unit
        override fun addRevision(revision: Tips.Revision) = Unit
        override fun revisions(slug: String) = emptyList<Tips.Revision>()
    }
    val rules = object : TriggerRules {
        override fun replaceAll(rules: List<TriggerRule>) = Unit
        override fun active() = library.all().values.flatMap { t -> t.triggers.map { TriggerRule(t.slug, it, t.contexts, 0) } }
    }
    val signals = object : UserSignals {
        override fun recordOnce(eventId: UUID, eventType: String, signal: UserSignal?) = true
        override fun recent(userId: String, since: Instant) = listOf(UserSignal(userId, TriggerKind.GOAL_CREATED_WEDDING, Instant.parse("2026-11-04T00:00:00Z")))
    }
    val dismissals = object : Dismissals {
        override fun dismiss(userId: String, slug: String, at: Instant) = Unit
        override fun dismissed(userId: String) = emptySet<String>()
    }

    "설정 기본값은 꺼짐 — 법무 확인 전" {
        ContentProperties().publicEnabled shouldBe false
    }

    "꺼짐 — 목록 public=false · 0건, 글 404, 때맞춘 팁 null" {
        val off = ContentSettings(false)
        ListTips(library, off, clock).execute().let { it.public shouldBe false; it.items.size shouldBe 0 }
        shouldThrow<TipNotFound> { GetTip(library, noRevisions, off, clock).execute("marriage-tax-credit") }
        TipForMe(library, rules, signals, dismissals, off, clock).execute("u", "savings") shouldBe null
    }

    "켜짐 — 같은 재료로 목록 · 글 · 때맞춘 팁이 나온다(꺼짐 테스트가 빈 재료라서 통과한 게 아님을 확인)" {
        val on = ContentSettings(true)
        ListTips(library, on, clock).execute().items.size shouldNotBe 0
        GetTip(library, noRevisions, on, clock).execute("marriage-tax-credit").tip.meta.validUntil shouldBe LocalDate.parse("2026-12-31")
        TipForMe(library, rules, signals, dismissals, on, clock).execute("u", "savings")?.tip?.slug shouldBe "marriage-tax-credit"
    }
})
