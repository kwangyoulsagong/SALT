import { JwtUtil } from "../../shared/lib/jwt";
import type { TokenIssuer } from "../domain";

/**
 * JWT 발급·검증.
 *
 * `readRefresh` 가 **예외 대신 `null`** 을 주는 것은 Port 의 계약이다 — 만료는 정상
 * 경로이고, 유스케이스가 `try/catch` 로 흐름을 만들지 않게 한다.
 */
export class JwtTokenIssuer implements TokenIssuer {
  issue(userId: string, email: string) {
    return {
      accessToken: JwtUtil.generateAccessToken(userId, email),
      refreshToken: JwtUtil.generateRefreshToken(userId, email),
    };
  }

  issueAccess(userId: string, email: string): string {
    return JwtUtil.generateAccessToken(userId, email);
  }

  readRefresh(token: string): { userId: string; email: string } | null {
    try {
      const decoded = JwtUtil.verifyRefreshToken(token);
      return { userId: decoded.userId, email: decoded.email };
    } catch {
      return null;
    }
  }
}
