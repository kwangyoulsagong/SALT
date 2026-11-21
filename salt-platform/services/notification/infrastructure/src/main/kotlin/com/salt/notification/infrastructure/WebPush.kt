package com.salt.notification.infrastructure

import com.salt.notification.domain.PushMessage
import com.salt.notification.domain.PushOutcome
import com.salt.notification.domain.PushPolicy
import com.salt.notification.domain.PushSender
import com.salt.notification.domain.PushSubscription
import org.slf4j.LoggerFactory
import tools.jackson.databind.json.JsonMapper
import java.math.BigInteger
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.ByteBuffer
import java.security.AlgorithmParameters
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.SecureRandom
import java.security.Signature
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.ECPoint
import java.security.spec.ECPrivateKeySpec
import java.security.spec.ECPublicKeySpec
import java.time.Clock
import java.time.Duration
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * 웹 푸시 보내기(`SRV-REQ-062` FR-3) — JDK 암호만으로(라이브러리 0, `kotlin-platform.md` §1 표 밖 추가 없음).
 * 본문 암호화 RFC 8291(`aes128gcm`, RFC 8188) · 서버 신원 RFC 8292(VAPID, ES256). 키는 P-256 하나.
 */
object P256 {
    private val b64 = Base64.getUrlEncoder().withoutPadding()
    private val params: ECParameterSpec =
        AlgorithmParameters.getInstance("EC").apply { init(ECGenParameterSpec("secp256r1")) }.getParameterSpec(ECParameterSpec::class.java)

    fun encode(bytes: ByteArray): String = b64.encodeToString(bytes)

    fun decode(value: String): ByteArray = Base64.getUrlDecoder().decode(value.trimEnd('='))

    fun generate(): KeyPair = KeyPairGenerator.getInstance("EC").apply { initialize(ECGenParameterSpec("secp256r1")) }.generateKeyPair()

    /** 압축 안 된 점(0x04 · X · Y, 65바이트) */
    fun raw(key: ECPublicKey): ByteArray = byteArrayOf(0x04) + fixed(key.w.affineX) + fixed(key.w.affineY)

    /** 개인키 32바이트 — 키 만들기(`ops/vapid-keys.mjs` 와 같은 모양) · 시험 */
    fun raw(key: ECPrivateKey): ByteArray = fixed(key.s)

    fun publicKey(raw: ByteArray): ECPublicKey {
        require(raw.size == 65 && raw[0] == 0x04.toByte()) { "P-256 공개키는 65바이트 압축 안 된 점" }
        val point = ECPoint(BigInteger(1, raw.copyOfRange(1, 33)), BigInteger(1, raw.copyOfRange(33, 65)))
        return KeyFactory.getInstance("EC").generatePublic(ECPublicKeySpec(point, params)) as ECPublicKey
    }

    fun privateKey(raw: ByteArray): ECPrivateKey {
        require(raw.size == 32) { "P-256 개인키는 32바이트" }
        return KeyFactory.getInstance("EC").generatePrivate(ECPrivateKeySpec(BigInteger(1, raw), params)) as ECPrivateKey
    }

    private fun fixed(n: BigInteger): ByteArray {
        val bytes = n.toByteArray()
        return when {
            bytes.size == 32 -> bytes
            bytes.size > 32 -> bytes.copyOfRange(bytes.size - 32, bytes.size)
            else -> ByteArray(32 - bytes.size) + bytes
        }
    }
}

/** RFC 8291 — 받는 쪽 공개키 · 인증 비밀로 한 레코드 `aes128gcm` 본문을 만든다. [ephemeral] · [salt] 는 시험 벡터용 */
object WebPushCrypto {
    private const val RECORD_SIZE = 4096
    private val ZERO = byteArrayOf(0)
    private val ONE = byteArrayOf(1)
    private val LAST_RECORD = byteArrayOf(2)

    fun encrypt(
        plaintext: ByteArray,
        uaPublic: ByteArray,
        authSecret: ByteArray,
        ephemeral: KeyPair = P256.generate(),
        salt: ByteArray = ByteArray(16).also { SecureRandom().nextBytes(it) },
    ): ByteArray {
        val asPublic = P256.raw(ephemeral.public as ECPublicKey)
        val ecdh = KeyAgreement.getInstance("ECDH").apply {
            init(ephemeral.private)
            doPhase(P256.publicKey(uaPublic), true)
        }.generateSecret()

        val prkKey = hmac(authSecret, ecdh)
        val ikm = hmac(prkKey, "WebPush: info".toByteArray() + ZERO + uaPublic + asPublic + ONE)
        val prk = hmac(salt, ikm)
        val cek = hmac(prk, "Content-Encoding: aes128gcm".toByteArray() + ZERO + ONE).copyOf(16)
        val nonce = hmac(prk, "Content-Encoding: nonce".toByteArray() + ZERO + ONE).copyOf(12)

        // 마지막 레코드 구분자 0x02 하나 — 채움 0
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, SecretKeySpec(cek, "AES"), GCMParameterSpec(128, nonce)) }
        val body = cipher.doFinal(plaintext + LAST_RECORD)
        require(body.size + 86 <= RECORD_SIZE) { "푸시 본문은 한 레코드(4KB) 안" }

        return ByteBuffer.allocate(16 + 4 + 1 + asPublic.size + body.size)
            .put(salt)
            .putInt(RECORD_SIZE)
            .put(asPublic.size.toByte())
            .put(asPublic)
            .put(body)
            .array()
    }

    private fun hmac(key: ByteArray, data: ByteArray): ByteArray = Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(key, "HmacSHA256")) }.doFinal(data)
}

