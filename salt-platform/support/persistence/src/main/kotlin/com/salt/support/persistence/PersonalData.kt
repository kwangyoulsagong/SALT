package com.salt.support.persistence

import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.support.TransactionTemplate

/**
 * 서비스 하나의 내 데이터 창구 — [UserRows] 를 **그 서비스 트랜잭션 매니저**로 감싼다(`SRV-REQ-048` FR-3 · 4).
 * 서비스 조립(`<Name>Composition`)이 빈으로 내놓고, 앱의 경로 하나(`/api/{service}/me/data`)가 서비스 이름으로 고른다.
 * 서비스끼리 부르지 않는다 — 순서는 BFF 가 정한다(`msa-services.md` §5 "사용자 동작 하나가 두 서비스에 쓴다").
 */
class PersonalData(val rows: UserRows, transactionManager: PlatformTransactionManager) {
    private val tx = TransactionTemplate(transactionManager)
    private val readOnly = TransactionTemplate(transactionManager).apply { isReadOnly = true }

    val service: String get() = rows.service

    /** 한 스냅샷(같은 트랜잭션)으로 읽는다 — 표 사이 시점이 갈리지 않게 */
    fun export(userId: String): List<ExportedTable> = readOnly.execute { rows.export(userId) }

    /** 한 트랜잭션 — 중간에 실패하면 이 서비스 것은 하나도 안 지워진다. 다시 부르면 남은 것만(멱등) */
    fun erase(userId: String): Map<String, Int> = tx.execute { rows.erase(userId) }
}
