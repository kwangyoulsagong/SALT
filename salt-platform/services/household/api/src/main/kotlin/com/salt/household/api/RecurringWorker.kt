package com.salt.household.api

import com.salt.household.application.RunRecurring
import net.javacrumbs.shedlock.core.LockConfiguration
import net.javacrumbs.shedlock.core.LockingTaskExecutor
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import java.time.Clock
import java.time.Duration

/**
 * 반복 예정 워커(`SRV-REQ-046` FR-5, 가계부 S1b 판단 2) — 스케줄 · 락 · 유스케이스 한 번 호출만(`kotlin-platform.md` §3 워커 줄).
 * 매시 5분(KST). 멱등이라 놓친 회차를 다음 시간이 메운다. 락은 household 스키마 `shedlock` 표 — 인스턴스가 늘어도 한 곳만.
 * 로그에 금액 · 사용자 0 — 건수만.
 */
class RecurringWorker(private val runRecurring: RunRecurring, private val lock: LockingTaskExecutor, private val clock: Clock) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(cron = "\${salt.household.recurring-cron:0 5 * * * *}", zone = "Asia/Seoul")
    fun tick() {
        lock.executeWithLock(
            Runnable {
                val r = runRecurring.execute()
                if (r.generated > 0 || r.confirmed > 0) log.info("Household recurring generated={} confirmed={}", r.generated, r.confirmed)
            },
            LockConfiguration(clock.instant(), "household-recurring", Duration.ofMinutes(10), Duration.ofSeconds(30)),
        )
    }
}
