package com.salt.portfolio.infrastructure

import com.salt.portfolio.domain.BandReader
import com.salt.portfolio.domain.BandRule
import com.salt.portfolio.domain.BandWeekRow
import com.salt.portfolio.domain.ExecutionRecord
import com.salt.portfolio.domain.ExecutionStatus
import com.salt.portfolio.domain.ExecutionStore
import com.salt.portfolio.domain.FailureCase
import com.salt.portfolio.domain.PlanAsset
import com.salt.portfolio.domain.PlanSettingsRecord
import com.salt.portfolio.domain.PlanSettingsStore
import com.salt.support.persistence.UserRowSet
import com.salt.support.persistence.UserRows
import org.jooq.DSLContext
import org.jooq.Record
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

/**
 * `plan_settings` — 사람마다 한 행. 저장은 한 문장 `INSERT … ON CONFLICT (user_id) DO UPDATE`(첫 저장 경합에 유니크 위반 0).
 * 이전 값 · 반영 주 계산은 유스케이스가 잠금 안에서 한다. 옛 Express `PrismaPlanSettingsStore` 와 같은 SQL.
 */
class JooqPlanSettings(private val dsl: DSLContext) : PlanSettingsStore {
    override fun get(userId: String): PlanSettingsRecord? =
        dsl.resultQuery(
            "SELECT monthly_base_krw, previous_monthly_base_krw, effective_week, started_week FROM plan_settings WHERE user_id = ?",
            userId,
        ).fetchOne()?.let { r ->
            PlanSettingsRecord(
                monthlyBaseKrw = r.krw(0)!!,
                previousMonthlyBaseKrw = r.krw(1),
                effectiveWeek = r.get(2, LocalDate::class.java),
                startedWeek = r.get(3, LocalDate::class.java),
            )
        }

    override fun lock(userId: String) {
        dsl.resultQuery("SELECT pg_advisory_xact_lock(hashtext(?))", "plan:settings:$userId").fetch()
    }

    override fun save(userId: String, record: PlanSettingsRecord) {
        dsl.execute(
            """
            INSERT INTO plan_settings (id, user_id, monthly_base_krw, previous_monthly_base_krw, effective_week, started_week, updated_at)
            VALUES (?, ?, ?::numeric, ?::numeric, ?::date, ?::date, now())
            ON CONFLICT (user_id) DO UPDATE SET
              monthly_base_krw = EXCLUDED.monthly_base_krw,
              previous_monthly_base_krw = EXCLUDED.previous_monthly_base_krw,
              effective_week = EXCLUDED.effective_week,
              updated_at = now()
            """.trimIndent(),
            UUID.randomUUID().toString(), userId, record.monthlyBaseKrw, record.previousMonthlyBaseKrw,
            record.effectiveWeek.toString(), record.startedWeek.toString(),
        )
    }
}

/**
 * `weekly_plan_executions` — 쓰기는 전부 한 문장(행마다 흩지 않는다 — Express `noParallelRowWrites` 와 같은 규칙).
 * 넣기는 `ON CONFLICT DO NOTHING` — 처음 만든 스냅샷을 지킨다(동시 첫 요청도 오류 0).
 */
class JooqExecutions(private val dsl: DSLContext) : ExecutionStore {
    override fun list(userId: String, fromWeek: LocalDate, toWeek: LocalDate): List<ExecutionRecord> =
        dsl.resultQuery(
            """
            SELECT week_of, asset, weekly_base_krw, multiplier, planned_krw, band_key, gate_passed, blocked_reason, prereg_key,
                   indicator_value, fallback, status, executed_krw, recorded_at
            FROM weekly_plan_executions
            WHERE user_id = ? AND week_of >= ?::date AND week_of <= ?::date
            ORDER BY week_of, asset
            LIMIT $LIST_CAP
            """.trimIndent(),
            userId, fromWeek.toString(), toWeek.toString(),
        ).fetch { r ->
            ExecutionRecord(
                weekOf = r.get(0, LocalDate::class.java),
                asset = PlanAsset.of(r.get(1, String::class.java))!!, // DB CHECK (btc · kospi)
                weeklyBaseKrw = r.krw(2)!!,
                multiplier = r.get(3, BigDecimal::class.java).toDouble(),
                plannedKrw = r.krw(4)!!,
                bandKey = r.get(5, String::class.java),
                gatePassed = r.get(6, Boolean::class.javaObjectType),
                blockedReason = r.get(7, String::class.java),
                preregKey = r.get(8, String::class.java),
                indicatorValue = r.get(9, Double::class.javaObjectType),
                fallback = r.get(10, Boolean::class.javaObjectType),
                status = ExecutionStatus.of(r.get(11, String::class.java)), // DB CHECK
                executedKrw = r.krw(12),
                recordedAt = r.get(13, OffsetDateTime::class.java)?.toInstant(),
            )
        }

