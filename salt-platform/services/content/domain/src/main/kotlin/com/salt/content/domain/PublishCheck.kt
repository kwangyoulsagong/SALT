package com.salt.content.domain

import java.net.URI
import java.time.LocalDate

/**
 * 원문 파일 한 개 → [Tip] 또는 문제 목록(`SRV-REQ-047` FR-1 · FR-5). **하나라도 문제가 있으면 글이 되지 못한다** — 반쯤 발행은 없다.
 *
 * 파일 모양(레포 `tips/<slug>.md`):
 * ```
 * ---
 * title: …            summary: …          source_url: https://…go.kr/…   source_name: …
 * written_on: 2026-11-05   reviewed_on: 2026-11-05   base_year: 2026   valid_until: 2026-12-31
 * triggers: goal_created:wedding, month:12     contexts: savings, home     change: (바뀐 판만)
 * quiz_question: …   quiz_choices: 보기1 | 보기2 | 보기3   quiz_answer: 2(1부터)   quiz_explain: …   (넷 다 있거나 다 없거나, FR-8)
 * ---
 * ## 제목줄
 * 문단(빈 줄로 나눈다)
 * - 목록
 * ```
 * 마크다운 전부가 아니라 이 세 가지만 읽는다 — 링크 · HTML · 강조 문법은 본문에 없다(링크는 출처 한 칸뿐, [LegalLine] 이 본문 URL 을 막는다).
 */
object PublishCheck {
    val REQUIRED = listOf("title", "summary", "source_url", "source_name", "written_on", "reviewed_on", "base_year", "valid_until")
    private val SLUG = Regex("[a-z0-9]+(-[a-z0-9]+)*")

    /** 팁 zone 이 `/tips/<slug>` 옆에 둔 화면 경로 — 글 slug 로 쓰면 글이 가려진다(맞힌 카드 `/tips/cards`, S2b) */
    val RESERVED_SLUGS = setOf("cards")
    private const val TITLE_MAX = 60
    private const val SUMMARY_MAX = 140

    sealed interface Outcome {
        data class Ok(val tip: Tip) : Outcome

        data class Rejected(val slug: String, val problems: List<String>) : Outcome
    }

    fun check(slug: String, raw: String): Outcome {
        val problems = mutableListOf<String>()
        if (!SLUG.matches(slug)) problems += "slug: 소문자 · 숫자 · 하이픈만"
        if (slug in RESERVED_SLUGS) problems += "slug: $slug 는 화면 경로라 쓸 수 없다(/tips/$slug)"
        val (front, bodyText) = split(raw) ?: return Outcome.Rejected(slug, listOf("머리 블록(--- … ---)이 없다"))

        REQUIRED.filter { front[it].isNullOrBlank() }.forEach { problems += "$it: 없음" }
        val writtenOn = date(front, "written_on", problems)
        val reviewedOn = date(front, "reviewed_on", problems)
        val validUntil = date(front, "valid_until", problems)
        val baseYear = front["base_year"]?.toIntOrNull()
        if (front["base_year"] != null && (baseYear == null || baseYear !in 2000..2100)) problems += "base_year: 연도가 아니다"
        if (writtenOn != null && reviewedOn != null && reviewedOn.isBefore(writtenOn)) problems += "reviewed_on: 작성일보다 앞선다"
        if (reviewedOn != null && validUntil != null && validUntil.isBefore(reviewedOn)) problems += "valid_until: 검수일보다 앞선다"
        val title = front["title"].orEmpty()
        val summary = front["summary"].orEmpty()
        if (title.length > TITLE_MAX) problems += "title: ${TITLE_MAX}자 초과"
        if (summary.length > SUMMARY_MAX) problems += "summary: ${SUMMARY_MAX}자 초과"
        front["source_url"]?.takeIf { it.isNotBlank() }?.let { if (!LegalLine.officialSource(it)) problems += "source_url: 공식 출처(법령 · 정부 · 공공기관 https)가 아니다" }

        val triggers = list(front["triggers"]).mapNotNull { key -> TriggerKind.parse(key) ?: null.also { problems += "triggers: 모르는 트리거 $key" } }
        val contexts = list(front["contexts"]).mapNotNull { key -> TipContext.parse(key) ?: null.also { problems += "contexts: 모르는 맥락 $key" } }.toSet()
        if (triggers.isNotEmpty() && contexts.isEmpty()) problems += "contexts: 트리거가 있으면 뜰 화면이 있어야 한다"

        val body = blocks(bodyText)
        if (body.none { it is TipBlock.Paragraph }) problems += "본문: 문단이 없다"
        val quiz = quiz(front, problems)

        // 법적 선 — 제목 · 요약 · 본문 · 변경 요약 · 퀴즈 전부. 문장마다 어느 규칙인지 적는다(검수자가 고칠 자리를 안다)
        (listOf(title, summary) + listOfNotNull(front["change"]) + body.flatMap { it.texts() } + quiz?.texts().orEmpty()).forEach { text ->
            LegalLine.violations(text).forEach { problems += "법적 선 ${it.key}: $text" }
        }

        if (problems.isNotEmpty()) return Outcome.Rejected(slug, problems)
        return Outcome.Ok(
            Tip(
                slug = slug,
                meta = TipMeta(title, summary, front.getValue("source_url"), front.getValue("source_name"), writtenOn!!, reviewedOn!!, baseYear!!, validUntil!!),
                body = body,
                triggers = triggers,
                contexts = contexts,
                change = front["change"]?.takeIf { it.isNotBlank() },
                contentHash = ContentHash.of(raw),
                quiz = quiz,
            ),
        )
    }

