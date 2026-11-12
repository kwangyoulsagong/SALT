package com.salt.content

import com.salt.content.infrastructure.ContentUserRows
import com.salt.support.persistence.PersonalData
import com.salt.app.SaltDbProperties
import com.salt.content.api.ContentWorker
import com.salt.content.api.HouseholdEventsListener
import com.salt.content.api.SavingsEventsListener
import com.salt.content.application.AnswerQuiz
import com.salt.content.application.CONTENT_TX
import com.salt.content.application.ContentSettings
import com.salt.content.application.DismissTip
import com.salt.content.application.GetPolicyParam
import com.salt.content.application.GetTip
import com.salt.content.application.GradeQuiz
import com.salt.content.application.ListQuizCards
import com.salt.content.application.ListTips
import com.salt.content.application.ReadMyNumbers
import com.salt.content.application.RecordSignal
import com.salt.content.application.RunValidityCheck
import com.salt.content.application.SyncCatalog
import com.salt.content.application.TipForMe
import com.salt.content.application.TipLibrary
import com.salt.content.infrastructure.ClasspathCatalog
import com.salt.content.infrastructure.JooqDismissals
import com.salt.content.infrastructure.JooqPolicyParams
import com.salt.content.infrastructure.JooqQuizAnswers
import com.salt.content.infrastructure.JooqTips
import com.salt.content.infrastructure.JooqTriggerRules
import com.salt.content.infrastructure.JooqUserSignals
import com.salt.content.infrastructure.OutboxContentEvents
import com.salt.support.messaging.EventSchemas
import com.salt.support.messaging.EventTopology
import com.salt.support.messaging.OutboxSource
import com.salt.support.messaging.OutboxWriter
import com.salt.support.messaging.ServiceLock
import com.salt.support.messaging.TraceParent
import com.salt.support.persistence.ServiceDatabase
import org.springframework.amqp.core.Declarables
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import tools.jackson.databind.json.JsonMapper
import java.time.Clock

/**
 * 공개 플래그(`SRV-REQ-047` 수용 기준 3). **기본 꺼짐** — 법무 확인 기록(FEATURE-014 열린 질문)이 생기는 날 환경 값 `CONTENT_PUBLIC=true`.
 * 로컬 화면 확인은 그 실행에만 켠다.
 */
@ConfigurationProperties("salt.content")
data class ContentProperties(val publicEnabled: Boolean = false)

