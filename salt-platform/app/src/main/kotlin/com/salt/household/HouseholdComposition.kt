package com.salt.household

import com.salt.app.SaltDbProperties
import com.salt.household.application.DeleteExpense
import com.salt.household.application.GetBudget
import com.salt.household.application.GetMonth
import com.salt.household.application.HOUSEHOLD_TX
import com.salt.household.application.HomeCard
import com.salt.household.application.LandingReader
import com.salt.household.application.ParseInput
import com.salt.household.application.RecordExpenses
import com.salt.household.application.SetBudget
import com.salt.household.application.Suggestions
import com.salt.household.infrastructure.JooqBudgets
import com.salt.household.infrastructure.JooqExpenses
import com.salt.household.infrastructure.JooqLandings
import com.salt.household.infrastructure.OutboxHouseholdEvents
import com.salt.support.messaging.EventSchemas
import com.salt.support.messaging.OutboxSource
import com.salt.support.messaging.OutboxWriter
import com.salt.support.messaging.TraceParent
import com.salt.support.persistence.ServiceDatabase
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import tools.jackson.databind.json.JsonMapper
import java.time.Clock

/**
 * household 서비스 조립(`SRV-REQ-046`) — 이 파일만 네 층을 다 안다(`kotlin-platform.md` §2). 본뜬 곳 `SavingsComposition`.
 * 빈 이름이 서비스마다 겹치지 않게 `household` 를 앞에 붙인다(`HomeCard` 는 저축에도 있다).
 */
@Configuration(proxyBeanMethods = false)
class HouseholdComposition {
    @Bean(destroyMethod = "close")
    fun householdDatabase(db: SaltDbProperties): ServiceDatabase = ServiceDatabase.open(SCHEMA, db.connection(SCHEMA))

    @Bean(HOUSEHOLD_TX)
    fun householdTx(@Qualifier("householdDatabase") database: ServiceDatabase): PlatformTransactionManager = database.transactionManager

    @Bean
    fun householdOutboxSource(@Qualifier("householdDatabase") database: ServiceDatabase): OutboxSource = OutboxSource(SCHEMA, database.dsl, database.dataSource)

    @Bean
    fun householdOutbox(
        @Qualifier("householdDatabase") database: ServiceDatabase,
        schemas: EventSchemas,
        jsonMapper: JsonMapper,
        traceParent: TraceParent,
        clock: Clock,
    ): OutboxWriter = OutboxWriter(SCHEMA, database.dsl, database.dataSource, schemas, jsonMapper, traceParent, clock)

    @Bean
    fun householdLandingReader(@Qualifier("householdDatabase") database: ServiceDatabase): LandingReader =
        LandingReader(JooqExpenses(database.dsl), JooqLandings(database.dsl))

    @Bean
    fun householdRecordExpenses(
        @Qualifier("householdDatabase") database: ServiceDatabase,
        @Qualifier("householdOutbox") outbox: OutboxWriter,
        landingReader: LandingReader,
        clock: Clock,
    ): RecordExpenses = RecordExpenses(
        JooqExpenses(database.dsl), JooqBudgets(database.dsl), JooqLandings(database.dsl), landingReader, OutboxHouseholdEvents(outbox), clock,
    )

    @Bean
    fun householdDeleteExpense(@Qualifier("householdDatabase") database: ServiceDatabase): DeleteExpense = DeleteExpense(JooqExpenses(database.dsl))

    @Bean
    fun householdParseInput(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): ParseInput = ParseInput(JooqExpenses(database.dsl), clock)

    @Bean
    fun householdSuggestions(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): Suggestions = Suggestions(JooqExpenses(database.dsl), clock)

    @Bean
    fun householdGetBudget(@Qualifier("householdDatabase") database: ServiceDatabase): GetBudget = GetBudget(JooqBudgets(database.dsl))

    @Bean
    fun householdSetBudget(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): SetBudget = SetBudget(JooqBudgets(database.dsl), clock)

    @Bean
    fun householdGetMonth(@Qualifier("householdDatabase") database: ServiceDatabase, landingReader: LandingReader, clock: Clock): GetMonth =
        GetMonth(JooqExpenses(database.dsl), JooqBudgets(database.dsl), landingReader, clock)

    @Bean
    fun householdHomeCard(@Qualifier("householdDatabase") database: ServiceDatabase, landingReader: LandingReader, clock: Clock): HomeCard =
        HomeCard(JooqExpenses(database.dsl), JooqBudgets(database.dsl), landingReader, clock)

    companion object {
        const val SCHEMA = "household"
    }
}
