package com.salt.coach

import com.salt.app.SaltDbProperties
import com.salt.support.messaging.OutboxSource
import com.salt.support.persistence.PersonalData
import com.salt.support.persistence.UserRows
import com.salt.support.persistence.ServiceDatabase
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * coach 발행 창구(`SRV-REQ-048` FR-5, 서버 S2c). coach 는 S6 까지 Express 다 — Express 가 `coach.outbox` 에 행을 쓰고(판단 변화),
 * 여기서는 **릴레이 원천만** 내놓는다: svc_coach 로 Flyway(아웃박스 표) + `OutboxRelay` 가 보낸다. 쓰기(`OutboxWriter`) · 유스케이스 0.
 * 이렇게 Express 에 브로커 클라이언트 · 릴레이를 새로 두지 않는다(S6 에 지울 코드가 안 생긴다).
 */
@Configuration(proxyBeanMethods = false)
class CoachComposition {
    @Bean(destroyMethod = "close")
    fun coachDatabase(db: SaltDbProperties): ServiceDatabase = ServiceDatabase.open(SCHEMA, db.connection(SCHEMA), poolSize = 2)

    @Bean
    fun coachOutboxSource(@Qualifier("coachDatabase") database: ServiceDatabase): OutboxSource = OutboxSource(SCHEMA, database.dsl, database.dataSource)

    /**
     * 내 데이터(`SRV-REQ-048` FR-3 · 4, 서버 S3c) — 이 스키마의 사람 행은 Express 가 쓴 판단 변화 이벤트(`coach.DecisionChanged`)뿐.
     * 판단 원장 · 사용자 기록은 S6 전까지 Express(`public`) — 그쪽 지우기는 Express `/api/me/data`.
     */
    @Bean
    fun coachPersonalData(@Qualifier("coachDatabase") database: ServiceDatabase): PersonalData =
        PersonalData(UserRows("coach", database.dsl, listOf(UserRows.outbox()), UserRows.TECHNICAL), database.transactionManager)

    companion object {
        const val SCHEMA = "coach"
    }
}