    private fun split(raw: String): Pair<Map<String, String>, String>? {
        val lines = raw.replace("\r\n", "\n").lines()
        if (lines.firstOrNull()?.trim() != "---") return null
        val end = lines.drop(1).indexOfFirst { it.trim() == "---" }.takeIf { it >= 0 }?.plus(1) ?: return null
        val front = lines.subList(1, end).filter { it.contains(':') }.associate { line ->
            line.substringBefore(':').trim() to line.substringAfter(':').trim()
        }
        return front to lines.drop(end + 1).joinToString("\n")
    }

    private fun date(front: Map<String, String>, key: String, problems: MutableList<String>): LocalDate? {
        val raw = front[key]?.takeIf { it.isNotBlank() } ?: return null
        return runCatching { LocalDate.parse(raw) }.getOrNull() ?: null.also { problems += "$key: YYYY-MM-DD 가 아니다" }
    }

    /** 퀴즈 네 칸(FR-8) — 하나도 없으면 null, 일부만 있으면 문제. 보기 2~4개 · 정답은 1부터 보기 수까지 · 길이 상한 */
    private fun quiz(front: Map<String, String>, problems: MutableList<String>): TipQuiz? {
        val present = TipQuiz.KEYS.filter { !front[it].isNullOrBlank() }
        if (present.isEmpty()) return null
        if (present.size < TipQuiz.KEYS.size) {
            (TipQuiz.KEYS - present.toSet()).forEach { problems += "$it: 없음 — 퀴즈 네 칸은 다 있거나 다 없어야 한다" }
            return null
        }
        val before = problems.size
        val question = front.getValue("quiz_question")
        val choices = front.getValue("quiz_choices").split(TipQuiz.CHOICE_SEPARATOR).map { it.trim() }
        val explanation = front.getValue("quiz_explain")
        if (question.length > TipQuiz.QUESTION_MAX) problems += "quiz_question: ${TipQuiz.QUESTION_MAX}자 초과"
        if (explanation.length > TipQuiz.EXPLAIN_MAX) problems += "quiz_explain: ${TipQuiz.EXPLAIN_MAX}자 초과"
        if (choices.size !in TipQuiz.CHOICES) problems += "quiz_choices: 보기는 ${TipQuiz.CHOICES.first}~${TipQuiz.CHOICES.last}개(| 로 나눈다)"
        if (choices.any { it.isEmpty() }) problems += "quiz_choices: 빈 보기"
        if (choices.any { it.length > TipQuiz.CHOICE_MAX }) problems += "quiz_choices: 보기 하나 ${TipQuiz.CHOICE_MAX}자 초과"
        if (choices.toSet().size != choices.size) problems += "quiz_choices: 같은 보기가 둘"
        val answer = front.getValue("quiz_answer").toIntOrNull()
        if (answer == null || answer !in 1..choices.size) problems += "quiz_answer: 1부터 보기 수까지의 번호"
        if (problems.size > before) return null
        return TipQuiz(question, choices, answer!! - 1, explanation)
    }

    private fun list(raw: String?): List<String> = raw.orEmpty().split(',').map { it.trim() }.filter { it.isNotEmpty() }

    private fun blocks(text: String): List<TipBlock> {
        val out = mutableListOf<TipBlock>()
        text.split(Regex("\n\\s*\n")).map { it.trim() }.filter { it.isNotEmpty() }.forEach { chunk ->
            val lines = chunk.lines().map { it.trim() }
            when {
                lines.size == 1 && lines[0].startsWith("## ") -> out += TipBlock.Heading(lines[0].removePrefix("## ").trim())
                lines.all { it.startsWith("- ") } -> out += TipBlock.Bullets(lines.map { it.removePrefix("- ").trim() })
                else -> out += TipBlock.Paragraph(lines.joinToString(" "))
            }
        }
        return out
    }

    /** 출처 주소의 호스트 — 응답 · 화면이 "어디로 가는 링크인지" 보여 줄 때 */
    fun hostOf(url: String): String? = runCatching { URI(url).host }.getOrNull()
}
