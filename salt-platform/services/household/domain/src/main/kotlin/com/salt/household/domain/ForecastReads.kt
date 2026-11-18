package com.salt.household.domain

import java.math.BigDecimal

/**
 * 예측(forecast)이 채점한 착지 구간 커버리지(`SRV-REQ-046` FR-8 · 예측 `FC-REQ-024` FR-4) — 지난달 하나(`LandingTrack`)를 넘어 쌓인 비율.
 * 예측이 주인인 뷰 `forecast.v_personal_coverage` 를 요청 때 읽는다. 못 읽으면 null — 그 칸만 이유(월 화면 전체를 잃지 않는다)
 */
interface CoverageReads {
    fun landingCoverage(): List<LandingCoverage>?
}

/** 기간 하나의 채점 집계 — 사람별 행 0 */
data class LandingCoverage(val windowMonths: Int, val intervals: Int, val hits: Int, val people: Int, val nominal: BigDecimal)

/** 쌓인 적중 비율이 없는 이유 — 문장은 프론트 */
object CoverageReason {
    const val HISTORY_SHORT = "history_short"
    const val UNAVAILABLE = "unavailable"
    const val NOT_CURRENT_MONTH = "not_current_month"
}

/** 6개월 창 판정이 [MIN_INTERVALS] 이상일 때만 숫자(판정 수 · 맞은 수 · 사람 수와 한 덩어리). 둘 중 하나는 늘 있다 */
data class CoverageTrack(val coverage: LandingCoverage?, val reason: String?) {
    companion object {
        const val WINDOW_MONTHS = 6
        const val MIN_INTERVALS = 10

        fun of(rows: List<LandingCoverage>?): CoverageTrack {
            if (rows == null) return CoverageTrack(null, CoverageReason.UNAVAILABLE)
            val row = rows.firstOrNull { it.windowMonths == WINDOW_MONTHS }
            return if (row == null || row.intervals < MIN_INTERVALS) CoverageTrack(null, CoverageReason.HISTORY_SHORT) else CoverageTrack(row, null)
        }
    }
}
