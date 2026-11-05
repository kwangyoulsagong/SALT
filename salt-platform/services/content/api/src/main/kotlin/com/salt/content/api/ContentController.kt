package com.salt.content.api

import com.salt.content.application.DismissTip
import com.salt.content.application.GetPolicyParam
import com.salt.content.application.GetTip
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
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
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

    data class Revision(val revisedAt: String, val summary: String)

    data class Detail(
        val slug: String,
        val title: String,
        val summary: String,
        val status: String,
        val noindex: Boolean,
        val meta: Meta,
        val body: List<Block>,
        val revisions: List<Revision>,
    )

    data class Timely(val slug: String, val title: String, val summary: String, val trigger: String, val sourceUrl: String, val sourceName: String, val validUntil: String)

    data class ForMe(val tip: Timely?)

    data class Dismissed(val slug: String, val dismissed: Boolean)

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
                revisions = v.revisions.map { Revision(it.at.toString(), it.summary) },
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
