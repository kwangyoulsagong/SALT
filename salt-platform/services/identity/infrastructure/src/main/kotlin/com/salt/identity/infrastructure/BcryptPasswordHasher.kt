package com.salt.identity.infrastructure

import com.salt.identity.domain.PasswordHasher
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder

/**
 * bcrypt — 옛 Express(`bcryptjs`, cost 10, `$2b$`)와 같은 판 · 같은 비용. 옮겨 온 해시를 그대로 맞추고, 새 해시도 옛 검증기가 읽는다
 * (되돌리기 — identity-import-rollback 뒤 Express 로 돌아가도 그 사이 바뀐 해시가 없다: 비밀번호 바꾸기 경로 0).
 */
class BcryptPasswordHasher : PasswordHasher {
    private val encoder = BCryptPasswordEncoder(BCryptPasswordEncoder.BCryptVersion.`$2B`, COST)

    override fun hash(plain: String): String = encoder.encode(plain)!!

    override fun matches(plain: String, hash: String): Boolean = encoder.matches(plain, hash)

    private companion object {
        const val COST = 10
    }
}
