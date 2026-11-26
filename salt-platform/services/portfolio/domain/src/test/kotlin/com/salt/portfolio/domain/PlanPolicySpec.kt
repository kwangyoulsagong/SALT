package com.salt.portfolio.domain

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth

/**
 * 밴드 적립 정책 — 옛 Express `plan/domain/__tests__/plan.test.ts` 의 사례를 **같은 입력 · 같은 기대값**으로 옮겼다(S4a `SRV-REQ-049` FR-1,
 * "골든 = 옛 시험 기대값"). 기대값을 바꾸지 않는다 — 바뀌면 옮기며 동작이 달라진 것이다.
 */
class PlanPolicySpec : StringSpec({
    val allocation = listOf(Allocation(PlanAsset.BTC, 50.0), Allocation(PlanAsset.KOSPI, 50.0))
    val config = PlanConfig(allocation, 10_000, 100_000_000, 10.0, 3.0, -2.0, 8)
    val d = { s: String -> LocalDate.parse(s) }

    fun band(
        planWeek: String = "2026-11-16",
        indicatorValue: Double? = 0.33,
        bandKey: String? = "low",
        gatePassed: Boolean = true,
        blockedReason: String? = null,
        multiplier: Double = 2.0,
        closedWeeks: Int = 748,
        ciLow: Double? = 0.01,
        failureCount: Int = 18,
        failureCases: List<FailureCase> = listOf(FailureCase("2021-11-15T00:00:00+00:00", "missed_drop", "neutral", 1.0, -0.75)),
        kimchiPremium: Double? = 0.0294,
        kimchiAsOf: Instant? = Instant.parse("2026-11-16T00:00:00Z"),
    ) = BandWeekRow(
        asset = PlanAsset.BTC, planWeek = d(planWeek), preregKey = "band-accumulation@2", indicator = "mvrv_z", indicatorValue = indicatorValue,
        percentile = null, estimated = false, basisObserved = Instant.parse("2026-11-14T00:00:00Z"), secondaryValue = null, bandKey = bandKey,
        bandMultiplier = 2.0, gatePassed = gatePassed, blockedReason = blockedReason, multiplier = multiplier, closedWeeks = closedWeeks,
        excess = 0.115, ciLow = ciLow, ciHigh = 0.4, yearsTotal = 14, yearsPositive = 9, windowFrom = null, windowTo = null,
        failureCases = failureCases, failureCount = failureCount, kimchiPremium = kimchiPremium, kimchiAsOf = kimchiAsOf,
        computedAt = Instant.parse("2026-11-16T00:20:00Z"), bands = emptyList(),
    )

    val settings = PlanSettingsRecord(1_300_000, null, d("2026-11-02"), d("2026-11-02"))

    // ── 주 경계 — KST 월요일(FR-30 · 31)
    listOf(
        "2026-11-22T14:59:59.999Z" to "2026-11-16", // 일요일 23:59:59 KST → 그 주
        "2026-11-22T15:00:00.000Z" to "2026-11-23", // 월요일 00:00 KST → 다음 주
        "2026-11-16T00:00:00.000Z" to "2026-11-16",
        "2026-11-15T15:00:00.000Z" to "2026-11-16",
        "2026-01-01T00:00:00.000Z" to "2025-12-29", // 해를 넘는 주
    ).forEach { (instant, monday) ->
        "주 경계 $instant → $monday" { PlanWeeks.weekOfKst(Instant.parse(instant)) shouldBe d(monday) }
    }

    "달 귀속 = 월요일의 달" {
        PlanWeeks.mondaysInMonth(YearMonth.of(2026, 11)).map { it.toString() } shouldBe listOf("2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30")
        PlanWeeks.mondaysInMonth(YearMonth.of(2026, 12)).map { it.toString() } shouldBe listOf("2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28")
    }

    // ── 금액 — 환산 · 반올림(FR-5 · FR-71 · 72)
    "월 1,300,000 · 50:50 → 주 150,000" { PlanMath.weeklyBaseKrw(1_300_000, 50.0) shouldBe 150_000 }

    "1,000원 반올림 — 0.5 는 올림" {
        PlanMath.weeklyBaseKrw(100_000, 50.0) shouldBe 12_000 // 11,538.46 → 12,000
        PlanMath.plannedKrw(12_500, 1.0) shouldBe 13_000
        PlanMath.plannedKrw(12_499, 1.0) shouldBe 12_000
        PlanMath.plannedKrw(150_000, 0.5) shouldBe 75_000
        PlanMath.plannedKrw(150_000, 0.25) shouldBe 38_000 // 37,500 → 38,000
        PlanMath.plannedKrw(150_000, 0.0) shouldBe 0
    }

    listOf(10_000L to true, 9_000L to false, 100_000_000L to true, 100_001_000L to false, 1_300_500L to false, Long.MAX_VALUE to false).forEach { (v, ok) ->
        "월 $v → ${if (ok) "통과" else "422"}" {
            if (ok) PlanMath.assertMonthlyBase(v, config) else shouldThrow<PlanBaseAmountInvalid> { PlanMath.assertMonthlyBase(v, config) }
        }
    }

    "422 상세 — field · min · max · unit(옛 순서)" {
        val e = shouldThrow<PlanBaseAmountInvalid> { PlanMath.assertMonthlyBase(9_000, config) }
        e.details.toList() shouldBe listOf("field" to "monthlyBaseKrw", "min" to 10_000L, "max" to 100_000_000L, "unit" to 1_000L)
    }

    "배분 합 100 · 중복 0 이 아니면 기동 실패" {
        PlanMath.assertAllocation(allocation)
        shouldThrow<IllegalArgumentException> { PlanMath.assertAllocation(listOf(Allocation(PlanAsset.BTC, 60.0), Allocation(PlanAsset.KOSPI, 50.0))) }
        shouldThrow<IllegalArgumentException> { PlanMath.assertAllocation(listOf(Allocation(PlanAsset.BTC, 50.0), Allocation(PlanAsset.BTC, 50.0))) }
    }

    "수정은 다음 주부터 — effectiveWeek 전은 previous" {
        val s = settings.copy(monthlyBaseKrw = 2_000_000, previousMonthlyBaseKrw = 1_300_000, effectiveWeek = d("2026-11-23"))
        PlanMath.monthlyForWeek(s, d("2026-11-16")) shouldBe 1_300_000
        PlanMath.monthlyForWeek(s, d("2026-11-23")) shouldBe 2_000_000
    }

    // ── 배수 — 예측을 믿는 경계(FR-20 · 22)
    listOf(
        Triple("행 없음 → 정액 · fallback", null, WeekPlans.Resolved(1.0, true)),
        Triple("관문 통과 2.0x", band(), WeekPlans.Resolved(2.0, false)),
        Triple("관문 실패 → 정액(정상 경로)", band(gatePassed = false, blockedReason = "not_better_than_flat", multiplier = 1.0), WeekPlans.Resolved(1.0, false)),
        Triple("관문 실패인데 배수 2(계약 위반) → 정액", band(gatePassed = false, blockedReason = "not_better_than_flat"), WeekPlans.Resolved(1.0, false)),
        Triple("범위 밖 3.5 → 정액 · fallback", band(multiplier = 3.5), WeekPlans.Resolved(1.0, true)),
        Triple("0x(극단 과열)는 그대로 0", band(multiplier = 0.0, bandKey = "extreme_high"), WeekPlans.Resolved(0.0, false)),
    ).forEach { (name, row, expected) -> "배수 $name" { WeekPlans.resolveMultiplier(row) shouldBe expected } }

    // ── 주 채움 — 빠진 지난 주는 skipped, 이번 주는 그 주 예측이 있을 때만
    "열지 않은 지난 주 · 이번 주(예측 있음)" {
        val existing = listOf(WeekPlans.snapshotWeek(settings, d("2026-11-02"), PlanAsset.BTC, null, ExecutionStatus.PLANNED, allocation))
        val bands = mapOf((d("2026-11-09") to PlanAsset.BTC) to band(planWeek = "2026-11-09"), (d("2026-11-16") to PlanAsset.BTC) to band())
        val rows = WeekPlans.missingWeeks(settings, d("2026-11-16"), existing, bands, allocation)
        rows.map { listOf(it.weekOf.toString(), it.asset.code, it.status.code, it.multiplier, it.plannedKrw, it.fallback) } shouldBe listOf(
            listOf("2026-11-02", "kospi", "skipped", 1.0, 150_000L, true),
            listOf("2026-11-09", "btc", "skipped", 2.0, 300_000L, false),
            listOf("2026-11-09", "kospi", "skipped", 1.0, 150_000L, true),
            listOf("2026-11-16", "btc", "planned", 2.0, 300_000L, false),
            // 코스피 이번 주 예측 행 없음 → 만들지 않는다
        )
    }

    // ── 실행 — 수동 체크 · 금액 경계(FR-41)
    val row = WeekPlans.snapshotWeek(settings, d("2026-11-16"), PlanAsset.BTC, band(), ExecutionStatus.PLANNED, allocation)
    "생략하면 계획액" { Executions.executedAmount(row, null, 10.0) shouldBe 300_000 }
    "0 · 상한 1,500,000 은 통과" {
        Executions.executedAmount(row, 0, 10.0) shouldBe 0
        Executions.executedAmount(row, 1_500_000, 10.0) shouldBe 1_500_000
    }
    listOf(-1L, 1_500_001L).forEach { bad -> "$bad → 422" { shouldThrow<PlanExecutionInvalid> { Executions.executedAmount(row, bad, 10.0) } } }
    "422 상세 — asset · min 0 · max 정수" {
        shouldThrow<PlanExecutionInvalid> { Executions.executedAmount(row, -1, 10.0) }.details.toList() shouldBe
            listOf("asset" to "btc", "min" to 0, "max" to 1_500_000L)
    }

    // ── 연속 · 미실행 — 주 단위 · 평가 0(FR-43~45)
    fun r(weekOf: String, status: ExecutionStatus, executed: Long? = null) =
        row.copy(weekOf = d(weekOf), status = status, executedKrw = executed, recordedAt = executed?.let { Instant.EPOCH })

    "이번 주 안 했으면 지난 주부터 센다" {
        val rows = listOf(r("2026-10-26", ExecutionStatus.EXECUTED, 100), r("2026-11-02", ExecutionStatus.SKIPPED), r("2026-11-09", ExecutionStatus.EXECUTED, 200), r("2026-11-16", ExecutionStatus.PLANNED))
        Executions.streakOf(rows, d("2026-11-16")) shouldBe Executions.Streak(1, 300, 1, 3)
    }
    "이번 주 했으면 이번 주부터 · 자산 하나만 해도 실행한 주" {
        val rows = listOf(r("2026-11-09", ExecutionStatus.EXECUTED, 100), r("2026-11-16", ExecutionStatus.EXECUTED, 50), r("2026-11-16", ExecutionStatus.PLANNED).copy(asset = PlanAsset.KOSPI))
        Executions.streakOf(rows, d("2026-11-16")).weeks shouldBe 2
    }

    // ── 이번 달 합계(FR-80~82)
    "executed 만 더하고 진행률 · 남은 일수 서버 계산" {
        val rows = listOf(
            r("2026-10-26", ExecutionStatus.EXECUTED, 999).copy(plannedKrw = 999), // 10월 귀속
            r("2026-11-09", ExecutionStatus.EXECUTED, 250_000).copy(plannedKrw = 300_000),
            r("2026-11-16", ExecutionStatus.PLANNED).copy(plannedKrw = 300_000),
        )
        MonthlySummaries.of(YearMonth.of(2026, 11), d("2026-11-19"), d("2026-11-09"), rows) shouldBe
            MonthlySummaries.Summary(YearMonth.of(2026, 11), 250_000, 600_000, 41.7, 1, 4, 12)
    }
    "계획 0 이면 진행률 null · 지난 달 남은 일수 0" {
        val s = MonthlySummaries.of(YearMonth.of(2026, 10), d("2026-11-19"), null, emptyList())
        s.progressPct shouldBe null
        s.daysLeft shouldBe 0
        s.totalWeeks shouldBe 0
    }

    // ── 3종 게이트 · 김프(FR-10~12 · FR-50~54)
    listOf(
        "다 있음" to (band() to null),
        "행 없음" to (null to "band_missing"),
        "지표 없음(stale)" to (band(indicatorValue = null, bandKey = null) to "indicator_missing"),
        "검산 표본 0" to (band(closedWeeks = 0) to "track_record_missing"),
        "구간 없음" to (band(ciLow = null) to "track_record_missing"),
        "실패 사례 0" to (band(failureCount = 0, failureCases = emptyList()) to "failure_cases_missing"),
    ).forEach { (name, c) -> "게이트 $name" { BandCard.gate(c.first) shouldBe BandCard.Gate(c.second == null, c.second) } }

    val now = Instant.parse("2026-11-19T03:00:00Z")
    "김프 +2.94% · 300,000 중 8,568원(= 금액 × p ÷ (1 + p))" {
        val k = BandCard.kimchi(band(), 300_000, now, config)!!
        Triple(k.premiumPct, k.costKrwOnPlan, k.level) shouldBe Triple(2.94, 8_568L, "normal")
    }
    listOf(0.03 to "high", 0.0299 to "normal", -0.02 to "low", -0.0199 to "normal").forEach { (p, level) ->
        "김프 $p → $level" { BandCard.kimchi(band(kimchiPremium = p), 0, now, config)?.level shouldBe level }
    }
    "오래된 김프 · 값 없음 → null(금액은 그대로)" {
        BandCard.kimchi(band(kimchiAsOf = Instant.parse("2026-11-09T00:00:00Z")), 1, now, config) shouldBe null
        BandCard.kimchi(band(kimchiPremium = null), 1, now, config) shouldBe null
    }

    // ── 읽기 전용 키(FR-73)
    listOf("bandConfig", "thresholds", "multipliers", "allocation").forEach { k ->
        "$k → 422" { shouldThrow<PlanBandReadOnly> { ReadOnlyKeys.assertNone(setOf("monthlyBaseKrw", k)) } }
    }
    "월 적립액만이면 통과" { ReadOnlyKeys.assertNone(setOf("monthlyBaseKrw")) }
})
