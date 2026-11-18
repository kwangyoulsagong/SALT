package com.salt.savings.domain

import com.salt.kernel.Money
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.YearMonth

/** 적중 이력 · 오늘 돈 경계(`SRV-REQ-045` FR-6 · 10) */
class ForecastReadsSpec : StringSpec({
    fun cov(window: Int, intervals: Int, hits: Int = intervals) = Coverage(window, intervals, hits, 2, BigDecimal("0.8"))

    "적중 이력 — 6개월 판정이 10 이상일 때만 숫자, 아니면 history_short · 못 읽으면 unavailable" {
        Track.of(null) shouldBe Track(null, TrackReason.UNAVAILABLE)
        Track.of(emptyList()) shouldBe Track(null, TrackReason.HISTORY_SHORT)
        Track.of(listOf(cov(3, 40), cov(6, 9))) shouldBe Track(null, TrackReason.HISTORY_SHORT)
        Track.of(listOf(cov(3, 4), cov(6, 10, 8))) shouldBe Track(cov(6, 10, 8), null)
    }

    // 물가: 2024-10 → 114.9(11-05 발표) · 2026-10 → 120.73(2026-11-03 발표) · 2026-11 은 아직
    val idx = listOf(
        PriceIndexMonth(YearMonth.of(2024, 9), BigDecimal("114.65"), "2020=100", Instant.parse("2024-10-01T23:00:00Z")),
        PriceIndexMonth(YearMonth.of(2024, 10), BigDecimal("114.90"), "2020=100", Instant.parse("2024-11-04T23:00:00Z")),
        PriceIndexMonth(YearMonth.of(2026, 10), BigDecimal("120.73"), "2020=100", Instant.parse("2026-11-02T23:00:00Z")),
    )
    val target = Money.krw(30_000_000)
    val now = Instant.parse("2026-11-18T03:00:00Z")

    "오늘 돈 — 만든 때 이미 발표된 달이 기준(as-of) · 정한 금액의 지금 값어치와 같은 값어치 금액" {
        // 2024-11-01 에 만듦 — 10월분(11-05 발표)은 아직 몰랐다 → 기준은 9월분
        val m = TodayMoney.of(target, Instant.parse("2024-11-01T00:00:00Z"), now, idx)
        m.reason shouldBe null
        m.baseMonth shouldBe YearMonth.of(2024, 9)
        m.latestMonth shouldBe YearMonth.of(2026, 10)
        m.worthToday!!.toKrwInteger(RoundingMode.FLOOR) shouldBe 28_489_190L // 3,000만 × 114.65 / 120.73
        m.sameValue!!.toKrwInteger(RoundingMode.FLOOR) shouldBe 31_590_928L
        m.change!!.multiply(BigDecimal(100)).setScale(1, RoundingMode.HALF_UP) shouldBe BigDecimal("5.3")
    }

    "오늘 돈 — 6개월 안 · 같은 달 · 못 읽음 · 기준 섞임이면 이유만" {
        TodayMoney.of(target, Instant.parse("2026-06-01T00:00:00Z"), now, idx).reason shouldBe TodayMoneyReason.TOO_RECENT
        TodayMoney.of(target, Instant.parse("2026-05-01T00:00:00Z"), Instant.parse("2026-11-02T00:00:00Z"), idx).reason shouldBe TodayMoneyReason.NO_NEW_INDEX
        TodayMoney.of(target, Instant.parse("2024-11-01T00:00:00Z"), now, null).reason shouldBe TodayMoneyReason.UNAVAILABLE
        val mixed = idx.dropLast(1) + idx.last().copy(base = "2025=100")
        TodayMoney.of(target, Instant.parse("2024-11-01T00:00:00Z"), now, mixed).reason shouldBe TodayMoneyReason.UNAVAILABLE
        TodayMoney.of(target, Instant.parse("2024-11-01T00:00:00Z"), now, emptyList()).reason shouldBe TodayMoneyReason.UNAVAILABLE
    }

    "오늘 돈 — 6개월 경계: 만든 달 + 6 이 이번 달이면 보인다" {
        TodayMoney.of(target, Instant.parse("2026-05-15T00:00:00Z"), now, idx).reason shouldBe null
    }
})
