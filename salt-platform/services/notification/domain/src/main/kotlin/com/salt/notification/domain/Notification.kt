package com.salt.notification.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import java.time.Duration
import java.time.Instant

/**
 * 알림 도메인(`SRV-REQ-048` FR-5, 서버 S2c) — Express `notification` 컨텍스트(`SRV-REQ-008` FR-20~25)를 옮기며 도메인 축을 더했다.
 *
 * 불변식
 * 1. **설정이 꺼진 도메인엔 0건** — 설정 행이 없으면 꺼짐(기본 꺼짐). 받을 때 꺼져 있으면 쌓지 않고, 나중에 끄면 목록 · 안 읽은 수에서 빠진다
 * 2. **문장 · 금액 0** — 코드(`messageCode`)와 코드 인자만. 문장은 화면 i18n 이 만든다. 이벤트 본문에 금액이 있어도 읽지 않는다
 * 3. 종류는 도메인마다 하나 — 늘리면 화면 문구 · BFF 거르기 · 설정 도메인이 같이 바뀐다
 */
enum class NotificationDomain(val key: String) {
    INVEST("invest"),
    SAVINGS("savings"),
    HOUSEHOLD("household"),
    ;

    companion object {
        fun parse(key: String): NotificationDomain? = entries.firstOrNull { it.key == key }
    }
}

/**
 * 종류 — 도메인마다 하나. [ttl] 이 지나면 정리 워커가 지운다. [suppressFor] 는 같은 원인(출처 · 종목 · 코드)이 그 안에 또 오면 버리는 창.
 *
 * - `signal_update` — 코치 판단이 바뀌었다(옛 Express 그대로: 24시간 · 2시간 억제)
 * - `goal_reached` — 저축 목표에 닿았다(목표마다 한 번 나오는 이벤트라 억제 없음)
 * - `fixed_cost_increased` — 고정비가 앞 회차보다 올랐다(가맹점 · 달마다 한 번 나오는 이벤트라 억제 없음)
 */
enum class NotificationKind(val key: String, val domain: NotificationDomain, val ttl: Duration, val suppressFor: Duration?) {
    SIGNAL_UPDATE("signal_update", NotificationDomain.INVEST, Duration.ofHours(24), Duration.ofHours(2)),
    GOAL_REACHED("goal_reached", NotificationDomain.SAVINGS, Duration.ofDays(30), null),
    FIXED_COST_INCREASED("fixed_cost_increased", NotificationDomain.HOUSEHOLD, Duration.ofDays(30), null),
    ;

    companion object {
        fun parse(key: String): NotificationKind? = entries.firstOrNull { it.key == key }

        fun of(domains: Set<NotificationDomain>): Set<NotificationKind> = entries.filter { it.domain in domains }.toSet()
    }
}

/** 새로 만드는 알림. 만들 때 관문 둘(코드 형식 · 금액 없음)을 지나야 생긴다 — [of] 밖으로는 못 만든다. */
class NotificationDraft private constructor(
    val userId: String,
    val kind: NotificationKind,
    /** 누가 만들었나 — 같은 원인 억제의 키 일부(예 `ai_coach`) */
    val source: String,
    val symbol: String?,
    val messageCode: String,
    val params: Map<String, String>,
    val createdAt: Instant,
) {
    val expiresAt: Instant get() = createdAt.plus(kind.ttl)

    companion object {
        fun of(
            userId: String,
            kind: NotificationKind,
            source: String,
            symbol: String?,
            messageCode: String,
            params: Map<String, String>,
            createdAt: Instant,
        ): NotificationDraft {
            MessageGuard.assertMessageCode(messageCode)
            MessageGuard.assertNoAmounts(params)
            require(userId.isNotBlank() && source.isNotBlank())
            return NotificationDraft(userId, kind, source, symbol, messageCode, params, createdAt)
        }
    }
}

/** 목록에 나가는 한 건 — 옛 Express 와 같은 칸(`{ id, kind, symbol, messageCode, params, isRead, createdAt }`). */
data class NotificationItem(
    val id: String,
    val kind: NotificationKind,
    val symbol: String?,
    val messageCode: String,
    val params: Map<String, String>,
    val isRead: Boolean,
    val createdAt: Instant,
)

