package com.salt.support.web

/**
 * 인증된 사용자 — Express `req.user`(`JwtPayload { userId, email }`)와 같은 두 값. 컨트롤러 인자로 받는다.
 * 사용자별 데이터는 **이 [userId] 조건**을 쿼리에 넣는다(`auth-security.md`).
 */
data class AuthenticatedUser(val userId: String, val email: String)
