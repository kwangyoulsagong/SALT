package com.salt.savings.infrastructure

import com.salt.savings.domain.Coverage
import com.salt.savings.domain.ForecastReads
import com.salt.savings.domain.PriceIndexMonth
import org.jooq.DSLContext
import org.jooq.exception.DataAccessException
import org.jooq.impl.DefaultConnectionProvider
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.time.YearMonth

/**
 * 예측 뷰 읽기(`SRV-REQ-045` FR-6 · 10) — forecast 스키마는 예측(Python)이 주인이고 이 계정은 뷰 둘 SELECT 만 있다
 * (Prisma `20261118100000_forecast_personal_projection` 의 GRANT). 표가 아니라 뷰만 읽는다(`db-contract.md` §2).
 *
 * 못 읽으면(뷰 없음 · 권한 · 시간 초과) null — 목표 화면은 그 칸만 이유로 답한다. 트랜잭션 안이면 **세이브포인트 안에서** 읽는다:
 * Postgres 는 트랜잭션 안 오류 하나로 그 트랜잭션의 나머지 쿼리를 전부 거절한다 — 목표 읽기와 같은 트랜잭션이라 감싸지 않으면
 * 예측 뷰 하나가 목표 화면 전체를 500 으로 만든다.
 */
class JooqForecastReads(private val dsl: DSLContext) : ForecastReads {
    override fun savingsCoverage(): List<Coverage>? = guarded { dsl ->
        dsl.resultQuery(
            "SELECT window_months, intervals, hits, people, nominal FROM forecast.v_personal_coverage WHERE kind = ?",
            "savings_reach",
        ).fetch { r ->
            Coverage(
                (r.get(0) as Number).toInt(),
                (r.get(1) as Number).toInt(),
                (r.get(2) as Number).toInt(),
                (r.get(3) as Number).toInt(),
                BigDecimal((r.get(4) as Number).toString()),
            )
        }
    }

    override fun priceIndex(): List<PriceIndexMonth>? = guarded { dsl ->
        dsl.resultQuery("SELECT month, value, base, available_at FROM forecast.v_price_index ORDER BY month").fetch { r ->
            PriceIndexMonth(
                YearMonth.from(r.get(0, java.time.LocalDate::class.java)),
                BigDecimal((r.get(1) as Number).toString()),
                r.get(2, String::class.java),
                r.get(3, OffsetDateTime::class.java).toInstant(),
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
        private val log: System.Logger = System.getLogger(JooqForecastReads::class.java.name)
    }
}
