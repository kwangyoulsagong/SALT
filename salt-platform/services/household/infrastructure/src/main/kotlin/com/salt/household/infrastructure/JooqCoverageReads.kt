package com.salt.household.infrastructure

import com.salt.household.domain.CoverageReads
import com.salt.household.domain.LandingCoverage
import org.jooq.DSLContext
import org.jooq.exception.DataAccessException
import org.jooq.impl.DefaultConnectionProvider
import java.math.BigDecimal

/**
 * 예측 뷰 읽기(`SRV-REQ-046` FR-8 — 착지 구간 쌓인 적중) — forecast 스키마는 예측(Python)이 주인이고 이 계정은 그 뷰 SELECT 만 있다
 * (Prisma `20261118100000_forecast_personal_projection` 의 GRANT). 표가 아니라 뷰만 읽는다(`db-contract.md` §2).
 *
 * 못 읽으면(뷰 없음 · 권한 · 시간 초과) null — 월 화면은 그 칸만 이유로 답한다. 트랜잭션 안이면 **세이브포인트 안에서** 읽는다:
 * Postgres 는 트랜잭션 안 오류 하나로 그 트랜잭션의 나머지 쿼리를 전부 거절한다 — 월 읽기와 같은 트랜잭션이라 감싸지 않으면
 * 예측 뷰 하나가 월 화면 전체를 500 으로 만든다. 저축 `JooqForecastReads` 와 같은 꼴(서비스 사이 클래스 공유 0 — `msa-services.md` §4).
 */
class JooqCoverageReads(private val dsl: DSLContext) : CoverageReads {
    override fun landingCoverage(): List<LandingCoverage>? = guarded { dsl ->
        dsl.resultQuery(
            "SELECT window_months, intervals, hits, people, nominal FROM forecast.v_personal_coverage WHERE kind = ?",
            "household_landing",
        ).fetch { r ->
            LandingCoverage(
                (r.get(0) as Number).toInt(),
                (r.get(1) as Number).toInt(),
                (r.get(2) as Number).toInt(),
                (r.get(3) as Number).toInt(),
                BigDecimal((r.get(4) as Number).toString()),
            )
        }
    }

    /** 한 연결에서 — 트랜잭션 안이면 JDBC 세이브포인트로 감싸고, 밖(자동 커밋)이면 그대로 읽는다(세이브포인트는 트랜잭션 밖에서 오류다) */
    private fun <T> guarded(read: (DSLContext) -> T): T? = dsl.connectionResult { conn ->
        val savepoint = if (conn.autoCommit) null else conn.setSavepoint()
        try {
            // 같은 설정(실행 리스너 · 방언)을 물려받는다 — 쿼리 수 계측이 이 읽기를 놓치지 않게
            read(dsl.configuration().derive(DefaultConnectionProvider(conn)).dsl()).also { savepoint?.let { conn.releaseSavepoint(it) } }
        } catch (e: DataAccessException) {
            savepoint?.let { conn.rollback(it) }
            // 삼키지 않고 남긴다 — 영구 "unavailable" 로 숨지 않게(SQL 상태만, 금액 · 사람 0)
            log.log(System.Logger.Level.WARNING, "forecast view read failed: ${e.sqlState()}")
            null
        }
    }

    companion object {
        private val log: System.Logger = System.getLogger(JooqCoverageReads::class.java.name)
    }
}