    override fun insertMissing(userId: String, rows: List<ExecutionRecord>) {
        if (rows.isEmpty()) return
        val values = rows.joinToString(", ") { "(?, ?, ?::date, ?, ?::numeric, ?::numeric, ?::numeric, ?, ?, ?, ?, ?::float8, ?, ?, now())" }
        val binds = rows.flatMap { r ->
            listOf<Any?>(
                UUID.randomUUID().toString(), userId, r.weekOf.toString(), r.asset.code, r.weeklyBaseKrw,
                BigDecimal.valueOf(r.multiplier).toPlainString(), r.plannedKrw, r.bandKey, r.gatePassed, r.blockedReason, r.preregKey,
                r.indicatorValue, r.fallback, r.status.code,
            )
        }
        dsl.execute(
            """
            INSERT INTO weekly_plan_executions (id, user_id, week_of, asset, weekly_base_krw, multiplier, planned_krw, band_key, gate_passed,
                                                blocked_reason, prereg_key, indicator_value, fallback, status, updated_at)
            VALUES $values
            ON CONFLICT (user_id, week_of, asset) DO NOTHING
            """.trimIndent(),
            *binds.toTypedArray(),
        )
    }

    override fun closeBefore(userId: String, beforeWeek: LocalDate) {
        dsl.execute(
            "UPDATE weekly_plan_executions SET status = 'skipped', updated_at = now() WHERE user_id = ? AND status = 'planned' AND week_of < ?::date",
            userId, beforeWeek.toString(),
        )
    }

    override fun markExecuted(userId: String, weekOf: LocalDate, items: List<Pair<PlanAsset, Long>>, at: Instant) {
        if (items.isEmpty()) return
        val values = items.joinToString(", ") { "(?, ?::numeric)" }
        dsl.execute(
            """
            UPDATE weekly_plan_executions AS e
            SET status = 'executed', executed_krw = v.amount, recorded_at = ?::timestamptz, updated_at = now()
            FROM (VALUES $values) AS v(asset, amount)
            WHERE e.user_id = ? AND e.week_of = ?::date AND e.asset = v.asset
            """.trimIndent(),
            at.toString(), *items.flatMap { listOf<Any>(it.first.code, it.second) }.toTypedArray(), userId, weekOf.toString(),
        )
    }

    private companion object {
        /** 한 사람 주 × 자산 — 10년이면 1,040행. 상한은 그 위로(옛것과 같다) */
        const val LIST_CAP = 2_000
    }
}

/**
 * 밴드 적립 예측 뷰(`FC-REQ-029` · `DB-REQ-013`) — forecast 스키마는 예측(Python)이 주인이고 svc_portfolio 는 이 뷰 둘 SELECT 만 있다
 * (Prisma `20261126100000_forecast_band_grant_portfolio` 의 GRANT). 숫자 계산 0 — 금액은 도메인 정책이 한다.
 * 못 읽으면 예외 그대로(옛 Express 와 같다 — 이번 주 계획 응답이 500). 화면은 블록 다시 부르기.
 */
class JooqBandReader(private val dsl: DSLContext, private val json: JsonMapper) : BandReader {
    override fun latest(): List<BandWeekRow> = dsl.resultQuery("SELECT $COLUMNS FROM forecast.v_accumulation_band").fetch().mapNotNull(::toRow)

    override fun weeks(fromWeek: LocalDate, toWeek: LocalDate): List<BandWeekRow> =
        dsl.resultQuery(
            // 결정 시각 = 월요일 00:00 UTC — 세션 시간대와 무관하게
            """
            SELECT $COLUMNS FROM forecast.v_accumulation_band_week
            WHERE plan_week >= (?::date)::timestamp AT TIME ZONE 'UTC'
              AND plan_week < (?::date + 1)::timestamp AT TIME ZONE 'UTC'
            """.trimIndent(),
            fromWeek.toString(), toWeek.toString(),
        ).fetch().mapNotNull(::toRow)

