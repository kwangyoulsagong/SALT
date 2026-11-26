package com.salt.portfolio.application

import com.salt.portfolio.domain.BandCard
import com.salt.portfolio.domain.BandReader
import com.salt.portfolio.domain.BandWeekRow
import com.salt.portfolio.domain.ExecutionRecord
import com.salt.portfolio.domain.ExecutionStatus
import com.salt.portfolio.domain.ExecutionStore
import com.salt.portfolio.domain.Executions
import com.salt.portfolio.domain.MonthlySummaries
import com.salt.portfolio.domain.PlanAsset
import com.salt.portfolio.domain.PlanConfig
import com.salt.portfolio.domain.PlanMath
import com.salt.portfolio.domain.PlanMonthInFuture
import com.salt.portfolio.domain.PlanNotConfigured
import com.salt.portfolio.domain.PlanSettingsRecord
import com.salt.portfolio.domain.PlanSettingsStore
import com.salt.portfolio.domain.PlanWeekNotCurrent
import com.salt.portfolio.domain.PlanWeeks
import com.salt.portfolio.domain.WeekPlans
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.time.YearMonth

/** portfolio 서비스의 트랜잭션 매니저 이름(`ServiceDatabase` — 서비스마다 따로). */
const val PORTFOLIO_TX = "portfolioTx"

/** 유스케이스들이 같이 쓰는 읽기 재료 — 옛 Express `PlanReadDeps` */
class PlanReads(
    val settings: PlanSettingsStore,
    val executions: ExecutionStore,
    val bands: BandReader,
    val config: PlanConfig,
    val clock: Clock,
)

/**
 * 시작 주부터 이번 주까지 행을 맞춘다 — 월요일 cron 대신 **읽을 때 멱등하게**(`SRV-REQ-020` FR-32).
 * 이 맥은 평일 업무 시간에만 켜져 월요일 회차를 자주 놓친다 — 읽는 순간 채우면 놓친 회차가 없다.
 * 빠진 주가 없으면 쓰기 0(대부분의 요청). 쓰기는 한 문장씩(넣기 · 마감) — 각 문장이 자동 커밋(옛것과 같다: 넣기는 `ON CONFLICT DO NOTHING` 이라 동시 요청도 안전).
 */
internal fun PlanReads.syncWeeks(userId: String, settings: PlanSettingsRecord, currentWeek: LocalDate): List<ExecutionRecord> {
    val rows = executions.list(userId, settings.startedWeek, currentWeek)
    val assets = config.allocation.map { it.asset }
    val have = rows.map { it.weekOf to it.asset }.toSet()
    val firstMissing = generateSequence(settings.startedWeek) { it.plusWeeks(1) }.takeWhile { it <= currentWeek }
        .firstOrNull { w -> assets.any { (w to it) !in have } }
    val stalePlanned = rows.any { it.status == ExecutionStatus.PLANNED && it.weekOf < currentWeek }
    if (firstMissing == null && !stalePlanned) return rows

    var inserted = 0
    if (firstMissing != null) {
        val bandsByWeek = bands.weeks(firstMissing, currentWeek).associateBy { it.planWeek to it.asset }
        val add = WeekPlans.missingWeeks(settings, currentWeek, rows, bandsByWeek, config.allocation)
        executions.insertMissing(userId, add)
        inserted = add.size
    }
    if (stalePlanned) executions.closeBefore(userId, currentWeek)
    return if (inserted > 0 || stalePlanned) executions.list(userId, settings.startedWeek, currentWeek) else rows
}

private fun Executions.Streak.view() = StreakView(weeks, cumulativeKrw, skippedLast12, plannedLast12)

/**
 * 이번 주 계획(`GET /api/plan/weekly`) — 금액 = 기본액 × 예측 배수, 1,000원 단위.
 * 지표 · 성적 · 실패 사례 · 김프는 예측 뷰 그대로, 금액 · 연속 · 미실행만 여기서. 예측이 비어도 기본액은 늘 보인다(FR-22).
 */
