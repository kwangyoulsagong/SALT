import { createHmac } from "node:crypto";

import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * 게스트 토큰의 받는 쪽 표지(`aud`). 사람 토큰엔 없다 — 둘을 섞어 읽는 자리가 생겨도 표지로 한 번 더 가른다.
 */
export const GUEST_AUDIENCE = "salt-guest";

/**
 * 게스트 토큰 서명 비밀 — `JWT_SECRET` 에서 파생한다(`SRV-REQ-056` FR-1).
 *
 * **불변식: 게스트 토큰은 사람 경로(`authMiddleware`)를 통과하지 못한다.** 같은 비밀로 서명하면 `verifyAccessToken` 이
 * 게스트 토큰을 받아 `req.user.userId` 가 비는 사람으로 들어온다 — 코드 한 줄이 아니라 **비밀이 다르다**는 사실로 막는다.
 * 파생이라 새 env 를 늘리지 않고, `JWT_SECRET` 을 돌리면 게스트 토큰도 같이 무효가 된다.
 */
const guestSecret = (): string => createHmac("sha256", env.JWT_SECRET).update("salt-guest-token").digest("hex");

export class JwtUtil {
  static generateAccessToken(userId: string, email: string): string {
    // @ts-ignore
    return jwt.sign({ userId, email }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
  }

  static generateRefreshToken(userId: string, email: string): string {
    // @ts-ignore
    return jwt.sign({ userId, email }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });
  }

  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  }

  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  }

  /** 사람 정보 0 — 본문은 `{ kind: "guest" }` 뿐 */
  static generateGuestToken(): string {
    // @ts-ignore — expiresIn 은 "30m" 같은 문자열(env)
    return jwt.sign({ kind: "guest" }, guestSecret(), { expiresIn: env.GUEST_TOKEN_TTL, audience: GUEST_AUDIENCE });
  }

  /** 서명 · 만료 · `aud` 가 맞으면 통과. 아니면 jsonwebtoken 예외 그대로 */
  static verifyGuestToken(token: string): void {
    jwt.verify(token, guestSecret(), { audience: GUEST_AUDIENCE });
  }

  /** 발급 응답의 `expiresIn`(초) — 쿠키 수명을 맞추려고 토큰에서 읽는다 */
  static guestExpiresInSeconds(token: string): number {
    const decoded = jwt.decode(token) as { exp: number; iat: number };
    return decoded.exp - decoded.iat;
  }
}
