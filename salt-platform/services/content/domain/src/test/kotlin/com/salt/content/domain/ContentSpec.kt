package com.salt.content.domain

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.types.shouldBeInstanceOf
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

/**
 * 금융 팁 S2a — 발행 검사 · 법적 선 · 유효기한 · 때맞춘 팁 · 제도 파라미터. 불변식:
 * 1. 메타 하나라도 없으면 글이 되지 못한다(FR-1)
 * 2. 금지 문장 하나를 끼우면 발행이 실패한다(FR-5 변이) — 고친 문장은 통과한다(오탐 경계)
 * 3. 유효기한 당일은 유효, 다음 날부터 확인 필요(FR-2)
 * 4. 때맞춘 팁은 0~1건 · 닫은 것 · 확인 필요 제외 · 같은 재료면 같은 답(FR-4)
 * 5. 같은 키 구간은 겹치지 않는다(`DB-REQ-039` FR-3)
 */
class ContentSpec : StringSpec({
    fun source(
        front: Map<String, String> = emptyMap(),
        drop: Set<String> = emptySet(),
        body: String = "## 무엇인가\n\n혼인신고를 한 해에 세금에서 50만 원을 덜 낼 수 있어요.\n\n- 한 사람에 한 번\n- 혼인신고일 기준",
    ): String {
        val base = linkedMapOf(
            "title" to "결혼하면 세금에서 빼 주는 돈",
            "summary" to "혼인신고한 해에 한 사람 50만 원까지 세금이 줄어요.",
            "source_url" to "https://www.law.go.kr/법령/조세특례제한법",
            "source_name" to "국가법령정보센터",
            "written_on" to "2026-11-05",
            "reviewed_on" to "2026-11-05",
            "base_year" to "2026",
            "valid_until" to "2026-12-31",
            "triggers" to "goal_created:wedding, month:12",
            "contexts" to "savings, home",
        )
        base.putAll(front)
        drop.forEach { base.remove(it) }
        return "---\n" + base.entries.joinToString("\n") { "${it.key}: ${it.value}" } + "\n---\n" + body
    }

    fun ok(raw: String) = (PublishCheck.check("marriage-tax-credit", raw) as PublishCheck.Outcome.Ok).tip

    fun rejected(raw: String, slug: String = "marriage-tax-credit") =
        (PublishCheck.check(slug, raw) as PublishCheck.Outcome.Rejected).problems

    "메타가 다 있으면 글이 된다 — 본문 세 꼴 · 트리거 · 맥락" {
        val tip = ok(source())
        tip.meta.validUntil shouldBe LocalDate.parse("2026-12-31")
        tip.body.map { it::class.simpleName } shouldBe listOf("Heading", "Paragraph", "Bullets")
        tip.triggers shouldBe listOf(TriggerKind.GOAL_CREATED_WEDDING, TriggerKind.MONTH_12)
        tip.contexts shouldBe setOf(TipContext.SAVINGS, TipContext.HOME)
        tip.contentHash.length shouldBe 64
    }

    "필수 메타 하나라도 빠지면 발행 실패 — 여덟 칸 각각" {
        PublishCheck.REQUIRED.forEach { key ->
            rejected(source(drop = setOf(key))) shouldContain "$key: 없음"
            rejected(source(front = mapOf(key to " "))) shouldContain "$key: 없음"
        }
    }

    "메타 형식 경계 — 날짜 · 연도 · 순서 · 공식 출처 · slug · 머리 블록" {
        rejected(source(front = mapOf("valid_until" to "2026/12/31"))) shouldContain "valid_until: YYYY-MM-DD 가 아니다"
        rejected(source(front = mapOf("base_year" to "26년"))) shouldContain "base_year: 연도가 아니다"
        rejected(source(front = mapOf("reviewed_on" to "2026-11-04"))) shouldContain "reviewed_on: 작성일보다 앞선다"
        rejected(source(front = mapOf("valid_until" to "2026-11-04"))) shouldContain "valid_until: 검수일보다 앞선다"
        // 검수일 당일까지인 글은 된다(경계)
        ok(source(front = mapOf("valid_until" to "2026-11-05"))).meta.validUntil shouldBe LocalDate.parse("2026-11-05")
        rejected(source(front = mapOf("source_url" to "http://www.law.go.kr/x"))).any { it.startsWith("source_url") } shouldBe true
        rejected(source(front = mapOf("source_url" to "https://blog.example.com/tax"))).any { it.startsWith("source_url") } shouldBe true
        rejected(source(), slug = "Marriage_Tax") shouldContain "slug: 소문자 · 숫자 · 하이픈만"
        rejected("제목 없는 글").single() shouldBe "머리 블록(--- … ---)이 없다"
        rejected(source(front = mapOf("triggers" to "goal_created:car"))) shouldContain "triggers: 모르는 트리거 goal_created:car"
        rejected(source(front = mapOf("contexts" to ""))) shouldContain "contexts: 트리거가 있으면 뜰 화면이 있어야 한다"
        rejected(source(body = "## 제목만")) shouldContain "본문: 문단이 없다"
    }

    "법적 선 변이 — 금지 문장 하나를 본문에 끼우면 실패, 고친 문장은 통과" {
        val table = listOf(
            "국민은행 적금이 이 제도와 같이 쓰기 좋아요." to "product_name",
            "아무개증권 계좌로 받는 사람도 있어요." to "product_name",
            "적금 추천 순위를 같이 봐요." to "product_name",
            "금리 비교를 해 보면 차이가 커요." to "rate_comparison",
            "연 4.5% 금리 상품도 있어요." to "rate_comparison",
            "가입하기 버튼으로 이어져요." to "signup_link",
            "자세한 건 https://example.com 에 있어요." to "signup_link",
            "올해 안에 꼭 신청하세요." to "imperative",
            "혼인신고를 미루지 않는 것이 좋아요." to "imperative",
            "이 돈으로 종목을 고르는 사람도 있어요." to "security",
            "005930 같은 대형주로 옮기는 사람도 있어요." to "security",
            "환급금으로 매수하는 사람이 많아요." to "trade_timing",
            "무조건 돌려받아요." to "certainty",
        )
        table.forEach { (sentence, rule) ->
            val problems = rejected(source(body = "혼인신고를 한 해에 세금이 줄 수 있어요.\n\n$sentence"))
            problems shouldContain "법적 선 $rule: $sentence"
        }
        // 오탐 경계 — 제도 설명 말투 · 면책 · 숫자 · “하나” 같은 말
        listOf(
            "혼인신고를 한 해에 세금에서 50만 원을 덜 낼 수 있어요.",
            "예금은 한 금융회사에 1억 원까지 보호돼요.",
            "원금이 보장되는 것은 아니에요.",
            "납입액의 40%를 소득에서 빼요.",
            "하나의 조건만 맞아도 대상이 될 수 있어요.",
            "우리는 공식 출처만 적어요.",
            "신용카드보다 체크카드 · 현금영수증의 공제율이 높아요.",
            "주택청약종합저축에 넣은 돈의 40%예요.",
            "신고 기간은 5월 1일부터 5월 31일까지예요.",
        ).forEach { LegalLine.violations(it).shouldBeEmpty() }
        // 제목 · 요약 · 변경 요약도 같은 검사를 지난다
        rejected(source(front = mapOf("title" to "결혼하면 꼭 신청하세요"))).any { it.startsWith("법적 선 imperative") } shouldBe true
        rejected(source(front = mapOf("change" to "어느뱅크 사례 추가"))).any { it.startsWith("법적 선 product_name") } shouldBe true
    }

    "유효기한 경계 — 당일 유효 · 다음 날 확인 필요" {
        val tip = ok(source())
        tip.statusOn(LocalDate.parse("2026-12-30")) shouldBe TipStatus.PUBLISHED
        tip.statusOn(LocalDate.parse("2026-12-31")) shouldBe TipStatus.PUBLISHED
        tip.statusOn(LocalDate.parse("2027-01-01")) shouldBe TipStatus.NEEDS_CHECK
    }

    "때맞춘 팁 — 0~1건 · 닫은 것 · 확인 필요 · 맥락 · 신호 기간 · 달 · 순서" {
        val wedding = ok(source())
        val may = ok(source(front = mapOf("title" to "5월은 종합소득세 신고 달", "triggers" to "month:5", "contexts" to "household, home", "valid_until" to "2027-05-31")))
            .copy(slug = "income-tax-may")
        val tips = mapOf(wedding.slug to wedding, may.slug to may)
        val rules = listOf(
            TriggerRule(wedding.slug, TriggerKind.GOAL_CREATED_WEDDING, setOf(TipContext.SAVINGS, TipContext.HOME), 0),
            TriggerRule(wedding.slug, TriggerKind.MONTH_12, setOf(TipContext.SAVINGS, TipContext.HOME), 1),
            TriggerRule(may.slug, TriggerKind.MONTH_5, setOf(TipContext.HOUSEHOLD, TipContext.HOME), 2),
        )
        val now = Instant.parse("2026-11-05T03:00:00Z")
        val today = LocalDate.parse("2026-11-05")
        val signal = UserSignal("u", TriggerKind.GOAL_CREATED_WEDDING, Instant.parse("2026-11-01T00:00:00Z"))
        fun pick(context: TipContext = TipContext.SAVINGS, day: LocalDate = today, at: Instant = now, signals: List<UserSignal> = listOf(signal), dismissed: Set<String> = emptySet()) =
            TimelyTipPicker.pick(context, day, at, rules, tips, signals, dismissed)

        pick()?.trigger shouldBe TriggerKind.GOAL_CREATED_WEDDING
        // 신호가 없으면 11월엔 아무것도 없다
        pick(signals = emptyList()) shouldBe null
        // 맥락이 다르면 없다
        pick(context = TipContext.HOUSEHOLD) shouldBe null
        // 닫으면 다시 안 뜬다(같은 글의 다른 트리거도)
        pick(dismissed = setOf(wedding.slug)) shouldBe null
        pick(day = LocalDate.parse("2026-12-10"), at = Instant.parse("2026-12-10T00:00:00Z"), signals = emptyList(), dismissed = setOf(wedding.slug)) shouldBe null
        // 달 트리거 — 12월엔 신호 없이도
        pick(day = LocalDate.parse("2026-12-10"), at = Instant.parse("2026-12-10T00:00:00Z"), signals = emptyList())?.trigger shouldBe TriggerKind.MONTH_12
        // 신호 기간 경계 — 89일째 뜨고 90일째 안 뜬다
        val start = signal.occurredAt
        pick(at = start.plusSeconds(89L * 86_400)) ?.trigger shouldBe TriggerKind.GOAL_CREATED_WEDDING
        pick(at = start.plusSeconds(90L * 86_400)) shouldBe null
        // 미래 신호(시계 어긋남)는 세지 않는다
        pick(signals = listOf(signal.copy(occurredAt = now.plusSeconds(60)))) shouldBe null
        // 확인 필요 글은 안 뜬다 — 기한 다음 날
        pick(day = LocalDate.parse("2027-01-01"), at = Instant.parse("2027-01-01T00:00:00Z")) shouldBe null
        // 이벤트 트리거가 달 트리거보다 먼저 · 같은 재료면 같은 답
        val dec = LocalDate.parse("2026-12-10")
        val decAt = Instant.parse("2026-12-10T00:00:00Z")
        val picks = (1..5).map { pick(context = TipContext.HOME, day = dec, at = decAt)?.trigger }
        picks.toSet() shouldBe setOf(TriggerKind.GOAL_CREATED_WEDDING)
        // 5월 — 가계부 맥락
        pick(context = TipContext.HOUSEHOLD, day = LocalDate.parse("2027-05-02"), at = Instant.parse("2027-05-02T00:00:00Z"))?.tip?.slug shouldBe "income-tax-may"
    }

    "제도 파라미터 — 겹침 · 값과 말 중 하나 · 공식 출처 · 기준일 조회 경계" {
        fun p(from: String, to: String?, value: String? = "500000", text: String? = null, url: String = "https://www.law.go.kr/x") =
            PolicyParam("marriage_tax_credit", LocalDate.parse(from), to?.let(LocalDate::parse), value?.let(::BigDecimal), text, "KRW", url, LocalDate.parse("2026-11-05"))

        PolicyParamSet.validate(listOf(p("2024-01-01", "2026-12-31"), p("2027-01-01", null))).shouldBeEmpty()
        PolicyParamSet.validate(listOf(p("2024-01-01", "2026-12-31"), p("2026-12-31", null))).single() shouldBe "marriage_tax_credit: 2024-01-01 · 2026-12-31 구간이 겹친다"
        PolicyParamSet.validate(listOf(p("2024-01-01", null), p("2030-01-01", null))).size shouldBe 1
        PolicyParamSet.validate(listOf(p("2024-01-01", null, value = null))).single() shouldBe "marriage_tax_credit@2024-01-01: value 와 text 중 하나만"
        PolicyParamSet.validate(listOf(p("2024-01-01", "2023-01-01"))).single() shouldBe "marriage_tax_credit@2024-01-01: valid_to 가 valid_from 보다 앞선다"
        PolicyParamSet.validate(listOf(p("2024-01-01", null, url = "https://bank.example.com"))).single() shouldBe "marriage_tax_credit@2024-01-01: 공식 출처가 아니다"

        val row = p("2024-01-01", "2026-12-31")
        row.covers(LocalDate.parse("2023-12-31")) shouldBe false
        row.covers(LocalDate.parse("2024-01-01")) shouldBe true
        row.covers(LocalDate.parse("2026-12-31")) shouldBe true
        row.covers(LocalDate.parse("2027-01-01")) shouldBe false
        row.sameContent(row.copy(value = BigDecimal("500000.00"))) shouldBe true
        row.sameContent(row.copy(value = BigDecimal("600000"))) shouldBe false
    }

    "출처 판정 — https 정부 · 공공기관만" {
        LegalLine.officialSource("https://www.nts.go.kr/a") shouldBe true
        LegalLine.officialSource("https://www.kdic.or.kr/a") shouldBe true
        LegalLine.officialSource("https://evil.go.kr.example.com/a") shouldBe false
        LegalLine.officialSource("not a url") shouldBe false
        PublishCheck.check("a", "---\n---\n").shouldBeInstanceOf<PublishCheck.Outcome.Rejected>()
    }
})
