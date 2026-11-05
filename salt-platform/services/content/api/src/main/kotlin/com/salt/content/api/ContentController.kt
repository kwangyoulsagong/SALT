package com.salt.content.api

import com.salt.content.application.AnswerQuiz
import com.salt.content.application.DismissTip
import com.salt.content.application.GetPolicyParam
import com.salt.content.application.GetTip
import com.salt.content.application.GradeQuiz
import com.salt.content.application.ListQuizCards
import com.salt.content.application.ListTips
import com.salt.content.application.TipForMe
import com.salt.content.domain.Tip
import com.salt.content.domain.TipBlock
import com.salt.content.domain.TipStatus
import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

/**
 * 금융 팁 HTTP(`SRV-REQ-047`, 금융 팁 S2a). 공개 경로(`/api/content/tips` · `/api/content/policy-params`)는 인증 없음 —
 * `salt.auth.public-paths` 에 있다. 개인 경로는 `/api/content/me/…` 아래로 따로 둬 공개 규칙이 개인 경로를 덮지 않게 했다.
 *
 * 공개 응답에 사용자 데이터 0. 문구는 원문 그대로(글쓴이 문장) — 상태는 키(`published` · `needs_check`)로만.
 */
@Tag(name = "content", description = "금융 팁 · 제도 파라미터(SRV-REQ-047)")
@RestController
@RequestMapping("/api/content")
class ContentController(
    private val listTips: ListTips,
    private val getTip: GetTip,
    private val tipForMe: TipForMe,
    private val dismissTip: DismissTip,
    private val getPolicyParam: GetPolicyParam,
    private val gradeQuiz: GradeQuiz,
    private val answerQuiz: AnswerQuiz,
    private val listQuizCards: ListQuizCards,
) {
    data class Meta(
        val sourceUrl: String,
        val sourceName: String,
        val writtenOn: String,
        val reviewedOn: String,
        val baseYear: Int,
        val validUntil: String,
    )

    data class Summary(val slug: String, val title: String, val summary: String, val status: String, val noindex: Boolean, val meta: Meta)

    data class TipList(val public: Boolean, val tips: List<Summary>)

    data class Block(val type: String, val text: String?, val items: List<String>?)

    /** 바뀐 줄(FR-7) — op = removed · added. 줄은 문장 그대로 */
    data class Change(val op: String, val text: String)

    /** [changes] — 앞 판과 바뀐 줄. 첫 판 · S2b 전 이력이면 null(요약만), 상태만 바뀐 판이면 [] */
    data class Revision(val revisedAt: String, val summary: String, val changes: List<Change>?)

    /** 읽기 전에 맞혀 보기(FR-8) — **정답 · 풀이 없음**(고른 뒤 채점 응답에만) */
    data class Quiz(val question: String, val choices: List<String>)

    data class Detail(
        val slug: String,
        val title: String,
        val summary: String,
        val status: String,
        val noindex: Boolean,
        val meta: Meta,
        val body: List<Block>,
        val revisions: List<Revision>,
        val quiz: Quiz?,
    )

    data class Timely(val slug: String, val title: String, val summary: String, val trigger: String, val sourceUrl: String, val sourceName: String, val validUntil: String)

    data class ForMe(val tip: Timely?)

    data class Dismissed(val slug: String, val dismissed: Boolean)

    /** 보기 번호 — 0부터 */
    data class QuizChoice(@field:NotNull @field:Min(0) @field:Max(9) val choice: Int?)

    data class Graded(val correct: Boolean, val answer: Int, val explanation: String)

    /** [collected] — 이번 풀이로 처음 카드가 됐다(화면이 한 번만 말한다) */
    data class Answered(val correct: Boolean, val answer: Int, val explanation: String, val collected: Boolean)

    /** 맞힌 카드 한 장 — 문제 · 정답 보기 · 풀이(배운 것 한 줄) */
    data class Card(val slug: String, val title: String, val question: String, val answer: String, val explanation: String, val collectedAt: String)

    /** [available] — 지금 풀 수 있는 문제 수(모음의 분모) */
    data class Cards(val available: Int, val cards: List<Card>)

    data class Param(
        val key: String,
        val validFrom: String,
        val validTo: String?,
        /** NUMERIC 그대로 문자열 — 비율(0.40)도 있어 원 단위로 반올림하지 않는다 */
        val value: String?,
        val text: String?,
        val unit: String,
        val sourceUrl: String,
        val asOf: String,
    )

    @Operation(summary = "공개 글 목록", description = "법무 확인 전(공개 플래그 꺼짐)이면 public=false · tips=[]")
    @GetMapping("/tips")
    fun list(): ResponseEntity<ApiResponse<TipList>> {
        val view = listTips.execute()
        return ApiResponse.ok(TipList(view.public, view.items.map { summary(it.tip, it.status) }))
    }

    @Operation(summary = "공개 글 하나", description = "본문은 구조(제목줄 · 문단 · 목록)로 — HTML 0. 확인 필요 글은 noindex=true. 변경 이력은 최근 것 먼저")
    @GetMapping("/tips/{slug}")
    fun detail(@PathVariable slug: String): ResponseEntity<ApiResponse<Detail>> {
        val v = getTip.execute(slug)
        val s = summary(v.tip, v.status)
        return ApiResponse.ok(
            Detail(
                slug = s.slug,
                title = s.title,
                summary = s.summary,
                status = s.status,
                noindex = s.noindex,
                meta = s.meta,
                body = v.tip.body.map(::block),
                revisions = v.revisions.map { r -> Revision(r.revision.at.toString(), r.revision.summary, r.changes?.map { Change(it.op.key, it.text) }) },
                quiz = v.tip.quiz?.let { Quiz(it.question, it.choices) },
            ),
        )
    }

    @Operation(summary = "퀴즈 채점(로그인 없이)", description = "기록 0. 정답 번호(0부터) · 풀이는 이 응답에만. 퀴즈 없는 글 404 TIP_QUIZ_NOT_FOUND · 보기 밖 400")
    @PostMapping("/tips/{slug}/quiz")
    fun grade(@PathVariable slug: String, @Valid @RequestBody body: QuizChoice): ResponseEntity<ApiResponse<Graded>> {
        val g = gradeQuiz.execute(slug, body.choice!!)
        return ApiResponse.ok(Graded(g.correct, g.answerIndex, g.explanation))
    }

    @Operation(summary = "퀴즈 풀이(로그인)", description = "채점 + 기록. 한 번이라도 맞히면 카드 — collected 는 이번에 처음 카드가 됐을 때만 true")
    @PostMapping("/me/quiz/{slug}")
    fun answer(user: AuthenticatedUser, @PathVariable slug: String, @Valid @RequestBody body: QuizChoice): ResponseEntity<ApiResponse<Answered>> {
        val r = answerQuiz.execute(user.userId, slug, body.choice!!)
        return ApiResponse.ok(Answered(r.graded.correct, r.graded.answerIndex, r.graded.explanation, r.collected))
    }

    @Operation(summary = "맞힌 카드 모음", description = "최근 것 먼저. 원문에서 빠진 글의 카드는 숨긴다. 공개 전이면 available=0 · cards=[]")
    @GetMapping("/me/quiz-cards")
    fun cards(user: AuthenticatedUser): ResponseEntity<ApiResponse<Cards>> {
        val v = listQuizCards.execute(user.userId)
        return ApiResponse.ok(
            Cards(
                v.available,
                v.cards.map { c ->
                    val q = c.tip.quiz!!
                    Card(c.tip.slug, c.tip.meta.title, q.question, q.choices[q.answerIndex], q.explanation, c.collectedAt.toString())
                },
            ),
        )
    }

    @Operation(summary = "때맞춘 팁 0~1건", description = "context = home · savings · household. 닫은 글 · 확인 필요 글 제외. 공개 플래그가 꺼져 있으면 tip=null")
    @GetMapping("/me/tip")
    fun forMe(user: AuthenticatedUser, @RequestParam(required = false) context: String?): ResponseEntity<ApiResponse<ForMe>> {
        val pick = tipForMe.execute(user.userId, context)
        return ApiResponse.ok(
            ForMe(
                pick?.let {
                    val m = it.tip.meta
                    Timely(it.tip.slug, m.title, m.summary, it.trigger.key, m.sourceUrl, m.sourceName, m.validUntil.toString())
                },
            ),
        )
    }

    @Operation(summary = "때맞춘 팁 닫기", description = "한 번 닫으면 다시 안 뜬다. 두 번 닫아도 같은 응답")
    @PostMapping("/me/tips/{slug}/dismiss")
    fun dismiss(user: AuthenticatedUser, @PathVariable slug: String): ResponseEntity<ApiResponse<Dismissed>> {
        dismissTip.execute(user.userId, slug)
        return ApiResponse.ok(Dismissed(slug, true))
    }

    @Operation(summary = "제도 파라미터 — 키 · 기준일", description = "on 이 없으면 오늘(KST). 저축 · 가계부 계산이 읽는다")
    @GetMapping("/policy-params/{key}")
    fun policyParam(@PathVariable key: String, @RequestParam(required = false) on: String?): ResponseEntity<ApiResponse<Param>> {
        val day = on?.let { runCatching { LocalDate.parse(it) }.getOrNull() ?: throw InvalidDay(it) } ?: LocalDate.now(KST)
        val p = getPolicyParam.execute(key, day)
        return ApiResponse.ok(Param(p.key, p.validFrom.toString(), p.validTo?.toString(), p.value?.toPlainString(), p.text, p.unit, p.sourceUrl, p.asOf.toString()))
    }

    private fun summary(tip: Tip, status: TipStatus): Summary {
        val m = tip.meta
        return Summary(
            slug = tip.slug,
            title = m.title,
            summary = m.summary,
            status = status.key,
            noindex = status == TipStatus.NEEDS_CHECK,
            meta = Meta(m.sourceUrl, m.sourceName, m.writtenOn.toString(), m.reviewedOn.toString(), m.baseYear, m.validUntil.toString()),
        )
    }

    private fun block(b: TipBlock): Block = when (b) {
        is TipBlock.Heading -> Block("heading", b.text, null)
        is TipBlock.Paragraph -> Block("paragraph", b.text, null)
        is TipBlock.Bullets -> Block("bullets", null, b.items)
    }

    private class InvalidDay(raw: String) : DomainError("INVALID_DATE", ErrorKind.INVALID, "on must be YYYY-MM-DD", mapOf("on" to raw))

    private companion object {
        val KST: java.time.ZoneId = java.time.ZoneId.of("Asia/Seoul")
    }
}
