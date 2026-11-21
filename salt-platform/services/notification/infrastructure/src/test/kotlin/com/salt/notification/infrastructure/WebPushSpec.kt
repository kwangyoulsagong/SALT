package com.salt.notification.infrastructure

import com.salt.notification.domain.PushMessage
import com.salt.notification.domain.PushOutcome
import com.salt.notification.domain.PushSubscription
import com.sun.net.httpserver.HttpServer
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldStartWith
import tools.jackson.databind.json.JsonMapper
import java.net.InetSocketAddress
import java.nio.ByteBuffer
import java.security.KeyPair
import java.security.Signature
import java.security.interfaces.ECPublicKey
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.concurrent.atomic.AtomicReference
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * 웹 푸시 보내기(`SRV-REQ-062` FR-3) — RFC 8291 부록 A 시험 벡터와 바이트까지 같아야 한다(브라우저가 풀 수 있는 유일한 증거).
 * 보내기는 이 컴퓨터 안 HTTP 서버로 — 받은 본문을 받는 쪽 개인키로 풀어 본다.
 */
class WebPushSpec : StringSpec({
    val clock = Clock.fixed(Instant.parse("2026-11-21T00:00:00Z"), ZoneOffset.UTC)
    val jsonMapper = JsonMapper.builder().build()

    "RFC 8291 부록 A — 같은 키 · 소금이면 같은 바이트" {
        val asPrivate = P256.decode("yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw")
        val asPublic = P256.decode("BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8")
        val uaPublic = P256.decode("BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4")
        val auth = P256.decode("BTBZMqHH6r4Tts7J_aSIgg")
        val salt = P256.decode("DGv6ra1nlYgDCS1FRnbzlw")
        val body = WebPushCrypto.encrypt(
            "When I grow up, I want to be a watermelon".toByteArray(),
            uaPublic,
            auth,
            KeyPair(P256.publicKey(asPublic), P256.privateKey(asPrivate)),
            salt,
        )
        P256.encode(body) shouldBe
            "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN"
    }

    "VAPID — 푸시 서비스 origin · 12시간 · 공개키로 서명이 풀린다 · 짝이 틀리면 기동 실패" {
        val keys = P256.generate()
        val pub = P256.encode(P256.raw(keys.public as ECPublicKey))
        val priv = P256.encode(privateRaw(keys))
        val header = Vapid(pub, priv, "https://salt.example", clock).header("https://fcm.googleapis.com/fcm/send/abc")
        header shouldStartWith "vapid t="
        val (jwt, k) = header.removePrefix("vapid t=").split(", k=")
        k shouldBe pub
        val (h, c, s) = jwt.split(".")
        String(P256.decode(c)) shouldBe """{"aud":"https://fcm.googleapis.com","exp":${clock.instant().epochSecond + 12 * 3600},"sub":"https://salt.example"}"""
        Signature.getInstance("SHA256withECDSAinP1363Format").apply { initVerify(keys.public); update("$h.$c".toByteArray()) }.verify(P256.decode(s)) shouldBe true

        val other = P256.encode(privateRaw(P256.generate()))
        shouldThrow<IllegalArgumentException> { Vapid(pub, other, "https://salt.example", clock) }
        shouldThrow<IllegalArgumentException> { Vapid(pub, priv, "salt@example.com", clock) }
    }

    "보내기 — 머리 · 풀린 본문(Declarative 모양 · 절대 주소) · 410 은 사라짐 · 500 은 실패" {
        val ua = P256.generate()
        val uaPublic = P256.raw(ua.public as ECPublicKey)
        val auth = ByteArray(16) { 7 }
        val seen = AtomicReference<Pair<Map<String, String>, ByteArray>>()
        val status = AtomicReference(201)
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0).apply {
            createContext("/push") { ex ->
                seen.set(ex.requestHeaders.mapValues { it.value.first() }.mapKeys { it.key.lowercase() } to ex.requestBody.readAllBytes())
                ex.sendResponseHeaders(status.get(), -1)
                ex.close()
            }
            start()
        }
        try {
            val keys = P256.generate()
            val vapid = Vapid(P256.encode(P256.raw(keys.public as ECPublicKey)), P256.encode(privateRaw(keys)), "https://salt.example", clock)
            val sender = HttpPushSender(vapid, "https://salt.example/", jsonMapper)
            // 허용 목록은 저장할 때 본다(도메인) — 여기선 저장된 행처럼 만든다
            val device = PushSubscription.stored("http://127.0.0.1:${server.address.port}/push", P256.encode(uaPublic), P256.encode(auth))
            val message = PushMessage("제목", "본문", "/m/goals")

            sender.send(device, message) shouldBe PushOutcome.DELIVERED
            val (headers, body) = seen.get()
            headers["content-encoding"] shouldBe "aes128gcm"
            headers["ttl"] shouldBe "86400"
            headers["authorization"]!! shouldStartWith "vapid t="
            val json = jsonMapper.readTree(decrypt(body, ua, uaPublic, auth))
            json.path("web_push").asInt() shouldBe 8030
            json.path("notification").path("title").asString() shouldBe "제목"
            json.path("notification").path("navigate").asString() shouldBe "https://salt.example/m/goals"

            status.set(410)
            sender.send(device, message) shouldBe PushOutcome.GONE
            status.set(404)
            sender.send(device, message) shouldBe PushOutcome.GONE
            status.set(500)
            sender.send(device, message) shouldBe PushOutcome.FAILED
            status.set(429)
            sender.send(device, message) shouldBe PushOutcome.FAILED
        } finally {
            server.stop(0)
        }
        // 닿지 않는 주소 = 실패(사라짐이 아니다 — 구독을 지우지 않는다)
        val keys = P256.generate()
        val vapid = Vapid(P256.encode(P256.raw(keys.public as ECPublicKey)), P256.encode(privateRaw(keys)), "https://salt.example", clock)
        HttpPushSender(vapid, "https://salt.example", jsonMapper)
            .send(PushSubscription.stored("http://127.0.0.1:1/push", P256.encode(uaPublic), P256.encode(auth)), PushMessage("a", "b", "/m/home")) shouldBe PushOutcome.FAILED
    }

    "곡선 밖 점 — 저장 관문(길이 · 0x04)은 지나도 보내기는 사라짐 · 요청 0(회차를 멈추지 않는다)" {
        var calls = 0
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0).apply {
            createContext("/push") { ex -> calls++; ex.sendResponseHeaders(201, -1); ex.close() }
            start()
        }
        try {
            val keys = P256.generate()
            val vapid = Vapid(P256.encode(P256.raw(keys.public as ECPublicKey)), P256.encode(privateRaw(keys)), "https://salt.example", clock)
            val offCurve = P256.encode(byteArrayOf(4) + ByteArray(64) { 1 })
            val device = PushSubscription.of("https://fcm.googleapis.com/fcm/send/x", offCurve, P256.encode(ByteArray(16))) // 관문 통과
            HttpPushSender(vapid, "https://salt.example", jsonMapper)
                .send(PushSubscription.stored("http://127.0.0.1:${server.address.port}/push", device.p256dh, device.auth), PushMessage("a", "b", "/m/home")) shouldBe PushOutcome.GONE
            calls shouldBe 0
        } finally {
            server.stop(0)
        }
    }
})