/**
 * content 서비스 조립(`SRV-REQ-047`, 금융 팁 S2a) — 이 파일만 네 층을 다 안다(`kotlin-platform.md` §2). 본뜬 곳 `HouseholdComposition`.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(ContentProperties::class)
class ContentComposition {
    @Bean(destroyMethod = "close")
    fun contentDatabase(db: SaltDbProperties): ServiceDatabase = ServiceDatabase.open(SCHEMA, db.connection(SCHEMA))

    @Bean(CONTENT_TX)
    fun contentTx(@Qualifier("contentDatabase") database: ServiceDatabase): PlatformTransactionManager = database.transactionManager

    @Bean
    fun contentOutboxSource(@Qualifier("contentDatabase") database: ServiceDatabase): OutboxSource = OutboxSource(SCHEMA, database.dsl, database.dataSource)

    @Bean
    fun contentOutbox(
        @Qualifier("contentDatabase") database: ServiceDatabase,
        schemas: EventSchemas,
        jsonMapper: JsonMapper,
        traceParent: TraceParent,
        clock: Clock,
    ): OutboxWriter = OutboxWriter(SCHEMA, database.dsl, database.dataSource, schemas, jsonMapper, traceParent, clock)

    @Bean
    fun contentSettings(properties: ContentProperties): ContentSettings = ContentSettings(properties.publicEnabled)

    @Bean
    fun contentTipLibrary(): TipLibrary = TipLibrary()

    @Bean
    fun contentSyncCatalog(
        @Qualifier("contentDatabase") database: ServiceDatabase,
        @Qualifier("contentOutbox") outbox: OutboxWriter,
        library: TipLibrary,
        jsonMapper: JsonMapper,
        clock: Clock,
    ): SyncCatalog = SyncCatalog(
        ClasspathCatalog(jsonMapper), library, JooqTips(database.dsl), JooqTriggerRules(database.dsl), JooqPolicyParams(database.dsl), OutboxContentEvents(outbox), clock,
    )

    @Bean
    fun contentRunValidityCheck(@Qualifier("contentDatabase") database: ServiceDatabase, library: TipLibrary, clock: Clock): RunValidityCheck =
        RunValidityCheck(JooqTips(database.dsl), library, clock)

    @Bean
    fun contentWorker(@Qualifier("contentDatabase") database: ServiceDatabase, sync: SyncCatalog, validity: RunValidityCheck, clock: Clock): ContentWorker =
        ContentWorker(sync, validity, ServiceLock.executor(database.dataSource), clock)

    @Bean
    fun contentListTips(library: TipLibrary, settings: ContentSettings, clock: Clock): ListTips = ListTips(library, settings, clock)

    @Bean
    fun contentGetTip(@Qualifier("contentDatabase") database: ServiceDatabase, library: TipLibrary, settings: ContentSettings, clock: Clock): GetTip =
        GetTip(library, JooqTips(database.dsl), settings, clock)

    @Bean
    fun contentTipForMe(@Qualifier("contentDatabase") database: ServiceDatabase, library: TipLibrary, settings: ContentSettings, clock: Clock): TipForMe =
        TipForMe(library, JooqTriggerRules(database.dsl), JooqUserSignals(database.dsl), JooqDismissals(database.dsl), settings, clock)

    @Bean
    fun contentDismissTip(@Qualifier("contentDatabase") database: ServiceDatabase, library: TipLibrary, clock: Clock): DismissTip =
        DismissTip(library, JooqDismissals(database.dsl), clock)

    @Bean
    fun contentGetPolicyParam(@Qualifier("contentDatabase") database: ServiceDatabase): GetPolicyParam = GetPolicyParam(JooqPolicyParams(database.dsl))

    @Bean
    fun contentGradeQuiz(library: TipLibrary, settings: ContentSettings): GradeQuiz = GradeQuiz(library, settings)

    @Bean
    fun contentAnswerQuiz(@Qualifier("contentDatabase") database: ServiceDatabase, library: TipLibrary, settings: ContentSettings, clock: Clock): AnswerQuiz =
        AnswerQuiz(library, JooqQuizAnswers(database.dsl), settings, clock)

    @Bean
    fun contentListQuizCards(@Qualifier("contentDatabase") database: ServiceDatabase, library: TipLibrary, settings: ContentSettings): ListQuizCards =
        ListQuizCards(library, JooqQuizAnswers(database.dsl), settings)

    @Bean
    fun contentReadMyNumbers(@Qualifier("contentDatabase") database: ServiceDatabase, library: TipLibrary, settings: ContentSettings, clock: Clock): ReadMyNumbers =
        ReadMyNumbers(library, JooqPolicyParams(database.dsl), settings, clock)

    @Bean
    fun contentRecordSignal(@Qualifier("contentDatabase") database: ServiceDatabase): RecordSignal = RecordSignal(JooqUserSignals(database.dsl))

    // 구독 큐는 구독하는 서비스가 선언한다(`EventTopology`)
    @Bean
    fun contentGoalCreatedSubscription(): Declarables = EventTopology.subscription(SavingsEventsListener.SUBSCRIBER, SavingsEventsListener.GOAL_CREATED)

    @Bean
    fun contentGoalReachedSubscription(): Declarables = EventTopology.subscription(SavingsEventsListener.SUBSCRIBER, SavingsEventsListener.GOAL_REACHED)

    @Bean
    fun contentFixedCostIncreasedSubscription(): Declarables =
        EventTopology.subscription(SavingsEventsListener.SUBSCRIBER, HouseholdEventsListener.FIXED_COST_INCREASED)

    @Bean
    fun contentHouseholdEventsListener(record: RecordSignal, jsonMapper: JsonMapper): HouseholdEventsListener = HouseholdEventsListener(record, jsonMapper)

    @Bean
    fun contentSavingsEventsListener(record: RecordSignal, jsonMapper: JsonMapper): SavingsEventsListener = SavingsEventsListener(record, jsonMapper)

    /** 내 데이터 — 내보내기 · 지우기(`SRV-REQ-048` FR-3 · 4, 서버 S3c). 경로는 앱 하나(`MyDataController`) */
    @Bean
    fun contentPersonalData(@Qualifier("contentDatabase") database: ServiceDatabase): PersonalData =
        PersonalData(ContentUserRows.of(database.dsl), database.transactionManager)

    companion object {
        const val SCHEMA = "content"
    }
}