class GetWeeklyPlan(private val reads: PlanReads) {
    fun execute(userId: String): WeeklyPlanView {
        val now = reads.clock.instant()
        val currentWeek = PlanWeeks.weekOfKst(now)
        val settings = reads.settings.get(userId)
        val latest: Map<PlanAsset, BandWeekRow> = reads.bands.latest().associateBy { it.asset }
        val rows = settings?.let { reads.syncWeeks(userId, it, currentWeek) } ?: emptyList()
        val thisWeek = rows.filter { it.weekOf == currentWeek }.associateBy { it.asset }
        val today = PlanWeeks.kstDate(now)

        val items = reads.config.allocation.map { (asset) ->
            val band = latest[asset]
            val row = thisWeek[asset]
            // 행이 없으면(설정 전 · 예측 회차 전) 지금 기준 잠정 — 이번 주 예측이면 그 배수, 아니면 정액
            val provisional = WeekPlans.resolveMultiplier(band?.takeIf { it.planWeek == currentWeek })
            val base = row?.weeklyBaseKrw ?: settings?.let { PlanMath.weeklyBaseFor(it, currentWeek, asset, reads.config.allocation) }
            val multiplier = row?.multiplier ?: provisional.multiplier
            val gate = BandCard.gate(band)
            WeeklyPlanItemView(
                asset = asset.code,
                indicator = band?.indicator,
                weeklyBaseKrw = base,
                multiplier = multiplier,
                amountKrw = row?.plannedKrw ?: base?.let { PlanMath.plannedKrw(it, multiplier) },
                status = row?.status?.code,
                executedKrw = row?.executedKrw,
                fixed = row != null,
                fallback = row?.fallback ?: provisional.fallback,
                reasonCode = reasonOf(row, band, currentWeek),
                basis = band?.let {
                    BasisView(
                        planWeek = it.planWeek.toString(),
                        value = it.indicatorValue,
                        percentile = it.percentile,
                        estimated = it.estimated,
                        basisObserved = it.basisObserved?.iso(),
                        secondaryValue = it.secondaryValue,
                        bandKey = it.bandKey,
                        bandMultiplier = it.bandMultiplier,
                        bands = it.bands,
                        staleDays = maxOf(0L, PlanWeeks.daysBetween(it.planWeek, today)),
                        computedAt = it.computedAt.iso(),
                    )
                },
                trackRecord = band?.let {
                    TrackRecordView(
                        preregKey = it.preregKey,
                        gatePassed = it.gatePassed,
                        gateBlockedReason = it.blockedReason,
                        closedWeeks = it.closedWeeks,
                        excess = it.excess,
                        ciLow = it.ciLow,
                        ciHigh = it.ciHigh,
                        yearsTotal = it.yearsTotal,
                        yearsPositive = it.yearsPositive,
                        windowFrom = it.windowFrom?.iso(),
                        windowTo = it.windowTo?.iso(),
                    )
                },
                failureCases = band?.let { FailureCasesView(it.failureCount, it.failureCases) },
                renderable = gate.renderable,
                blockedReason = gate.blockedReason,
            )
        }

        val btc = items.firstOrNull { it.asset == PlanAsset.BTC.code }
        val kimchi = BandCard.kimchi(latest[PlanAsset.BTC], btc?.amountKrw, now, reads.config)
        val degraded = buildList {
            if (items.any { it.reasonCode == "band_pending" }) add("band_pending")
            if (items.any { it.reasonCode == "band_unavailable" }) add("band_unavailable")
            if (btc != null && kimchi == null) add("kimchi_unavailable")
        }
        return WeeklyPlanView(
            weekOf = currentWeek.toString(),
            configured = settings != null,
            totalKrw = settings?.let { items.sumOf { it.amountKrw ?: 0L } },
            items = items,
            kimchiPremium = kimchi?.let { KimchiView(it.premiumPct, it.costKrwOnPlan, it.level, it.asOf.iso()) },
            streak = Executions.streakOf(rows, currentWeek).view(),
            degraded = degraded.isNotEmpty(),
            degradedReasons = degraded,
        )
    }

    private fun reasonOf(row: ExecutionRecord?, latest: BandWeekRow?, currentWeek: LocalDate): String = when {
        row != null -> if (row.fallback) "band_unavailable" else if (row.gatePassed == true) "band_applied" else "gate_not_passed"
        latest != null && latest.planWeek == currentWeek -> if (latest.gatePassed) "band_applied" else "gate_not_passed"
        latest != null -> "band_pending"
        else -> "band_unavailable"
    }
}