private fun privateRaw(keys: KeyPair): ByteArray = P256.raw(keys.private as java.security.interfaces.ECPrivateKey)

/** 받는 쪽(브라우저)이 하는 풀기 — RFC 8291 §3.4 를 거꾸로. 시험에만 */
private fun decrypt(body: ByteArray, ua: KeyPair, uaPublic: ByteArray, auth: ByteArray): ByteArray {
    val buf = ByteBuffer.wrap(body)
    val salt = ByteArray(16).also { buf.get(it) }
    buf.getInt()
    val asPublic = ByteArray(buf.get().toInt()).also { buf.get(it) }
    val cipherText = ByteArray(buf.remaining()).also { buf.get(it) }
    fun hmac(key: ByteArray, data: ByteArray) = Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(key, "HmacSHA256")) }.doFinal(data)
    val ecdh = KeyAgreement.getInstance("ECDH").apply { init(ua.private); doPhase(P256.publicKey(asPublic), true) }.generateSecret()
    val ikm = hmac(hmac(auth, ecdh), "WebPush: info".toByteArray() + byteArrayOf(0) + uaPublic + asPublic + byteArrayOf(1))
    val prk = hmac(salt, ikm)
    val cek = hmac(prk, "Content-Encoding: aes128gcm".toByteArray() + byteArrayOf(0, 1)).copyOf(16)
    val nonce = hmac(prk, "Content-Encoding: nonce".toByteArray() + byteArrayOf(0, 1)).copyOf(12)
    val plain = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, SecretKeySpec(cek, "AES"), GCMParameterSpec(128, nonce)) }.doFinal(cipherText)
    plain.last() shouldBe 2.toByte()
    return plain.copyOf(plain.size - 1)
}
