package com.salt.notification.domain

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.Duration
import java.time.Instant

/**
 * 알림 S2c(`SRV-REQ-048` FR-5) 불변식 — 허용 · 거절 경계 표.
 * 1. 설정 행이 없으면 모든 도메인 꺼짐
 * 2. 인자에 금액(키 · 숫자 값) · 문장 코드가 못 들어간다
 * 3. 종류는 도메인마다 하나 · 도메인 축으로 고른다
 */
class NotificationSpec : StringSpec({
    val at = Instant.parse("2026-11-06T00:00:00Z")

    "설정 없음 = 모든 도메인 꺼짐 · 켠 것만 켜짐 · 순서는 서버 enum" {
        NotificationPrefs.NONE.all().map { it.second } shouldBe listOf(false, false, false)
        val prefs = NotificationPrefs(setOf(NotificationDomain.SAVINGS))
        prefs.all() shouldBe listOf(NotificationDomain.INVEST to false, NotificationDomain.SAVINGS to true, NotificationDomain.HOUSEHOLD to false)
    }

    "도메인 축 → 종류" {
        NotificationKind.of(emptySet()) shouldBe emptySet()
        NotificationKind.of(setOf(NotificationDomain.INVEST, NotificationDomain.HOUSEHOLD)) shouldBe
            setOf(NotificationKind.SIGNAL_UPDATE, NotificationKind.FIXED_COST_INCREASED)
        NotificationDomain.entries.forEach { d -> NotificationKind.entries.count { it.domain == d } shouldBe 1 }
    }

    "코드 형식 경계" {
        listOf("coach.decision_changed", "savings.goal_reached", "a.b.c").forEach { MessageGuard.assertMessageCode(it) }
        listOf("", "coach", "Coach.x", "코치가 바뀌었어요", "coach.", "coach decision.x").forEach {
            shouldThrow<NotificationMessageCodeInvalid> { MessageGuard.assertMessageCode(it) }
        }
    }

    "금액 관문 경계 — 코드는 지나고 숫자 · 금액 키는 막힌다" {
        MessageGuard.assertNoAmounts(mapOf("symbol" to "BTC", "template" to "housing", "category" to "housing", "mode" to "swing"))
        listOf(
            mapOf("price" to "BTC"),
            mapOf("targetAmount" to "x"),
            mapOf("symbol" to "1,000"),
            mapOf("symbol" to "3.5%"),
            mapOf("symbol" to " 42 "),
            mapOf("current" to "-0.5"),
        ).forEach { shouldThrow<NotificationAmountNotAllowed> { MessageGuard.assertNoAmounts(it) } }
    }

    "종목 코드 칸 — 국내 주식 숫자 코드는 지나고 금액 모양은 막힌다 · 다른 칸의 숫자는 그대로 막힌다" {
        listOf("BTC", "005930", "KRW-BTC", "BRK.B").forEach { MessageGuard.assertNoAmounts(mapOf("symbol" to it)) }
        listOf("1,000", "3.5%", " 005930", "", "A".repeat(21), "-0.5 ").forEach {
            shouldThrow<NotificationAmountNotAllowed> { MessageGuard.assertNoAmounts(mapOf("symbol" to it)) }
        }
        shouldThrow<NotificationAmountNotAllowed> { MessageGuard.assertNoAmounts(mapOf("template" to "005930")) }
        Deliveries.decisionChanged("u1", "005930", "long_term", "wait", "review_accumulation", at).symbol shouldBe "005930"
    }

    "이벤트 → 초안 — 코드만 · 만료는 종류의 ttl" {
        val d = Deliveries.decisionChanged("u1", "BTC", "swing", "hold", "buy_watch", at)
        d.kind shouldBe NotificationKind.SIGNAL_UPDATE
        d.params.keys shouldBe setOf("symbol", "mode", "previousAction", "nextAction")
        d.expiresAt shouldBe at.plus(Duration.ofHours(24))
        Deliveries.goalReached("u1", "housing", at).params shouldBe mapOf("template" to "housing")
        Deliveries.fixedCostIncreased("u1", "housing", at).expiresAt shouldBe at.plus(Duration.ofDays(30))
    }
})
