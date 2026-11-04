package com.salt.support.messaging

import net.javacrumbs.shedlock.core.DefaultLockingTaskExecutor
import net.javacrumbs.shedlock.core.LockingTaskExecutor
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider
import javax.sql.DataSource

/**
 * 서비스 스키마의 `shedlock` 표로 거는 락(`SRV-REQ-043` FR-8) — 스케줄 작업(가계부 반복 워커 등)이 인스턴스 하나에서만 돈다.
 * 릴레이([OutboxRelay])와 같은 표 · 같은 공급자. JDBC 공급자는 이 모듈 안에만 둔다(조립이 구현을 몰라도 되게).
 */
object ServiceLock {
    fun executor(dataSource: DataSource): LockingTaskExecutor = DefaultLockingTaskExecutor(JdbcTemplateLockProvider(dataSource))
}
