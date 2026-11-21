package com.salt.notification.domain

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldStartWith
import java.time.Instant
import java.util.Base64

/**
 * 웹 푸시(`SRV-REQ-062`) 불변식 — 허용 · 거절 경계 표.
 * 1. 잠금 화면 문장에 금액 · 이름 · 종목 0(인자 0)
 * 2. 구독 주소는 알려진 푸시 서비스의 https 만
 * 4. 키 길이 — 공개키 65바이트 압축 안 된 점 · 인증 비밀 16바이트
 */
class PushSpec : StringSpec({
    val b64 = Base64.getUrlEncoder().withoutPadding()
    val key = b64.encodeToString(byteArrayOf(4) + ByteArray(64) { 1 })
    val auth = b64.encodeToString(ByteArray(16) { 2 })

    "알려진 푸시 서비스 https 주소는 지난다" {
        listOf(
            "https://fcm.googleapis.com/fcm/send/abc:def",
            "https://updates.push.services.mozilla.com/wpush/v2/gAAA",
            "https://web.push.apple.com/QGx",
            "https://api.push.apple.com/3/device/x",
            "https://wns2-par02p.notify.windows.com/w/?token=x",
        ).forEach { PushSubscription.of(it, key, auth).endpoint shouldBe it }
    }

    "그 밖의 주소는 거절 — 서버가 아무 곳이나 부르지 않게" {
        listOf(
            "http://fcm.googleapis.com/fcm/send/x", // https 아님
            "https://fcm.googleapis.com:8443/fcm/send/x", // 포트 지정
            "https://user@fcm.googleapis.com/x", // 사용자 정보
            "https://evilfcm.googleapis.com.attacker.io/x", // 접미 흉내
            "https://notfcm.googleapis.com.evil/x",
            "https://xfcm.googleapis.com/x", // 점 없는 접미
            "https://localhost/x",
            "https://169.254.169.254/latest/meta-data",
            "https://10.0.0.1/x",
            "not a url",
            "",
            "https://fcm.googleapis.com/" + "a".repeat(1024), // 길이 상한
        ).forEach { shouldThrow<PushSubscriptionInvalid> { PushSubscription.of(it, key, auth) } }
    }

    "키 길이 경계 — 공개키 65(0x04 시작) · 인증 16" {
        val ok = "https://fcm.googleapis.com/fcm/send/x"
        PushSubscription.of(ok, "$key==", "$auth==").p256dhBytes.size shouldBe 65 // 채움이 붙어도 읽는다
        listOf(
            b64.encodeToString(byteArrayOf(4) + ByteArray(63)), // 64
            b64.encodeToString(byteArrayOf(4) + ByteArray(65)), // 66
            b64.encodeToString(byteArrayOf(2) + ByteArray(64)), // 압축된 점
            "!!!",
        ).forEach { shouldThrow<PushSubscriptionInvalid> { PushSubscription.of(ok, it, auth) } }
        listOf(b64.encodeToString(ByteArray(15)), b64.encodeToString(ByteArray(17)), "").forEach {
            shouldThrow<PushSubscriptionInvalid> { PushSubscription.of(ok, key, it) }
        }
    }

    "잠금 화면 문장 — 종류마다 하나 · 숫자 · 종목 0 · 휴대폰 탭 주소" {
        NotificationKind.entries.forEach { kind ->
            val m = PushMessage.of(kind)
            (m.title + m.body).none { it.isDigit() } shouldBe true
            m.path shouldStartWith "/m/"
            (m.path.count { it == '/' } == 2) shouldBe true // 탭 하나 — 종목 · 목표 id 를 주소에 싣지 않는다
        }
        PushMessage.of(NotificationKind.SIGNAL_UPDATE).path shouldBe "/m/investments"
        PushMessage.of(NotificationKind.GOAL_REACHED).path shouldBe "/m/goals"
        PushMessage.of(NotificationKind.FIXED_COST_INCREASED).path shouldBe "/m/household"
    }

    "신선함 경계 — 30분" {
        val now = Instant.parse("2026-11-21T00:30:00Z")
        PushPolicy.cutoff(now) shouldBe Instant.parse("2026-11-21T00:00:00Z")
    }
})