/** 사용자의 도메인별 켬/끔. **행이 없으면 꺼짐** — 켠 도메인만 담는다. */
data class NotificationPrefs(val enabled: Set<NotificationDomain>) {
    fun isOn(domain: NotificationDomain): Boolean = domain in enabled

    /** 화면이 그리는 순서 = 서버가 정한 순서(enum 순서) */
    fun all(): List<Pair<NotificationDomain, Boolean>> = NotificationDomain.entries.map { it to isOn(it) }

    companion object {
        val NONE = NotificationPrefs(emptySet())
    }
}

/**
 * 문장과 금액이 못 들어가게(옛 Express `messageGuard` 그대로 — BFF `alerts.viewmodel` 이 같은 기준으로 한 번 더 거른다).
 * 인자 값은 문자열만 — 숫자처럼 생긴 값 · 금액을 뜻하는 키는 거부. 종목 · 모드 · 행동 · 목표 틀 · 분류 같은 **코드**만 지나간다.
 */
object MessageGuard {
    private val MESSAGE_CODE = Regex("^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$")
    private val AMOUNT_KEY = Regex("price|amount|value|krw|usd|won|balance|pnl|profit|loss|cost|qty|quantity|total", RegexOption.IGNORE_CASE)
    private val NUMERIC = Regex("^[-+]?[\\d,]*\\.?\\d+%?$")

    fun assertMessageCode(code: String) {
        if (!MESSAGE_CODE.matches(code)) throw NotificationMessageCodeInvalid(code)
    }

    /** 종목 코드 — 국내 주식은 숫자 여섯 자리(`005930`)라 숫자 검사가 아니라 코드 형식으로 본다(이 키 하나만, 2026-11-06 확인 2회차) */
    private const val SYMBOL_KEY = "symbol"
    private val SYMBOL = Regex("^[A-Za-z0-9.\\-]{1,20}$")

    fun assertNoAmounts(params: Map<String, String>) {
        params.forEach { (key, value) ->
            val ok = if (key == SYMBOL_KEY) SYMBOL.matches(value) else !(AMOUNT_KEY.containsMatchIn(key) || NUMERIC.matches(value.trim()))
            if (!ok) throw NotificationAmountNotAllowed(key)
        }
    }
}

class NotificationMessageCodeInvalid(code: String) :
    DomainError("NOTIFICATION_MESSAGE_CODE_INVALID", ErrorKind.BLOCKED, "Notification messageCode must be a dotted code: $code")

class NotificationAmountNotAllowed(key: String) :
    DomainError("NOTIFICATION_AMOUNT_NOT_ALLOWED", ErrorKind.BLOCKED, "Notification params must not carry amounts: $key")

class NotificationPrefValueInvalid :
    DomainError("NOTIFICATION_PREF_VALUE_INVALID", ErrorKind.INVALID, "enabled must be a JSON boolean")

class NotificationDomainUnknown(key: String) :
    DomainError("NOTIFICATION_DOMAIN_UNKNOWN", ErrorKind.INVALID, "Unknown notification domain: $key")

/**
 * 다른 서비스 이벤트 → 알림 초안. 이벤트에서 **코드만** 꺼낸다 — 목표 이름 · 가맹점 · 금액은 읽지 않는다(불변식 2).
 * 문구 키는 화면 i18n 과 짝이다(`@repo/web-shared` 의 알림 문구 · RN).
 */
object Deliveries {
    const val COACH_SOURCE = "ai_coach"

    fun decisionChanged(userId: String, symbol: String, mode: String, previousAction: String, nextAction: String, at: Instant): NotificationDraft =
        NotificationDraft.of(
            userId, NotificationKind.SIGNAL_UPDATE, COACH_SOURCE, symbol, "coach.decision_changed",
            mapOf("symbol" to symbol, "mode" to mode, "previousAction" to previousAction, "nextAction" to nextAction), at,
        )

    fun goalReached(userId: String, template: String, at: Instant): NotificationDraft =
        NotificationDraft.of(userId, NotificationKind.GOAL_REACHED, "savings", null, "savings.goal_reached", mapOf("template" to template), at)

    fun fixedCostIncreased(userId: String, category: String, at: Instant): NotificationDraft =
        NotificationDraft.of(userId, NotificationKind.FIXED_COST_INCREASED, "household", null, "household.fixed_cost_increased", mapOf("category" to category), at)
}
