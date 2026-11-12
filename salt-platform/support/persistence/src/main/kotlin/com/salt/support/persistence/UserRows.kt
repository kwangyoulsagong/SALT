package com.salt.support.persistence

import org.jooq.DSLContext
import org.jooq.JSON
import org.jooq.JSONB
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.time.ZonedDateTime
import java.time.temporal.TemporalAccessor

/**
 * 한 사용자의 행 묶음 하나 — 내 데이터 내보내기 · 계정 삭제(`SRV-REQ-048` FR-3 · 4, 서버 S3c).
 *
 * - [condition] 은 `?` 하나(사용자 id)를 받는 WHERE 조각. 자식 표는 부모를 거쳐 고른다(`goal_id IN (SELECT id FROM goal WHERE user_id = ?)`)
 * - [select] 는 내보낼 열 — 비밀번호 해시처럼 사람에게 돌려주면 안 되는 열을 뺄 때만 바꾼다
 * - [nullify] 가 있으면 지우지 않고 그 열만 비운다(행이 남아야 하는 남의 기록 — 초대 코드는 쓰인 채로 남는다)
 * - [export] false 면 내보내기에서 뺀다 — 지우기는 그래도 한다(아웃박스처럼 사람이 읽을 기록이 아닌 것)
 */
data class UserRowSet(
    val table: String,
    val condition: String = "user_id = ?",
    val select: String = "*",
    val nullify: String? = null,
    val export: Boolean = true,
) {
    init {
        require(table.matches(NAME)) { "표 이름은 소문자 · 밑줄만: $table" }
        require(condition.count { it == '?' } == 1) { "조건의 자리표시는 사용자 id 하나: $table" }
        require(nullify == null || nullify.matches(NAME)) { "비울 열 이름: $nullify" }
    }

    private companion object {
        val NAME = Regex("[a-z][a-z0-9_]*")
    }
}

/** 내보낸 표 하나 — 값은 전부 글자(금액 정밀도 · 시각 모양이 JSON 숫자 변환에서 바뀌지 않게). null 은 null */
data class ExportedTable(val name: String, val columns: List<String>, val rows: List<List<String?>>)

/**
 * 서비스 하나의 "내 행" 목록 — **스키마의 모든 표는 [sets] 이거나 [notPersonal](이유와 함께) 이다.**
 * 새 표를 만들고 여기 적지 않으면 `uncovered` 가 그 이름을 돌려주고 통합 테스트가 깬다 — 지워지지 않는 개인 데이터가 조용히 생기지 않게.
 *
 * 지우기는 [sets] 순서대로(자식 먼저) · 호출하는 쪽 트랜잭션 안에서. 발행 원장(덧붙이기만 — `projection_issued` · `landing_issued`)의
 * DELETE 막는 트리거는 `salt.erase = 'on'` 일 때만 지나간다 — 그 값은 여기서 `SET LOCAL` 로만 켠다(트랜잭션이 끝나면 꺼진다).
 */
class UserRows(
    val service: String,
    private val dsl: DSLContext,
    val sets: List<UserRowSet>,
    val notPersonal: Map<String, String>,
) {
    init {
        val names = sets.map { it.table }
        require(names.toSet().size == names.size) { "$service: 같은 표가 두 번" }
        require(names.none { it in notPersonal }) { "$service: 사용자 표이면서 개인 데이터 아님" }
    }

    fun export(userId: String): List<ExportedTable> =
        sets.filter { it.export }.map { set ->
            val result = dsl.resultQuery("SELECT ${set.select} FROM ${set.table} WHERE ${set.condition} ORDER BY 1", userId).fetch()
            ExportedTable(
                name = set.table,
                columns = result.fields().map { it.name },
                rows = result.map { record -> (0 until record.size()).map { text(record.get(it)) } },
            )
        }

    /** 표마다 지운(비운) 행 수 — 다시 불러도 안전(두 번째는 0) */
    fun erase(userId: String): Map<String, Int> {
        dsl.execute("SET LOCAL salt.erase = 'on'")
        val counts = LinkedHashMap<String, Int>()
        for (set in sets) {
            counts[set.table] = if (set.nullify != null) {
                dsl.execute("UPDATE ${set.table} SET ${set.nullify} = NULL WHERE ${set.condition}", userId)
            } else {
                dsl.execute("DELETE FROM ${set.table} WHERE ${set.condition}", userId)
            }
        }
        return counts
    }

    /** 스키마에 있는데 어느 쪽에도 적히지 않은 표 — 비어 있어야 한다 */
    fun uncovered(): List<String> {
        val known = sets.map { it.table }.toSet() + notPersonal.keys
        return dsl.fetch(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY 1",
        ).map { it.get(0, String::class.java) }.filter { it !in known }
    }

    /** 이 사용자 행이 아직 남은 표(비운 열은 그 열이 아직 이 사람인 행) — 지운 뒤 비어 있어야 한다 */
    fun remaining(userId: String): Map<String, Int> =
        sets.associate { set ->
            val where = if (set.nullify != null) "${set.condition} AND ${set.nullify} IS NOT NULL" else set.condition
            set.table to dsl.fetchValue("SELECT count(*) FROM ${set.table} WHERE $where", userId).toString().toInt()
        }.filterValues { it > 0 }

    companion object {
        /** 모든 서비스에 같은 모양으로 있는 기술 표(`kotlin-platform.md` §4) — 아웃박스는 사용자 id 를 실어 [outbox] 로 따로 */
        val TECHNICAL: Map<String, String> = mapOf(
            "flyway_schema_history" to "마이그레이션 이력",
            "processed_event" to "받은 이벤트 id 뿐(멱등)",
            "shedlock" to "작업 락",
        )

        /** 아웃박스에 실린 이 사람의 이벤트 — 보냈든 아니든 지운다(본문에 금액이 있다). 내보내기에는 넣지 않는다 */
        fun outbox(condition: String = "payload->>'userId' = ?"): UserRowSet = UserRowSet("outbox", condition, export = false)

        private fun text(value: Any?): String? = when (value) {
            null -> null
            is BigDecimal -> value.toPlainString()
            is JSONB -> value.data()
            is JSON -> value.data()
            // 시각은 UTC 로(Express 내보내기 `toISOString` 과 같은 모양) — 세션 시간대(KST)가 붙어 나오면 README 의 "UTC" 가 거짓이 된다
            is OffsetDateTime -> value.toInstant().toString()
            is ZonedDateTime -> value.toInstant().toString()
            is TemporalAccessor -> value.toString()
            is java.sql.Timestamp -> value.toInstant().toString()
            is java.sql.Date -> value.toLocalDate().toString()
            is Array<*> -> value.joinToString(",", "{", "}")
            else -> value.toString()
        }
    }
}