/** 완료 요청의 자산 하나 — 금액을 생략하면 계획액 */
data class ExecutionInput(val asset: PlanAsset, val amountKrw: Long?)

/**
 * [이번 주 적립 완료] 수동 체크(`SRV-REQ-020` FR-40~45 · ADR-002) — 원장 · 보유 거래를 보지 않는다.
 * 이번 주만 받는다(지난 주는 마감된 사실). 금액을 생략하면 계획액, 다시 보내면 금액을 고친다.
 * 예측 회차 전이라 이번 주 행이 없으면 그때 정액으로 굳힌다 — 체크한 금액의 근거가 남아야 한다(FR-23).
 */
class CompleteWeeklyPlan(private val reads: PlanReads) {
    fun execute(userId: String, weekOf: LocalDate, executions: List<ExecutionInput>): CompleteWeeklyPlanView {
        val now = reads.clock.instant()
        val currentWeek = PlanWeeks.weekOfKst(now)
        if (weekOf != currentWeek) throw PlanWeekNotCurrent(currentWeek.toString())
        val settings = reads.settings.get(userId) ?: throw PlanNotConfigured()

        var rows = reads.syncWeeks(userId, settings, currentWeek)
        val have = rows.map { it.weekOf to it.asset }.toSet()
        val lacking = executions.filter { (currentWeek to it.asset) !in have }
        if (lacking.isNotEmpty()) {
            reads.executions.insertMissing(
                userId,
                lacking.map { WeekPlans.snapshotWeek(settings, currentWeek, it.asset, null, ExecutionStatus.PLANNED, reads.config.allocation) },
            )
            rows = reads.executions.list(userId, settings.startedWeek, currentWeek)
        }

        val thisWeek = rows.filter { it.weekOf == currentWeek }.associateBy { it.asset }
        val items = executions.map { e ->
            val row = checkNotNull(thisWeek[e.asset]) { "이번 주 행을 만들지 못했다: ${e.asset.code}" }
            e.asset to Executions.executedAmount(row, e.amountKrw, reads.config.executionCapMultiple)
        }
        reads.executions.markExecuted(userId, currentWeek, items, now)

        val done = items.toMap()
        val after = rows.map { r ->
            done[r.asset]?.takeIf { r.weekOf == currentWeek }?.let { r.copy(status = ExecutionStatus.EXECUTED, executedKrw = it) } ?: r
        }
        val streak = Executions.streakOf(after, currentWeek)
        return CompleteWeeklyPlanView(currentWeek.toString(), streak.weeks, streak.cumulativeKrw)
    }
}

/** 설정 응답 조립 — 저장 응답과 같은 모양(`SRV-REQ-020` FR-74 — 밴드 · 배분은 읽기 전용) */
internal fun settingsView(settings: PlanSettingsRecord?, latest: List<BandWeekRow>, currentWeek: LocalDate, config: PlanConfig) = PlanSettingsView(
    configured = settings != null,
    monthlyBaseKrw = settings?.monthlyBaseKrw,
    currentMonthlyBaseKrw = settings?.let { PlanMath.monthlyForWeek(it, currentWeek) },
    pending = settings?.takeIf { it.effectiveWeek > currentWeek }?.let { PendingView(it.monthlyBaseKrw, it.effectiveWeek.toString()) },
    startedWeek = settings?.startedWeek?.toString(),
    allocation = config.allocation.map { (asset, pct) ->
        AllocationView(asset.code, pct, settings?.let { PlanMath.weeklyBaseFor(it, currentWeek, asset, config.allocation) })
    },
    bands = config.allocation.map { (asset) ->
        val band = latest.firstOrNull { it.asset == asset }
        BandSettingView(asset.code, band?.indicator, band?.bands ?: emptyList(), band?.bandKey)
    },
    limits = LimitsView(config.monthlyMinKrw, config.monthlyMaxKrw, PlanMath.UNIT_KRW),
)

/** 설정 읽기 — 없으면 200 `configured: false`(FR-18 · B12) */
class GetPlanSettings(private val reads: PlanReads) {
    fun execute(userId: String): PlanSettingsView =
        settingsView(reads.settings.get(userId), reads.bands.latest(), PlanWeeks.weekOfKst(reads.clock.instant()), reads.config)
}

