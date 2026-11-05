package com.salt.content.domain

/**
 * 제도 변경 줄 diff(`SRV-REQ-047` FR-7 · FEATURE-014 FR-7, 금융 팁 S2b) — 한 판의 글을 줄([Tip.revisionLines])로 펴서 앞 판과 비교한다.
 * 바뀐 줄만 낸다(빠진 줄 · 들어온 줄). 같은 줄은 화면에 다시 보이지 않는다 — 본문이 바로 위에 있다.
 *
 * 최장 공통 부분열(LCS). 글 하나가 수십 줄이라 O(n·m) 로 충분하다 — [MAX_CELLS] 를 넘는 판은 비교하지 않고 null(화면은 요약 한 줄만).
 */
object LineDiff {
    enum class Op(val key: String) { REMOVED("removed"), ADDED("added") }

    data class Change(val op: Op, val text: String)

    const val MAX_CELLS = 250_000

    /** @return 바뀐 줄 — 앞 판 순서대로 빠진 줄과 들어온 줄이 섞인다. 너무 큰 판이면 null */
    fun of(before: List<String>, after: List<String>): List<Change>? {
        if (before.size.toLong() * after.size > MAX_CELLS) return null
        // lcs[i][j] = before[i..] 와 after[j..] 의 공통 부분열 길이
        val lcs = Array(before.size + 1) { IntArray(after.size + 1) }
        for (i in before.indices.reversed()) {
            for (j in after.indices.reversed()) {
                lcs[i][j] = if (before[i] == after[j]) lcs[i + 1][j + 1] + 1 else maxOf(lcs[i + 1][j], lcs[i][j + 1])
            }
        }
        val out = mutableListOf<Change>()
        var i = 0
        var j = 0
        while (i < before.size && j < after.size) {
            when {
                before[i] == after[j] -> { i++; j++ }
                lcs[i + 1][j] >= lcs[i][j + 1] -> out += Change(Op.REMOVED, before[i++])
                else -> out += Change(Op.ADDED, after[j++])
            }
        }
        while (i < before.size) out += Change(Op.REMOVED, before[i++])
        while (j < after.size) out += Change(Op.ADDED, after[j++])
        return out
    }

    /**
     * 변경 이력(최근 것 먼저)마다 앞 판과의 diff. 앞 판이 없거나(첫 판) 어느 한쪽 줄을 모르면(S2b 전에 쌓인 이력) null —
     * 화면은 요약 한 줄만 그린다. 상태만 바뀐 판(유효기한 지남)은 빈 목록이다.
     */
    fun forRevisions(revisions: List<Tips.Revision>): List<List<Change>?> =
        revisions.mapIndexed { index, revision ->
            val previous = revisions.getOrNull(index + 1)
            val after = revision.lines
            val before = previous?.lines
            if (after == null || before == null) null else of(before, after)
        }
}