/** RFC 8292 — 푸시 서비스 origin 마다 서명한 JWT(ES256, 12시간) · `Authorization: vapid t=…, k=…` */
class Vapid(publicKey: String, privateKey: String, private val subject: String, private val clock: Clock) {
    private val publicRaw = P256.decode(publicKey)
    private val private = P256.privateKey(P256.decode(privateKey))
    val publicKey: String = P256.encode(publicRaw)

    init {
        // 짝이 맞는지 기동 때 본다 — 틀린 짝이면 모든 푸시가 403 이다
        val probe = "salt".toByteArray()
        val signed = Signature.getInstance("SHA256withECDSAinP1363Format").apply { initSign(private); update(probe) }.sign()
        val ok = Signature.getInstance("SHA256withECDSAinP1363Format").apply { initVerify(P256.publicKey(publicRaw)); update(probe) }.verify(signed)
        require(ok) { "VAPID 공개키 · 개인키 짝이 맞지 않는다" }
        require(subject.startsWith("https://") || subject.startsWith("mailto:")) { "VAPID subject 는 https: 또는 mailto:" }
    }

    fun header(endpoint: String): String {
        val uri = URI(endpoint)
        val audience = "${uri.scheme}://${uri.host}"
        val exp = clock.instant().plus(Duration.ofHours(12)).epochSecond
        val head = P256.encode("""{"typ":"JWT","alg":"ES256"}""".toByteArray())
        val claims = P256.encode("""{"aud":"$audience","exp":$exp,"sub":"$subject"}""".toByteArray())
        val signature = Signature.getInstance("SHA256withECDSAinP1363Format").apply {
            initSign(private)
            update("$head.$claims".toByteArray())
        }.sign()
        return "vapid t=$head.$claims.${P256.encode(signature)}, k=$publicKey"
    }
}

/**
 * HTTP 보내기 — 본문은 Declarative Web Push 모양(`web_push: 8030` · `notification.navigate` 필수)이라 iOS 18.4+ 는 서비스 워커 없이도 띄우고,
 * 서비스 워커가 있는 브라우저는 같은 JSON 을 `push` 사건에서 읽는다(`FE-REQ-078` FR-3). `navigate` 는 절대 주소 — [publicOrigin] + `/m/…`.
 *
 * 재시도 0 — 보내기는 쓰기다(`kotlin-platform.md` §3 재시도는 조회만). 404 · 410 = 사라짐, 그 밖의 실패는 그 기기만 이번 회차를 놓친다.
 * 로그에 주소 · 키 0 — 푸시 서비스 호스트와 상태 코드만.
 */
class HttpPushSender(
    private val vapid: Vapid,
    private val publicOrigin: String,
    private val jsonMapper: JsonMapper,
    private val http: HttpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build(),
) : PushSender {
    private val log = LoggerFactory.getLogger(javaClass)

    fun payload(message: PushMessage): ByteArray =
        jsonMapper.writeValueAsBytes(
            mapOf(
                "web_push" to 8030,
                "notification" to mapOf(
                    "title" to message.title,
                    "body" to message.body,
                    "navigate" to publicOrigin.trimEnd('/') + message.path,
                    "lang" to "ko-KR",
                    "dir" to "ltr",
                    "silent" to false,
                ),
            ),
        )

    override fun send(subscription: PushSubscription, message: PushMessage): PushOutcome {
        // 곡선 밖 점 · 깨진 키는 고쳐질 일이 없다 — 사라짐으로(구독 삭제). 던지면 회차가 멈춰 같은 회차 남의 푸시까지 잃는다
        val body = runCatching { WebPushCrypto.encrypt(payload(message), subscription.p256dhBytes, subscription.authBytes) }
            .getOrElse {
                log.warn("Push key unusable host={} error={}", URI(subscription.endpoint).host, it.javaClass.simpleName)
                return PushOutcome.GONE
            }
        val request = HttpRequest.newBuilder(URI(subscription.endpoint))
            .timeout(Duration.ofSeconds(10))
            .header("Authorization", vapid.header(subscription.endpoint))
            .header("Content-Encoding", "aes128gcm")
            .header("Content-Type", "application/octet-stream")
            .header("TTL", PushPolicy.TTL.seconds.toString())
            .header("Urgency", "normal")
            .POST(HttpRequest.BodyPublishers.ofByteArray(body))
            .build()
        val status = runCatching { http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode() }
            .getOrElse {
                log.warn("Push send failed host={} error={}", URI(subscription.endpoint).host, it.javaClass.simpleName)
                return PushOutcome.FAILED
            }
        return when (status) {
            in 200..299 -> PushOutcome.DELIVERED
            404, 410 -> PushOutcome.GONE
            else -> {
                log.warn("Push rejected host={} status={}", URI(subscription.endpoint).host, status)
                PushOutcome.FAILED
            }
        }
    }
}
