package com.salt.household.domain

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.math.BigDecimal

/** 쌓인 착지 적중(`SRV-REQ-046` FR-8) — 6개월 판정 10 이상일 때만 숫자, 아니면 이유. 못 읽으면 unavailable */
class CoverageTrackSpec : StringSpec({
    fun cov(window: Int, intervals: Int) = LandingCoverage(window, intervals, intervals - 1, 2, BigDecimal("0.8"))

    "못 읽음 · 비어 있음 · 6개월 9건 · 3개월만 많음은 이유, 6개월 10건이면 숫자" {
        CoverageTrack.of(null) shouldBe CoverageTrack(null, CoverageReason.UNAVAILABLE)
        CoverageTrack.of(emptyList()) shouldBe CoverageTrack(null, CoverageReason.HISTORY_SHORT)
        CoverageTrack.of(listOf(cov(6, 9))) shouldBe CoverageTrack(null, CoverageReason.HISTORY_SHORT)
        CoverageTrack.of(listOf(cov(3, 50))) shouldBe CoverageTrack(null, CoverageReason.HISTORY_SHORT)
        CoverageTrack.of(listOf(cov(3, 50), cov(6, 10))) shouldBe CoverageTrack(cov(6, 10), null)
    }
})