    private fun toRow(r: Record): BandWeekRow? {
        val asset = PlanAsset.of(r.get("asset", String::class.java)) ?: return null
        return BandWeekRow(
            asset = asset,
            // 결정 시각은 월요일 00:00 UTC — UTC 날짜가 곧 KST 월요일
            planWeek = r.instant("plan_week")!!.atOffset(ZoneOffset.UTC).toLocalDate(),
            preregKey = r.get("prereg_key", String::class.java),
            indicator = r.get("indicator", String::class.java),
            indicatorValue = r.dbl("indicator_value"),
            percentile = r.dbl("percentile"),
            estimated = r.get("estimated", Boolean::class.javaObjectType),
            basisObserved = r.instant("basis_observed"),
            secondaryValue = r.dbl("secondary_value"),
            bandKey = r.get("band_key", String::class.java),
            bandMultiplier = r.dbl("band_multiplier"),
            gatePassed = r.get("gate_passed", Boolean::class.javaObjectType),
            blockedReason = r.get("blocked_reason", String::class.java),
            multiplier = r.dbl("multiplier")!!,
            closedWeeks = r.get("closed_weeks", Int::class.javaObjectType),
            excess = r.dbl("excess"),
            ciLow = r.dbl("ci_low"),
            ciHigh = r.dbl("ci_high"),
            yearsTotal = r.get("years_total", Int::class.javaObjectType),
            yearsPositive = r.get("years_positive", Int::class.javaObjectType),
            windowFrom = r.instant("window_from"),
            windowTo = r.instant("window_to"),
            failureCases = failureCases(jsonOf(r, "failure_cases")),
            failureCount = r.get("failure_count", Int::class.javaObjectType),
            kimchiPremium = r.dbl("kimchi_premium"),
            kimchiAsOf = r.instant("kimchi_as_of"),
            computedAt = r.instant("computed_at")!!,
            bands = bandRules(jsonOf(r, "bands")),
        )
    }

    private fun jsonOf(r: Record, field: String): JsonNode? = r.get(field)?.toString()?.let { json.readTree(it) }

    /** jsonb 는 모양을 믿지 않는다 — 빠진 칸이 있는 줄은 버린다(빈 실패 사례 = 게이트가 막는다). 옛 Express 와 같은 거르기 */
    private fun failureCases(node: JsonNode?): List<FailureCase> =
        node?.takeIf { it.isArray }?.mapNotNull { c ->
            if (c.isObject && c["decidedAt"]?.isString == true && c["kind"]?.isString == true && c["band"]?.isString == true &&
                c["multiplier"]?.isNumber == true && c["return52w"]?.isNumber == true
            ) {
                FailureCase(c["decidedAt"].asString(), c["kind"].asString(), c["band"].asString(), c["multiplier"].asDouble(), c["return52w"].asDouble())
            } else {
                null
            }
        } ?: emptyList()

    private fun bandRules(node: JsonNode?): List<BandRule> =
        node?.takeIf { it.isArray }?.mapNotNull { b ->
            val below = b["below"]
            if (b.isObject && b["key"]?.isString == true && below != null && (below.isNull || below.isNumber) && b["multiplier"]?.isNumber == true) {
                BandRule(b["key"].asString(), if (below.isNull) null else below.asDouble(), b["multiplier"].asDouble())
            } else {
                null
            }
        } ?: emptyList()

    private companion object {
        const val COLUMNS = "asset, plan_week, prereg_key, indicator, indicator_value, percentile, estimated, basis_observed, secondary_value, " +
            "band_key, band_multiplier, gate_passed, blocked_reason, multiplier, closed_weeks, excess, ci_low, ci_high, years_total, " +
            "years_positive, window_from, window_to, failure_cases, failure_count, kimchi_premium, kimchi_as_of, computed_at, bands"
    }
}

/** portfolio 의 그 사람 행(`SRV-REQ-048` FR-3 · 4) — 월 적립액 · 주마다 계획 · 체크. S4b(보유 · 거래)가 오면 여기 줄이 는다 */
object PortfolioUserRows {
    fun of(dsl: DSLContext): UserRows = UserRows(
        service = "portfolio",
        dsl = dsl,
        sets = listOf(UserRowSet("weekly_plan_executions"), UserRowSet("plan_settings"), UserRows.outbox()),
        notPersonal = UserRows.TECHNICAL,
    )
}

private fun Record.krw(index: Int): Long? = get(index, BigDecimal::class.java)?.longValueExact()

private fun Record.dbl(field: String): Double? = (get(field) as Number?)?.toDouble()

private fun Record.instant(field: String): Instant? = get(field, OffsetDateTime::class.java)?.toInstant()
