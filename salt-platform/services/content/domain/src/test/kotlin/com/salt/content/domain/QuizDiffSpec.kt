package com.salt.content.domain

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldStartWith
import java.time.Instant

/**
 * 금융 팁 S2b — 퀴즈(FR-8) · 줄 diff(FR-7). 불변식:
 * 1. 퀴즈 네 칸은 다 있거나 다 없다 — 일부만 있으면 글이 되지 못한다(반쯤 발행 0)
 * 2. 정답 번호는 보기 안에 · 보기 2~4개 · 같은 보기 0 · 퀴즈 문장도 법적 선을 지난다
 * 3. 채점은 보기 밖 번호를 거절한다 — 정답 판정은 서버 한 곳
 * 4. diff 는 바뀐 줄만 — 같은 두 판이면 빈 목록, 앞 판을 모르면 null(모른다 ≠ 안 바뀌었다)
 * 5. 검수일만 바뀐 판은 줄을 내지 않는다(제도가 바뀐 것만 보인다)
 */
class QuizDiffSpec : StringSpec({
    val quiz = mapOf(
        "quiz_question" to "결혼세액공제는 어느 날을 기준으로 할까요?",
        "quiz_choices" to "예식일 | 혼인신고일 | 청첩장을 보낸 날",
        "quiz_answer" to "2",
        "quiz_explain" to "예식일이 아니라 혼인신고일이 기준이에요.",
    )

    fun source(front: Map<String, String> = emptyMap(), drop: Set<String> = emptySet(), body: String = "## 무엇인가\n\n혼인신고를 한 해에 세금에서 50만 원을 덜 낼 수 있어요.\n\n- 한 사람에 한 번\n- 혼인신고일 기준"): String {
        val base = linkedMapOf(
            "title" to "결혼하면 세금에서 빼 주는 돈",
            "summary" to "혼인신고한 해에 한 사람 50만 원까지 세금이 줄어요.",
            "source_url" to "https://www.law.go.kr/법령/조세특례제한법",
            "source_name" to "국가법령정보센터",
            "written_on" to "2026-11-05",
            "reviewed_on" to "2026-11-05",
            "base_year" to "2026",
            "valid_until" to "2026-12-31",
        )
        base.putAll(front)
        drop.forEach { base.remove(it) }
        return "---\n" + base.entries.joinToString("\n") { "${it.key}: ${it.value}" } + "\n---\n" + body
    }

    fun check(raw: String) = PublishCheck.check("marriage-tax-credit", raw)

    fun problems(raw: String) = (check(raw) as PublishCheck.Outcome.Rejected).problems

    fun tip(raw: String) = (check(raw) as PublishCheck.Outcome.Ok).tip

    "퀴즈 네 칸이 다 있으면 글에 붙는다 — 정답은 0부터로 바뀐다" {
        val q = tip(source(quiz)).quiz!!
        q.choices shouldBe listOf("예식일", "혼인신고일", "청첩장을 보낸 날")
        q.answerIndex shouldBe 1
    }

    "퀴즈가 하나도 없으면 퀴즈 없는 글" {
        tip(source()).quiz.shouldBeNull()
    }

    "네 칸 중 하나만 빠져도 발행 실패 — 각 칸" {
        TipQuiz.KEYS.forEach { key ->
            problems(source(quiz - key)).any { it.startsWith("$key: 없음") } shouldBe true
        }
    }

    "정답 번호 · 보기 개수 · 같은 보기 · 길이 경계" {
        // 허용 · 거절 경계표 — (덮을 칸, 통과해야 하는가)
        val table = listOf(
            mapOf("quiz_answer" to "1") to true,
            mapOf("quiz_answer" to "3") to true,
            mapOf("quiz_answer" to "0") to false,
            mapOf("quiz_answer" to "4") to false,
            mapOf("quiz_answer" to "둘") to false,
            mapOf("quiz_choices" to "예식일 | 혼인신고일", "quiz_answer" to "2") to true,
            mapOf("quiz_choices" to "혼인신고일", "quiz_answer" to "1") to false,
            mapOf("quiz_choices" to "가 | 나 | 다 | 라", "quiz_answer" to "4") to true,
            mapOf("quiz_choices" to "가 | 나 | 다 | 라 | 마", "quiz_answer" to "1") to false,
            mapOf("quiz_choices" to "예식일 |  | 혼인신고일") to false,
            mapOf("quiz_choices" to "예식일 | 예식일 | 혼인신고일") to false,
            mapOf("quiz_question" to "가".repeat(TipQuiz.QUESTION_MAX)) to true,
            mapOf("quiz_question" to "가".repeat(TipQuiz.QUESTION_MAX + 1)) to false,
            mapOf("quiz_explain" to "가".repeat(TipQuiz.EXPLAIN_MAX + 1)) to false,
            mapOf("quiz_choices" to "가".repeat(TipQuiz.CHOICE_MAX + 1) + " | 나", "quiz_answer" to "2") to false,
        )
        table.forEach { (patch, passes) ->
            (check(source(quiz + patch)) is PublishCheck.Outcome.Ok) shouldBe passes
        }
    }

    "퀴즈 문장도 법적 선 — 문제 · 보기 · 풀이에 금지 문장을 끼우면 실패(변이)" {
        listOf(
            "quiz_question" to "지금 가입하세요, 어느 날이 기준일까요?",
            "quiz_explain" to "혼인신고일 기준이에요. https://example.com 에서 신청",
            "quiz_choices" to "예식일 | 혼인신고일 | 지금 당장 가입하세요",
        ).forEach { (key, text) ->
            problems(source(quiz + (key to text))).any { it.startsWith("법적 선") } shouldBe true
        }
    }

    "화면 경로 slug(cards)는 글이 되지 못한다" {
        (PublishCheck.check("cards", source()) as PublishCheck.Outcome.Rejected).problems.any { it.startsWith("slug: cards") } shouldBe true
    }

    "채점 — 정답 · 오답 · 보기 밖 번호 거절" {
        val q = tip(source(quiz)).quiz!!
        q.grade(1).correct shouldBe true
        q.grade(0).correct shouldBe false
        q.grade(0).answerIndex shouldBe 1
        shouldThrow<InvalidQuizChoice> { q.grade(3) }
        shouldThrow<InvalidQuizChoice> { q.grade(-1) }
    }

    "줄 diff — 같으면 빈 목록 · 바뀐 줄만 · 순서 유지" {
        LineDiff.of(listOf("a", "b"), listOf("a", "b")).shouldBeEmpty()
        LineDiff.of(listOf("a", "b", "c"), listOf("a", "x", "c")) shouldBe
            listOf(LineDiff.Change(LineDiff.Op.REMOVED, "b"), LineDiff.Change(LineDiff.Op.ADDED, "x"))
        LineDiff.of(emptyList(), listOf("a")) shouldBe listOf(LineDiff.Change(LineDiff.Op.ADDED, "a"))
        LineDiff.of(listOf("a"), emptyList()) shouldBe listOf(LineDiff.Change(LineDiff.Op.REMOVED, "a"))
        LineDiff.of(listOf("a", "b", "c"), listOf("c", "a")).orEmpty().filter { it.op == LineDiff.Op.ADDED }.size shouldBe 1
    }

    "줄 diff — 너무 큰 판은 비교하지 않는다(null)" {
        val big = (1..600).map { "줄 $it" }
        LineDiff.of(big, big + "끝").shouldBeNull()
    }

    "이력 diff — 첫 판 · 줄을 모르는 판은 null, 유효기한 연장은 그 줄만" {
        val v1 = tip(source())
        val v2 = tip(source(mapOf("valid_until" to "2027-12-31", "reviewed_on" to "2026-12-01")))
        val now = Instant.parse("2026-12-01T00:00:00Z")
        val revisions = listOf(
            Tips.Revision("t", now, "연장", "h1", v2.revisionLines()),
            Tips.Revision("t", now.minusSeconds(60), "본문 수정", "h0", v1.revisionLines()),
            Tips.Revision("t", now.minusSeconds(120), "S2b 전", null, null),
        )
        val diffs = LineDiff.forRevisions(revisions)
        diffs[0] shouldBe listOf(LineDiff.Change(LineDiff.Op.REMOVED, "유효기한: 2026-12-31"), LineDiff.Change(LineDiff.Op.ADDED, "유효기한: 2027-12-31"))
        diffs[1].shouldBeNull()
        diffs[2].shouldBeNull()
    }

    "검수일만 바뀐 판은 줄이 같다 · 퀴즈만 더한 판도 같다" {
        val base = tip(source()).revisionLines()
        tip(source(mapOf("reviewed_on" to "2026-12-01"))).revisionLines() shouldBe base
        tip(source(quiz)).revisionLines() shouldBe base
        base shouldContain "한 사람에 한 번"
        base.first() shouldStartWith "제목: "
    }
})