/** 다음 설정 — 첫 저장은 이번 주부터, 수정은 다음 주부터(FR-75). 반영 전 다시 고치면 대기값만 바꾼다. 바뀔 게 없으면 null */
internal fun nextSettings(existing: PlanSettingsRecord?, monthly: Long, currentWeek: LocalDate): PlanSettingsRecord? {
    if (existing == null) return PlanSettingsRecord(monthly, null, currentWeek, currentWeek)
    if (existing.effectiveWeek > currentWeek) {
        // 대기 중 — 지금 쓰는 값으로 되돌리면 대기를 거둔다
        val inUse = existing.previousMonthlyBaseKrw ?: existing.monthlyBaseKrw
        return if (monthly == inUse) {
            existing.copy(monthlyBaseKrw = monthly, previousMonthlyBaseKrw = null, effectiveWeek = currentWeek)
        } else {
            existing.copy(monthlyBaseKrw = monthly)
        }
    }
    if (monthly == existing.monthlyBaseKrw) return null
    return existing.copy(monthlyBaseKrw = monthly, previousMonthlyBaseKrw = existing.monthlyBaseKrw, effectiveWeek = currentWeek.plusWeeks(1))
}

/** 설정 쓰기 한 트랜잭션 — 같은 사람 저장은 잠금으로 줄 세운다(읽고 → 이전 값 계산 → 쓰기) */
open class SavePlanSettings(private val settings: PlanSettingsStore) {
    @Transactional(transactionManager = PORTFOLIO_TX)
    open fun execute(userId: String, monthlyBaseKrw: Long, currentWeek: LocalDate): PlanSettingsRecord? {
        settings.lock(userId)
        val existing = settings.get(userId)
        val next = nextSettings(existing, monthlyBaseKrw, currentWeek)
        next?.let { settings.save(userId, it) }
        return next ?: existing
    }
}

/**
 * 월 적립액 저장(`SRV-REQ-020` FR-70~77) — 첫 저장과 수정이 같은 유스케이스(upsert). 밴드 · 배분 키는 api 층이 422.
 * 첫 저장이면 이번 주 계획을 바로 만든다(FR-18 · B12). 예측 뷰 읽기 · 주 채움은 저장 트랜잭션 밖.
 */
class UpdatePlanSettings(private val reads: PlanReads, private val save: SavePlanSettings) {
    fun execute(userId: String, monthlyBaseKrw: Long): PlanSettingsView {
        PlanMath.assertMonthlyBase(monthlyBaseKrw, reads.config)
        val currentWeek = PlanWeeks.weekOfKst(reads.clock.instant())
        val saved = save.execute(userId, monthlyBaseKrw, currentWeek)
        saved?.let { reads.syncWeeks(userId, it, currentWeek) }
        return settingsView(saved, reads.bands.latest(), currentWeek, reads.config)
    }
}

/** 이번 달 적립 합계(`SRV-REQ-020` FR-80~83 · B20) — 달을 안 주면 이번 달(KST). 오지 않은 달은 읽기 전에 거절(`SRV-REQ-021` FR-29) */
class GetMonthlySummary(private val reads: PlanReads) {
    fun execute(userId: String, month: YearMonth?): MonthlySummaryView {
        val now = reads.clock.instant()
        val currentWeek = PlanWeeks.weekOfKst(now)
        val today = PlanWeeks.kstDate(now)
        val thisMonth = YearMonth.from(today)
        if (month != null && month > thisMonth) throw PlanMonthInFuture(thisMonth.toString())
        val settings = reads.settings.get(userId)
        val rows = settings?.let { reads.syncWeeks(userId, it, currentWeek) } ?: emptyList()
        val s = MonthlySummaries.of(month ?: thisMonth, today, settings?.startedWeek, rows)
        return MonthlySummaryView(
            month = s.month.toString(),
            executedKrw = s.executedKrw,
            plannedKrw = s.plannedKrw,
            progressPct = s.progressPct,
            executedWeeks = s.executedWeeks,
            totalWeeks = s.totalWeeks,
            daysLeft = s.daysLeft,
            monthlyBaseKrw = settings?.let { PlanMath.monthlyForWeek(it, currentWeek) },
        )
    }
}
