package com.salt.household

import com.salt.app.SaltDbProperties
import com.salt.household.api.RecurringWorker
import com.salt.household.application.AddCategory
import com.salt.household.application.ArchiveCategory
import com.salt.household.application.CloseMonth
import com.salt.household.application.EditCategory
import com.salt.household.application.ListCategories
import com.salt.household.application.ConfirmOccurrence
import com.salt.household.application.CreateTemplate
import com.salt.household.application.DeleteExpense
import com.salt.household.application.EditTemplate
import com.salt.household.application.EndTemplate
import com.salt.household.application.ExpenseWriter
import com.salt.household.application.ListTemplates
import com.salt.household.application.RunRecurring
import com.salt.household.application.SkipOccurrence
import com.salt.household.application.GetBudget
import com.salt.household.application.GetMonth
import com.salt.household.application.HOUSEHOLD_TX
import com.salt.household.application.HomeCard
import com.salt.household.application.LandingReader
import com.salt.household.application.ParseInput
import com.salt.household.application.RecordExpenses
import com.salt.household.application.SetBudget
import com.salt.household.application.Suggestions
import com.salt.household.application.AnswerNextDay
import com.salt.household.application.GetWorkHours
import com.salt.household.application.MarkNoSpend
import com.salt.household.application.SetWorkHours
import com.salt.household.application.TagFeeling
import com.salt.household.application.UnmarkNoSpend
import com.salt.household.application.UntagFeeling
import com.salt.household.application.DeleteChallengeSaving
import com.salt.household.application.EndChallenge
import com.salt.household.application.GetChallengeSaving
import com.salt.household.application.ListChallenges
import com.salt.household.application.MarkChallengeDay
import com.salt.household.application.MarkSavingContributed
import com.salt.household.application.RecordChallengeSaving
import com.salt.household.application.StartChallenge
import com.salt.household.application.UnmarkChallengeDay
import com.salt.household.application.FixedCostReader
import com.salt.household.application.FixedCostWatcher
import com.salt.household.application.HideFixedCost
import com.salt.household.application.ShowFixedCost
import com.salt.household.application.GetStory
import com.salt.household.application.AddPersonEntry
import com.salt.household.application.AddRevolving
import com.salt.household.application.DeletePersonEntry
import com.salt.household.application.EditPersonEntry
import com.salt.household.application.EditRevolving
import com.salt.household.application.EndRevolving
import com.salt.household.application.GetPeople
import com.salt.household.application.ListRevolving
import com.salt.household.application.SetOccasionEnvelope
import com.salt.household.infrastructure.JooqOccasionEnvelopes
import com.salt.household.infrastructure.JooqPersonEntries
import com.salt.household.infrastructure.JooqRevolvingPlans
import com.salt.household.infrastructure.JooqStories
import com.salt.household.infrastructure.JooqSpendingPatterns
import com.salt.household.infrastructure.JooqBudgets
import com.salt.household.infrastructure.JooqCustomCategories
import com.salt.household.infrastructure.JooqChallengeSavings
import com.salt.household.infrastructure.JooqChallenges
import com.salt.household.infrastructure.JooqFeelings
import com.salt.household.infrastructure.JooqSettings
import com.salt.household.infrastructure.JooqStickers
import com.salt.household.infrastructure.JooqExpenses
import com.salt.household.infrastructure.JooqLandings
import com.salt.household.infrastructure.JooqMonthCloses
import com.salt.household.infrastructure.JooqRecurringOccurrences
import com.salt.household.infrastructure.JooqRecurringTemplates
import com.salt.household.infrastructure.OutboxHouseholdEvents
import com.salt.support.messaging.EventSchemas
import com.salt.support.messaging.OutboxSource
import com.salt.support.messaging.OutboxWriter
import com.salt.support.messaging.ServiceLock
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
        LandingReader(JooqExpenses(database.dsl), JooqLandings(database.dsl), JooqRecurringOccurrences(database.dsl))

    @Bean
    fun householdExpenseWriter(
        @Qualifier("householdDatabase") database: ServiceDatabase,
        @Qualifier("householdOutbox") outbox: OutboxWriter,
        landingReader: LandingReader,
        clock: Clock,
    ): ExpenseWriter = OutboxHouseholdEvents(outbox).let { events ->
        ExpenseWriter(
            JooqExpenses(database.dsl), JooqBudgets(database.dsl), JooqLandings(database.dsl), landingReader, events,
            JooqSettings(database.dsl), FixedCostWatcher(fixedCostReader(database), JooqSpendingPatterns(database.dsl), events), JooqCustomCategories(database.dsl), clock,
        )
    }

    @Bean
    fun householdRecordExpenses(@Qualifier("householdDatabase") database: ServiceDatabase, writer: ExpenseWriter, clock: Clock): RecordExpenses =
        RecordExpenses(JooqExpenses(database.dsl), JooqFeelings(database.dsl), writer, JooqCustomCategories(database.dsl), clock)

    @Bean
    fun householdDeleteExpense(@Qualifier("householdDatabase") database: ServiceDatabase): DeleteExpense =
        DeleteExpense(JooqExpenses(database.dsl), JooqRecurringOccurrences(database.dsl))

    @Bean
    fun householdParseInput(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): ParseInput =
        ParseInput(JooqExpenses(database.dsl), JooqCustomCategories(database.dsl), clock)

    @Bean
    fun householdSuggestions(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): Suggestions =
        Suggestions(JooqExpenses(database.dsl), JooqCustomCategories(database.dsl), clock)

    @Bean
    fun householdGetBudget(@Qualifier("householdDatabase") database: ServiceDatabase): GetBudget = GetBudget(JooqBudgets(database.dsl))

    @Bean
    fun householdSetBudget(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): SetBudget =
        SetBudget(JooqBudgets(database.dsl), JooqCustomCategories(database.dsl), clock)

    @Bean
    fun householdGetMonth(@Qualifier("householdDatabase") database: ServiceDatabase, landingReader: LandingReader, clock: Clock): GetMonth =
        GetMonth(
            JooqExpenses(database.dsl), JooqBudgets(database.dsl), JooqRecurringOccurrences(database.dsl), JooqMonthCloses(database.dsl), landingReader,
            JooqFeelings(database.dsl), JooqStickers(database.dsl), JooqSettings(database.dsl), JooqChallenges(database.dsl),
            fixedCostReader(database), JooqSpendingPatterns(database.dsl), JooqCustomCategories(database.dsl), JooqRevolvingPlans(database.dsl), clock,
        )

    // ---------- 반복 · 마감(가계부 S1b) ----------

    @Bean
    fun householdListTemplates(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): ListTemplates =
        ListTemplates(JooqRecurringTemplates(database.dsl), clock)

    @Bean
    fun householdCreateTemplate(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): CreateTemplate =
        CreateTemplate(JooqRecurringTemplates(database.dsl), JooqRecurringOccurrences(database.dsl), JooqCustomCategories(database.dsl), clock)

    @Bean
    fun householdEditTemplate(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): EditTemplate =
        EditTemplate(JooqRecurringTemplates(database.dsl), JooqRecurringOccurrences(database.dsl), JooqCustomCategories(database.dsl), clock)

    @Bean
    fun householdEndTemplate(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): EndTemplate =
        EndTemplate(JooqRecurringTemplates(database.dsl), JooqRecurringOccurrences(database.dsl), clock)

    @Bean
    fun householdConfirmOccurrence(@Qualifier("householdDatabase") database: ServiceDatabase, writer: ExpenseWriter, clock: Clock): ConfirmOccurrence =
        ConfirmOccurrence(JooqRecurringTemplates(database.dsl), JooqRecurringOccurrences(database.dsl), JooqExpenses(database.dsl), writer, clock)

    @Bean
    fun householdSkipOccurrence(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): SkipOccurrence =
        SkipOccurrence(JooqRecurringOccurrences(database.dsl), clock)

    @Bean
    fun householdRunRecurring(
        @Qualifier("householdDatabase") database: ServiceDatabase,
        @Qualifier("householdOutbox") outbox: OutboxWriter,
        clock: Clock,
    ): RunRecurring = RunRecurring(JooqRecurringOccurrences(database.dsl), JooqExpenses(database.dsl), OutboxHouseholdEvents(outbox), clock)

    @Bean
    fun householdRecurringWorker(@Qualifier("householdDatabase") database: ServiceDatabase, runRecurring: RunRecurring, clock: Clock): RecurringWorker =
        RecurringWorker(runRecurring, ServiceLock.executor(database.dataSource), clock)

    @Bean
    fun householdCloseMonth(
        @Qualifier("householdDatabase") database: ServiceDatabase,
        @Qualifier("householdOutbox") outbox: OutboxWriter,
        clock: Clock,
    ): CloseMonth = CloseMonth(JooqMonthCloses(database.dsl), JooqBudgets(database.dsl), JooqExpenses(database.dsl), OutboxHouseholdEvents(outbox), clock)

    @Bean
    fun householdHomeCard(@Qualifier("householdDatabase") database: ServiceDatabase, landingReader: LandingReader, clock: Clock): HomeCard =
        HomeCard(JooqExpenses(database.dsl), JooqBudgets(database.dsl), landingReader, JooqCustomCategories(database.dsl), clock)

    // ---------- 사용자 분류(가계부 S1f) ----------

    @Bean
    fun householdListCategories(@Qualifier("householdDatabase") database: ServiceDatabase): ListCategories = ListCategories(JooqCustomCategories(database.dsl))

    @Bean
    fun householdAddCategory(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): AddCategory = AddCategory(JooqCustomCategories(database.dsl), clock)

    @Bean
    fun householdEditCategory(@Qualifier("householdDatabase") database: ServiceDatabase): EditCategory = EditCategory(JooqCustomCategories(database.dsl))

    @Bean
    fun householdArchiveCategory(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): ArchiveCategory = ArchiveCategory(JooqCustomCategories(database.dsl), clock)

    // ---------- 거울 셋(가계부 S1c) — 감정 태그 · 노동시간 · 무지출 달력 ----------

    @Bean
    fun householdTagFeeling(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): TagFeeling = TagFeeling(JooqFeelings(database.dsl), clock)

    @Bean
    fun householdUntagFeeling(@Qualifier("householdDatabase") database: ServiceDatabase): UntagFeeling = UntagFeeling(JooqFeelings(database.dsl))

    @Bean
    fun householdAnswerNextDay(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): AnswerNextDay = AnswerNextDay(JooqFeelings(database.dsl), clock)

    @Bean
    fun householdGetWorkHours(@Qualifier("householdDatabase") database: ServiceDatabase): GetWorkHours = GetWorkHours(JooqSettings(database.dsl))

    @Bean
    fun householdSetWorkHours(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): SetWorkHours = SetWorkHours(JooqSettings(database.dsl), clock)

    @Bean
    fun householdMarkNoSpend(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): MarkNoSpend =
        MarkNoSpend(JooqStickers(database.dsl), JooqExpenses(database.dsl), clock)

    @Bean
    fun householdUnmarkNoSpend(@Qualifier("householdDatabase") database: ServiceDatabase): UnmarkNoSpend = UnmarkNoSpend(JooqStickers(database.dsl))

    // ---------- 내가 고르는 챌린지(가계부 S1d) ----------

    @Bean
    fun householdListChallenges(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): ListChallenges =
        ListChallenges(JooqChallenges(database.dsl), JooqChallengeSavings(database.dsl), clock)

    @Bean
    fun householdStartChallenge(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): StartChallenge =
        StartChallenge(JooqChallenges(database.dsl), clock)

    @Bean
    fun householdEndChallenge(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): EndChallenge =
        EndChallenge(JooqChallenges(database.dsl), JooqChallengeSavings(database.dsl), clock)

    @Bean
    fun householdMarkChallengeDay(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): MarkChallengeDay =
        MarkChallengeDay(JooqChallenges(database.dsl), JooqChallengeSavings(database.dsl), clock)

    @Bean
    fun householdUnmarkChallengeDay(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): UnmarkChallengeDay =
        UnmarkChallengeDay(JooqChallenges(database.dsl), JooqChallengeSavings(database.dsl), clock)

    @Bean
    fun householdRecordChallengeSaving(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): RecordChallengeSaving =
        RecordChallengeSaving(JooqChallenges(database.dsl), JooqChallengeSavings(database.dsl), clock)

    @Bean
    fun householdDeleteChallengeSaving(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): DeleteChallengeSaving =
        DeleteChallengeSaving(JooqChallenges(database.dsl), JooqChallengeSavings(database.dsl), clock)

    @Bean
    fun householdGetChallengeSaving(@Qualifier("householdDatabase") database: ServiceDatabase): GetChallengeSaving =
        GetChallengeSaving(JooqChallengeSavings(database.dsl))

    @Bean
    fun householdMarkSavingContributed(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): MarkSavingContributed =
        MarkSavingContributed(JooqChallenges(database.dsl), JooqChallengeSavings(database.dsl), clock)

    // ---------- 고정비 찾기(가계부 S1e) ----------

    @Bean
    fun householdHideFixedCost(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): HideFixedCost =
        HideFixedCost(JooqSpendingPatterns(database.dsl), clock)

    @Bean
    fun householdShowFixedCost(@Qualifier("householdDatabase") database: ServiceDatabase): ShowFixedCost = ShowFixedCost(JooqSpendingPatterns(database.dsl))

    // ---------- 이야기 카드(가계부 S1g) ----------

    @Bean
    fun householdGetStory(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): GetStory =
        GetStory(JooqStories(database.dsl), JooqCustomCategories(database.dsl), clock)

    // ---------- 리볼빙 · 사람 장부(가계부 S1h) ----------

    @Bean
    fun householdListRevolving(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): ListRevolving =
        ListRevolving(JooqRevolvingPlans(database.dsl), clock)

    @Bean
    fun householdAddRevolving(@Qualifier("householdDatabase") database: ServiceDatabase, list: ListRevolving, clock: Clock): AddRevolving =
        AddRevolving(JooqRevolvingPlans(database.dsl), list, clock)

    @Bean
    fun householdEditRevolving(@Qualifier("householdDatabase") database: ServiceDatabase, list: ListRevolving, clock: Clock): EditRevolving =
        EditRevolving(JooqRevolvingPlans(database.dsl), list, clock)

    @Bean
    fun householdEndRevolving(@Qualifier("householdDatabase") database: ServiceDatabase, list: ListRevolving, clock: Clock): EndRevolving =
        EndRevolving(JooqRevolvingPlans(database.dsl), list, clock)

    @Bean
    fun householdGetPeople(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): GetPeople =
        GetPeople(JooqPersonEntries(database.dsl), JooqOccasionEnvelopes(database.dsl), clock)

    @Bean
    fun householdAddPersonEntry(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): AddPersonEntry =
        AddPersonEntry(JooqPersonEntries(database.dsl), clock)

    @Bean
    fun householdEditPersonEntry(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): EditPersonEntry =
        EditPersonEntry(JooqPersonEntries(database.dsl), clock)

    @Bean
    fun householdDeletePersonEntry(@Qualifier("householdDatabase") database: ServiceDatabase): DeletePersonEntry =
        DeletePersonEntry(JooqPersonEntries(database.dsl))

    @Bean
    fun householdSetOccasionEnvelope(@Qualifier("householdDatabase") database: ServiceDatabase, clock: Clock): SetOccasionEnvelope =
        SetOccasionEnvelope(JooqPersonEntries(database.dsl), JooqOccasionEnvelopes(database.dsl), clock)

    /** 월 화면과 쓰기가 같은 계산 — 빈이 아니라 조립 함수(상태 없음) */
    private fun fixedCostReader(database: ServiceDatabase) = FixedCostReader(JooqSpendingPatterns(database.dsl), JooqRecurringTemplates(database.dsl))

    companion object {
        const val SCHEMA = "household"
    }
}
