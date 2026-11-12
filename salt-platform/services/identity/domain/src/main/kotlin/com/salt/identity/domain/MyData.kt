package com.salt.identity.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import java.time.Instant

/*
 * 내 데이터 — 내보내기 · 계정 삭제(`SRV-REQ-048` FR-3 · 4, 서버 S3c).
 *
 * identity 는 **마지막**이다. 다른 서비스 것은 BFF 가 차례로 지우고(`msa-services.md` §5 — 서비스끼리 부르지 않는다), 다 지운 뒤 계정 행을 지우며
 * 서비스별 행 수를 [DeletionLog] 에 남긴다. 계정이 먼저 사라지면 다시 시도할 길(지우기 허가)이 없어진다.
 */

/** 내보낸 표 하나 — 값은 글자(`support/persistence` `ExportedTable` 과 같은 모양) */
data class PersonalTable(val name: String, val columns: List<String>, val rows: List<List<String?>>)

/** 이 서비스가 가진 그 사람의 행 — 지우기는 다시 불러도 안전(두 번째는 0) */
interface PersonalRecords {
    fun export(userId: String): List<PersonalTable>

    fun erase(userId: String): Map<String, Int>
}

/** 삭제 기록 — 사람을 가리키는 칸 0. 서비스 → 표 → 행 수 */
interface DeletionLog {
    fun record(counts: Map<String, Map<String, Int>>, at: Instant)
}

/** 다시 친 비밀번호가 틀림 — 401 이 아니다(화면이 세션 만료로 읽고 로그인으로 튕기면 안 된다) */
class ReauthFailed : DomainError("REAUTH_FAILED", ErrorKind.FORBIDDEN, "비밀번호가 맞지 않아요")

/**
 * BFF 가 보낸 다른 서비스 행 수 — 기록일 뿐이라 판정에 쓰지 않지만, 표에 들어가는 모양은 지킨다.
 * 이름은 소문자 · 밑줄, 값은 0 이상, 서비스 ≤ 16 · 표 ≤ 64(지금 서비스 7 · 가장 많은 가계부 표 19).
 */
object DeletionCounts {
    private val NAME = Regex("[a-z][a-z0-9_]{0,62}")

    fun validOrNull(counts: Map<String, Map<String, Int>>): Map<String, Map<String, Int>>? {
        if (counts.size > 16) return null
        val ok = counts.all { (service, tables) ->
            NAME.matches(service) && tables.size <= 64 && tables.all { (table, n) -> NAME.matches(table) && n >= 0 }
        }
        return counts.takeIf { ok }
    }
}

class InvalidDeletionCounts : DomainError("INVALID_DELETION_COUNTS", ErrorKind.INVALID, "삭제 행 수 모양이 맞지 않아요")
