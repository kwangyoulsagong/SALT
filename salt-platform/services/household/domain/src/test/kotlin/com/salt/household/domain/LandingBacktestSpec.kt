package com.salt.household.domain

import com.salt.kernel.Money
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.doubles.shouldBeGreaterThan
import io.kotest.matchers.doubles.shouldBeLessThan
import java.math.BigDecimal
import java.time.LocalDate
import java.time.YearMonth

/**
 * 착지 구간 백테스트(`SRV-REQ-046` 수용 기준 4 — "지난 3개월 표본 결과 기록"). 실사용 기록이 아직 없어 **생활 꼴 셋을 흉내 낸 날별 지출**
 * (고정 난수 — 다시 돌려도 같은 값)로 잰다: 6개월을 만들고 뒤 3개월의 매일 아침(오늘 시작 기준)에 구간을 내 그 달 실제 합이 안에 드는지.
 * 이름표는 10 · 90% 구간이라 80% 안팎이 정상이다. 결과는 표준 출력 · 루트 체크리스트에 적는다.
 * 길게 보려면 `BT_MONTHS=39 ./gradlew :services:household:domain:test -i` (3개월은 한 달 안 적중끼리 강하게 얽혀 흔들린다 — 36개월이 보정 판정 기준).
 */
class LandingBacktestSpec : StringSpec({
    /** 고정 시드 선형 합동 난수 — 테스트가 매번 같은 표본을 쓴다 */
    class Lcg(private var state: Long) {
        fun next(): Double {
            state = (state * 6364136223846793005L + 1442695040888963407L)
            return ((state ushr 11).toDouble() / (1L shl 53).toDouble())
        }
    }

    data class Profile(val name: String, val daily: (LocalDate, Lcg) -> Long)

    val profiles = listOf(
        // 날마다 작은 지출 + 가끔 큰 지출
        Profile("steady") { _, r ->
            val u = r.next()
            when {
                u < 0.15 -> 0
                u < 0.80 -> 8_000 + (r.next() * 20_000).toLong()
                u < 0.95 -> 40_000 + (r.next() * 60_000).toLong()
                else -> 150_000 + (r.next() * 200_000).toLong()
            }
        },
        // 주말에 몰아 쓰는 사람
        Profile("weekend") { d, r ->
            val weekend = d.dayOfWeek.value >= 6
            if (weekend) 60_000 + (r.next() * 120_000).toLong() else if (r.next() < 0.5) 0 else 6_000 + (r.next() * 9_000).toLong()
        },
        // 매달 1일 월세 + 평소 지출(고정비가 창 합을 흔드는 경우)
        Profile("rent") { d, r -> (if (d.dayOfMonth == 1) 600_000L else 0L) + if (r.next() < 0.3) 0 else 10_000 + (r.next() * 25_000).toLong() },
    )

    "3개월 백테스트 — 생활 꼴 셋 · 매일 아침 발행 · 구간 적중률" {
        val start = LocalDate.of(2026, 4, 1)
        val months = (3..((System.getenv("BT_MONTHS") ?: "6").toInt() - 1)).map { YearMonth.from(start).plusMonths(it.toLong()) }
        val lines = mutableListOf<String>()
        var allHit = 0
        var allTotal = 0
        profiles.forEachIndexed { i, profile ->
            val rng = Lcg(42L + i)
            val daily = generateSequence(start) { it.plusDays(1) }.takeWhile { it.isBefore(start.plusMonths((System.getenv("BT_MONTHS") ?: "6").toLong())) }
                .associateWith { Money.krw(profile.daily(it, rng)) }
            var hit = 0
            var total = 0
            val byPart = IntArray(3)
            val byPartTotal = IntArray(3)
            months.forEach { ym ->
                val actual = (1..ym.lengthOfMonth()).map { daily.getValue(ym.atDay(it)) }.reduce(Money::plus)
                for (day in 1..ym.lengthOfMonth()) {
                    val today = ym.atDay(day)
                    val before = (1 until day).map { daily.getValue(ym.atDay(it)) }.fold(Money.krw(0), Money::plus)
                    val from = maxOf(start, today.minusDays(90))
                    val history = daily.filterKeys { !it.isBefore(from) && it.isBefore(today) }
                    val l = LandingEngine.project(ym, today, before, history, from)
                    if (l.low == null || l.high == null) continue
                    val inside = actual >= l.low && actual <= l.high
                    val part = when { day <= 10 -> 0; day <= 20 -> 1; else -> 2 }
                    total++
                    byPartTotal[part]++
                    if (inside) {
                        hit++
                        byPart[part]++
                    }
                }
            }
            val rate = { h: Int, t: Int -> if (t == 0) "-" else BigDecimal(h * 100.0 / t).setScale(1, java.math.RoundingMode.HALF_UP).toPlainString() + "%" }
            lines += "${profile.name}: ${rate(hit, total)} ($hit/$total) · 1~10일 ${rate(byPart[0], byPartTotal[0])} · 11~20일 ${rate(byPart[1], byPartTotal[1])} · 21일~ ${rate(byPart[2], byPartTotal[2])}"
            allHit += hit
            allTotal += total
        }
        val overall = allHit.toDouble() / allTotal
        println("[landing-backtest] " + lines.joinToString(" | ") + " | 전체 ${"%.1f".format(overall * 100)}% ($allHit/$allTotal)")
        // 80% 이름표의 넓은 둘레 — 너무 좁거나(과신) 너무 넓으면(쓸모 없음) 깨진다
        overall shouldBeGreaterThan 0.60
        overall shouldBeLessThan 0.97
    }
})
