package com.salt.notification.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import java.net.URI
import java.time.Duration
import java.time.Instant
import java.util.Base64

/**
 * 웹 푸시(`SRV-REQ-062`, F019 순서 4 — `ADR-012` 푸시 행). 알림 한 건이 생기면 그 사람의 기기마다 한 번 보낸다.
 *
 * 불변식
 * 1. **잠금 화면에 금액 · 이름 · 종목 0** — 푸시 문장은 종류마다 고정 한 줄(인자 0). 알림 행의 인자(종목 · 목표 틀 · 분류)도 싣지 않는다:
 *    잠금 화면은 휴대폰을 든 누구나 본다. 자세한 것은 누른 뒤 앱 안에서
 * 2. **보내는 곳은 알려진 푸시 서비스뿐** — 구독 주소는 브라우저가 주지만 요청 본문으로 온다. 서버가 그 주소로 POST 하니
 *    허용 목록 밖 호스트 · https 아님 · 포트 지정은 거절한다(서버가 아무 주소나 부르게 되는 길을 막는다)
 * 3. **한 알림은 많아야 한 번** — 보내기 전에 표시(`pushed_at`)부터. 보내다 죽으면 그 푸시는 잃는다(목록에는 남는다) — 잠금 화면 중복보다 낫다
 * 4. **사라진 구독(404 · 410)은 지운다** — 다음 회차에 다시 부르지 않는다
 */
class PushSubscription private constructor(
    val endpoint: String,
    /** 받는 쪽 공개키 — P-256 압축 안 된 점 65바이트(base64url) */
    val p256dh: String,
    /** 받는 쪽 인증 비밀 16바이트(base64url) */
    val auth: String,
) {
    val p256dhBytes: ByteArray get() = decode(p256dh)
    val authBytes: ByteArray get() = decode(auth)

    companion object {
        /**
         * 브라우저 푸시 서비스 호스트(접미). Chrome · Edge(FCM) · Firefox · Safari(macOS · iOS) · 옛 Edge.
         * 늘리려면 이 표에 한 줄 + `PushSubscriptionSpec` 경계 한 줄.
         */
        val ALLOWED_HOST_SUFFIXES = listOf(
            "fcm.googleapis.com",
            "push.services.mozilla.com",
            "push.apple.com",
            "notify.windows.com",
        )
        private const val ENDPOINT_MAX = 1024
        private const val P256DH_BYTES = 65
        private const val AUTH_BYTES = 16

        fun of(endpoint: String, p256dh: String, auth: String): PushSubscription {
            val uri = runCatching { URI(endpoint) }.getOrNull() ?: throw PushSubscriptionInvalid("endpoint")
            val host = uri.host?.lowercase() ?: throw PushSubscriptionInvalid("endpoint")
            val knownHost = ALLOWED_HOST_SUFFIXES.any { host == it || host.endsWith(".$it") }
            if (endpoint.length > ENDPOINT_MAX || uri.scheme != "https" || uri.port != -1 || uri.userInfo != null || !knownHost) {
                throw PushSubscriptionInvalid("endpoint")
            }
            val key = runCatching { decode(p256dh) }.getOrNull()
            if (key == null || key.size != P256DH_BYTES || key[0] != 0x04.toByte()) throw PushSubscriptionInvalid("p256dh")
            if (runCatching { decode(auth) }.getOrNull()?.size != AUTH_BYTES) throw PushSubscriptionInvalid("auth")
            return PushSubscription(endpoint, p256dh, auth)
        }

        /** 저장된 행 — 넣을 때 이미 관문을 지났다 */
        fun stored(endpoint: String, p256dh: String, auth: String): PushSubscription = PushSubscription(endpoint, p256dh, auth)

        /** 브라우저는 base64url(채움 없음)을 준다 — 채움이 붙어 와도 읽는다 */
        private fun decode(value: String): ByteArray = Base64.getUrlDecoder().decode(value.trimEnd('='))
    }
}

/**
 * 잠금 화면 한 장 — 제목 · 본문은 종류마다 고정(불변식 1), 누르면 갈 휴대폰 주소(`/m/…`).
 * 종목 상세가 아니라 탭으로 보낸다 — 주소에 종목을 넣으면 잠금 화면 미리보기 · 알림 센터 기록에 남는다.
 */
data class PushMessage(val title: String, val body: String, val path: String) {
    companion object {
        fun of(kind: NotificationKind): PushMessage = when (kind) {
            NotificationKind.SIGNAL_UPDATE -> PushMessage("코치 판단이 바뀌었어요", "관심 종목 판단을 앱에서 확인해 보세요", "/m/investments")
            NotificationKind.GOAL_REACHED -> PushMessage("저축 목표에 닿았어요", "어떤 목표인지 앱에서 확인해 보세요", "/m/goals")
            NotificationKind.FIXED_COST_INCREASED -> PushMessage("고정비가 지난번보다 올랐어요", "어느 항목인지 앱에서 확인해 보세요", "/m/household")
        }
    }
}

/** 보낼 차례인 알림 하나 — 주인 · 종류만(인자는 싣지 않는다, 불변식 1) */
data class PendingPush(val notificationId: String, val userId: String, val kind: NotificationKind)

/** 푸시 서비스의 답을 셋으로 — 사라짐(404 · 410)만 구독을 지운다 */
enum class PushOutcome { DELIVERED, GONE, FAILED }

object PushPolicy {
    /** 이보다 오래된 알림은 푸시하지 않는다 — 서버가 오래 꺼졌다 켜져도 지난 알림이 한꺼번에 울리지 않게 */
    val FRESH_FOR: Duration = Duration.ofMinutes(30)

    /** 한 회차에 표시할 알림 수 — 넘치면 다음 회차 */
    const val BATCH = 100

    /** 푸시 서비스가 못 전하면 들고 있을 시간(`TTL` 머리) — 종류 수명과 상관없이 하루 */
    val TTL: Duration = Duration.ofHours(24)

    fun cutoff(now: Instant): Instant = now.minus(FRESH_FOR)
}

/** 구독 저장(`notification.push_subscription`). 주소 하나에 행 하나 — 같은 기기에 다른 사람이 로그인하면 주인이 바뀐다 */
interface PushSubscriptions {
    fun save(userId: String, subscription: PushSubscription, at: Instant)

    /** 본인 것만 지운다 */
    fun remove(userId: String, endpoint: String)

    fun of(userIds: Set<String>): Map<String, List<PushSubscription>>

    fun removeGone(endpoints: Set<String>)
}

/** 보낼 차례 알림 — 표시와 읽기를 한 문장에(불변식 3) */
interface PushQueue {
    /** [since] 뒤에 생겨 아직 표시 안 된 알림을 많아야 [limit] 개 표시하고 돌려준다 */
    fun claim(since: Instant, now: Instant, limit: Int): List<PendingPush>

    /** [since] 전에 생겨 표시 못 한 알림은 푸시하지 않고 표시만 — 목록엔 남는다. @return 건너뛴 수 */
    fun skipStale(since: Instant, now: Instant): Int
}

/** 암호화 · 서명 · HTTP — 인프라가 꽂는다. 키가 없으면(푸시 꺼짐) 꽂지 않는다 */
fun interface PushSender {
    fun send(subscription: PushSubscription, message: PushMessage): PushOutcome
}

class PushSubscriptionInvalid(field: String) :
    DomainError("PUSH_SUBSCRIPTION_INVALID", ErrorKind.INVALID, "Push subscription field is invalid: $field")

class PushDisabled :
    DomainError("PUSH_DISABLED", ErrorKind.UNAVAILABLE, "Web push is not configured on this server")
