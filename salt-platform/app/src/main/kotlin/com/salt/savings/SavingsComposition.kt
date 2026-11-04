package com.salt.savings

import com.salt.app.SaltDbProperties
import com.salt.savings.application.AddItemUnit
import com.salt.savings.application.Calculate
import com.salt.savings.application.CompareEmergency
import com.salt.savings.application.DeleteItemUnit
import com.salt.savings.application.SimulateBalance
import com.salt.savings.application.UpdateMonthlyPlans
import com.salt.savings.application.CreateGoal
import com.salt.savings.application.GetGoal
import com.salt.savings.application.GoalClockQuery
import com.salt.savings.application.GoalReader
import com.salt.savings.application.HasGoals
import com.salt.savings.application.HomeCard
import com.salt.savings.application.ListGoals
import com.salt.savings.application.ListTemplates
import com.salt.savings.application.ProjectionIssuer
import com.salt.savings.application.RecordDeposits
import com.salt.savings.application.SAVINGS_TX
import com.salt.savings.infrastructure.JooqDeposits
import com.salt.savings.infrastructure.JooqGoals
import com.salt.savings.infrastructure.JooqItemUnits
import com.salt.savings.infrastructure.JooqProjections
import com.salt.savings.infrastructure.OutboxSavingsEvents
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
 * savings 서비스 조립(`SRV-REQ-045`) — 이 파일만 네 층을 다 안다(`kotlin-platform.md` §2). 본뜬 곳 `PingComposition`.
 * 서비스가 둘이 되며 `ServiceDatabase` · `OutboxWriter` 빈이 타입마다 둘이다 — 이름(@Qualifier)으로 꽂는다.
 */
@Configuration(proxyBeanMethods = false)
class SavingsComposition {
    @Bean(destroyMethod = "close")
    fun savingsDatabase(db: SaltDbProperties): ServiceDatabase = ServiceDatabase.open(SCHEMA, db.connection(SCHEMA))

    @Bean(SAVINGS_TX)
    fun savingsTx(@Qualifier("savingsDatabase") database: ServiceDatabase): PlatformTransactionManager = database.transactionManager

    @Bean
    fun savingsOutboxSource(@Qualifier("savingsDatabase") database: ServiceDatabase): OutboxSource = OutboxSource(SCHEMA, database.dsl, database.dataSource)

    @Bean
    fun savingsOutbox(
        @Qualifier("savingsDatabase") database: ServiceDatabase,
        schemas: EventSchemas,
        jsonMapper: JsonMapper,
        traceParent: TraceParent,
        clock: Clock,
    ): OutboxWriter = OutboxWriter(SCHEMA, database.dsl, database.dataSource, schemas, jsonMapper, traceParent, clock)

    @Bean
    fun savingsGoalReader(@Qualifier("savingsDatabase") database: ServiceDatabase, clock: Clock): GoalReader =
        GoalReader(JooqGoals(database.dsl), JooqDeposits(database.dsl), JooqItemUnits(database.dsl), clock)

    @Bean
    fun savingsProjectionIssuer(
        @Qualifier("savingsDatabase") database: ServiceDatabase,
        @Qualifier("savingsOutbox") outbox: OutboxWriter,
        clock: Clock,
    ): ProjectionIssuer = ProjectionIssuer(JooqDeposits(database.dsl), JooqProjections(database.dsl), OutboxSavingsEvents(outbox), clock)

    @Bean
    fun listTemplates(): ListTemplates = ListTemplates()

    @Bean
    fun calculate(clock: Clock): Calculate = Calculate(clock)

    @Bean
    fun listGoals(reader: GoalReader): ListGoals = ListGoals(reader)

    @Bean
    fun getGoal(reader: GoalReader): GetGoal = GetGoal(reader)

    @Bean
    fun createGoal(
        @Qualifier("savingsDatabase") database: ServiceDatabase,
        issuer: ProjectionIssuer,
        @Qualifier("savingsOutbox") outbox: OutboxWriter,
        reader: GoalReader,
        clock: Clock,
    ): CreateGoal = CreateGoal(JooqGoals(database.dsl), issuer, OutboxSavingsEvents(outbox), reader, clock)

    @Bean
    fun recordDeposits(
        @Qualifier("savingsDatabase") database: ServiceDatabase,
        issuer: ProjectionIssuer,
        @Qualifier("savingsOutbox") outbox: OutboxWriter,
        reader: GoalReader,
        clock: Clock,
    ): RecordDeposits = RecordDeposits(JooqGoals(database.dsl), JooqDeposits(database.dsl), issuer, OutboxSavingsEvents(outbox), reader, clock)

    @Bean
    fun savingsHomeCard(reader: GoalReader): HomeCard = HomeCard(reader)

    @Bean
    fun hasGoals(@Qualifier("savingsDatabase") database: ServiceDatabase): HasGoals = HasGoals(JooqGoals(database.dsl))

    @Bean
    fun simulateBalance(reader: GoalReader, clock: Clock): SimulateBalance = SimulateBalance(reader, clock)

    @Bean
    fun updateMonthlyPlans(
        @Qualifier("savingsDatabase") database: ServiceDatabase,
        issuer: ProjectionIssuer,
        reader: GoalReader,
        clock: Clock,
    ): UpdateMonthlyPlans = UpdateMonthlyPlans(JooqGoals(database.dsl), issuer, JooqDeposits(database.dsl), reader, clock)

    @Bean
    fun compareEmergency(@Qualifier("savingsDatabase") database: ServiceDatabase, clock: Clock): CompareEmergency =
        CompareEmergency(JooqGoals(database.dsl), JooqDeposits(database.dsl), clock)

    @Bean
    fun addItemUnit(@Qualifier("savingsDatabase") database: ServiceDatabase, reader: GoalReader, clock: Clock): AddItemUnit =
        AddItemUnit(JooqGoals(database.dsl), JooqItemUnits(database.dsl), reader, clock)

    @Bean
    fun deleteItemUnit(@Qualifier("savingsDatabase") database: ServiceDatabase, reader: GoalReader): DeleteItemUnit =
        DeleteItemUnit(JooqItemUnits(database.dsl), reader)

    @Bean
    fun goalClockQuery(reader: GoalReader, clock: Clock): GoalClockQuery = GoalClockQuery(reader, clock)

    companion object {
        const val SCHEMA = "savings"
    }
}
