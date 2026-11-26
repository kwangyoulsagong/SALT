package com.salt.portfolio

import com.salt.app.SaltDbProperties
import com.salt.portfolio.application.CompleteWeeklyPlan
import com.salt.portfolio.application.GetMonthlySummary
import com.salt.portfolio.application.GetPlanSettings
import com.salt.portfolio.application.GetWeeklyPlan
import com.salt.portfolio.application.PORTFOLIO_TX
import com.salt.portfolio.application.PlanReads
import com.salt.portfolio.application.SavePlanSettings
import com.salt.portfolio.application.UpdatePlanSettings
import com.salt.portfolio.domain.Allocation
import com.salt.portfolio.domain.PlanAsset
import com.salt.portfolio.domain.PlanConfig
import com.salt.portfolio.infrastructure.JooqBandReader
import com.salt.portfolio.infrastructure.JooqExecutions
import com.salt.portfolio.infrastructure.JooqPlanSettings
import com.salt.portfolio.infrastructure.PortfolioUserRows
import com.salt.support.persistence.PersonalData
import com.salt.support.persistence.ServiceDatabase
import com.salt.support.web.FixedWindowLimit
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import tools.jackson.databind.json.JsonMapper
import java.time.Clock
import java.time.Duration

/**
 * 밴드 적립 설정값 — 옛 Express env 와 **같은 이름 · 같은 기본값**(`PLAN_*`, `application.yml` 이 env 를 읽는다). 코드 상수 0.
 * 배분 합 100 · 자산 중복 0 은 [PlanConfig] 가 기동 때 확인한다(틀리면 서버가 뜨지 않는다 — 옛것과 같다).
 */
@ConfigurationProperties("salt.portfolio.plan")
data class PlanProperties(
    val allocationBtcPct: Double = 50.0,
    val monthlyMinKrw: Long = 10_000,
    val monthlyMaxKrw: Long = 100_000_000,
    val executionCapMultiple: Double = 10.0,
    val kimchiHighPct: Double = 3.0,
    val kimchiLowPct: Double = -2.0,
    val kimchiMaxAgeDays: Int = 8,
) {
    init {
        require(allocationBtcPct in 0.0..100.0) { "PLAN_ALLOCATION_BTC_PCT 는 0~100" }
        require(monthlyMinKrw > 0 && monthlyMaxKrw > 0 && executionCapMultiple > 0 && kimchiMaxAgeDays > 0) { "PLAN_* 값은 양수" }
    }

    fun toConfig(): PlanConfig = PlanConfig(
        allocation = listOf(Allocation(PlanAsset.BTC, allocationBtcPct), Allocation(PlanAsset.KOSPI, 100 - allocationBtcPct)),
        monthlyMinKrw = monthlyMinKrw,
        monthlyMaxKrw = monthlyMaxKrw,
        executionCapMultiple = executionCapMultiple,
        kimchiHighPct = kimchiHighPct,
        kimchiLowPct = kimchiLowPct,
        kimchiMaxAgeDays = kimchiMaxAgeDays,
    )
}

/**
 * portfolio 서비스 조립(`SRV-REQ-049` FR-1) — 이 파일만 네 층을 다 안다(`kotlin-platform.md` §2).
 * S4a(2026-11-26): 밴드 적립(`plan`)만. 보유 · 거래 · 평가(S4b~)는 아직 Express — 같은 스키마 · 같은 조립에 붙는다.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(PlanProperties::class)
class PortfolioComposition {
    @Bean(destroyMethod = "close")
    fun portfolioDatabase(db: SaltDbProperties): ServiceDatabase = ServiceDatabase.open(SCHEMA, db.connection(SCHEMA))

    @Bean(PORTFOLIO_TX)
    fun portfolioTx(@Qualifier("portfolioDatabase") database: ServiceDatabase): PlatformTransactionManager = database.transactionManager

    @Bean
    fun portfolioPlanReads(
        @Qualifier("portfolioDatabase") database: ServiceDatabase,
        properties: PlanProperties,
        jsonMapper: JsonMapper,
        clock: Clock,
    ): PlanReads = PlanReads(JooqPlanSettings(database.dsl), JooqExecutions(database.dsl), JooqBandReader(database.dsl, jsonMapper), properties.toConfig(), clock)

    @Bean
    fun getWeeklyPlan(reads: PlanReads): GetWeeklyPlan = GetWeeklyPlan(reads)

    @Bean
    fun completeWeeklyPlan(reads: PlanReads): CompleteWeeklyPlan = CompleteWeeklyPlan(reads)

    @Bean
    fun getPlanSettings(reads: PlanReads): GetPlanSettings = GetPlanSettings(reads)

    @Bean
    fun savePlanSettings(@Qualifier("portfolioDatabase") database: ServiceDatabase): SavePlanSettings = SavePlanSettings(JooqPlanSettings(database.dsl))

    @Bean
    fun updatePlanSettings(reads: PlanReads, save: SavePlanSettings): UpdatePlanSettings = UpdatePlanSettings(reads, save)

    @Bean
    fun getMonthlySummary(reads: PlanReads): GetMonthlySummary = GetMonthlySummary(reads)

    /** 쓰기 경로 요청 제한 — 사람마다 분당 30(옛 `plan.routes.ts` 그대로) */
    @Bean
    fun planWriteLimit(clock: Clock): FixedWindowLimit = FixedWindowLimit(Duration.ofMinutes(1), 30, clock)

    /** 내 데이터 — 내보내기 · 지우기(`SRV-REQ-048` FR-3 · 4). 경로는 앱 하나(`MyDataController`) */
    @Bean
    fun portfolioPersonalData(@Qualifier("portfolioDatabase") database: ServiceDatabase): PersonalData =
        PersonalData(PortfolioUserRows.of(database.dsl), database.transactionManager)

    companion object {
        const val SCHEMA = "portfolio"
    }
}
