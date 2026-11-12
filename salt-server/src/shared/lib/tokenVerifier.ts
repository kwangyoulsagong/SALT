import { createHmac, createPublicKey, type JsonWebKey, type KeyObject } from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../config/env";

/**
 * 토큰 검증 — identity(Kotlin)가 발급한 RS256 + 옛 Express HS256 을 `LEGACY_HS_UNTIL` 까지(`SRV-REQ-048` FR-8, 서버 S3b 2026-11-12).
 *
 * **Express 는 이제 토큰을 만들지 않는다** — 발급은 identity 하나, 여기는 리소스 서버(검증만). 같은 판정 표를 플랫폼
 * `DualTokenVerifier`(Kotlin)가 돈다 — 두 곳의 경계가 같아야 한 토큰이 경로마다 다르게 읽히지 않는다(`tokenVerifier.test.ts`).
 *
 * 불변식 둘
 * 1. **받는 쪽(`aud`)이 다른 토큰은 서로의 경로를 지나지 못한다** — 갱신(salt-refresh) · 게스트(salt-guest)는 사람 경로(salt-api) 0
 * 2. 옛 HS 는 끝 시각부터 서명이 맞아도 거절 — 이중 기간 끝 = env 값 하나. 그 뒤 HS 분기 · `JWT_SECRET` 을 지운다
 */

export const TOKEN_ISSUER = "salt-identity";
export const AUDIENCE_API = "salt-api";
export const AUDIENCE_GUEST = "salt-guest";
/** 계정 삭제 허가(서버 S3c) — 비밀번호를 다시 확인한 뒤 identity 가 내주는 5분 토큰. 사람 · 시장 경로를 지나지 못한다 */
export const AUDIENCE_ERASE = "salt-erase";

export interface TokenPerson {
  userId: string;
  email: string;
}

export type TokenCheck =
  | { kind: "person"; person: TokenPerson; legacy: boolean }
  | { kind: "guest"; legacy: boolean }
  | { kind: "expired" }
  | { kind: "invalid" }
  /** RS 토큰인데 JWKS 를 못 읽었다 — 토큰 탓이 아니다(503, 화면이 로그인으로 튕기지 않게) */
  | { kind: "unavailable" };

/** 공개키 — kid → KeyObject. 운영은 [JwksKeys], 테스트는 고정 표 */
export interface KeySource {
  key(kid: string): Promise<KeyObject | null | "unavailable">;
}

/**
 * identity JWKS(`IDENTITY_JWKS_URL`) — 1분 캐시, 모르는 kid 면 다시 읽는다(5초에 한 번 — 틀린 kid 로 identity 를 두드리지 않게).
 * 읽기 실패면 직전 표를 계속 쓴다. 표가 아예 없을 때만 unavailable.
 */
export class JwksKeys implements KeySource {
  private keys = new Map<string, KeyObject>();
  private loadedAt = -Infinity;
  private loaded = false;

  constructor(
    private readonly url: string,
    private readonly now: () => number = Date.now,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async key(kid: string): Promise<KeyObject | null | "unavailable"> {
    const age = this.now() - this.loadedAt;
    if (!this.loaded || age >= 60_000 || (!this.keys.has(kid) && age >= 5_000)) await this.reload();
    if (!this.loaded) return "unavailable";
    return this.keys.get(kid) ?? null;
  }

  private async reload(): Promise<void> {
    this.loadedAt = this.now();
    try {
      const res = await this.fetcher(this.url, { signal: AbortSignal.timeout(3_000) });
      if (!res.ok) return;
      const body = (await res.json()) as { keys?: Array<JsonWebKey & { kid?: string; kty?: string }> };
      const next = new Map<string, KeyObject>();
      for (const jwk of body.keys ?? []) {
        if (jwk.kty !== "RSA" || !jwk.kid) continue;
        next.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
      }
      this.keys = next;
      this.loaded = true;
    } catch {
      // 직전 표를 계속 쓴다 — identity 가 잠깐 내려가도 이미 받은 키로 검증된다
    }
  }
}

/** 옛 게스트 비밀 — `JWT_SECRET` 파생(옛 `jwt.ts` 그대로). 이중 기간 동안만 */
const legacyGuestSecret = (secret: string): string => createHmac("sha256", secret).update("salt-guest-token").digest("hex");

const expired = (error: unknown): boolean => (error as Error)?.name === "TokenExpiredError";

/** 서명 확인 뒤(만료로 판정된 뒤)에만 쓴다 — 받는 쪽이 게스트인 모양인가 */
const isGuestShaped = (token: string): boolean => {
  const payload = jwt.decode(token);
  if (!payload || typeof payload === "string") return false;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  return aud.includes(AUDIENCE_GUEST) || payload.kind === "guest";
};

export class TokenVerifier {
  constructor(
    private readonly keys: KeySource,
    private readonly legacySecret: string,
    private readonly legacyUntil: Date,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * 사람 경로 — 사람 토큰만. 게스트 토큰은 만료됐든 아니든 invalid(옛 동작 그대로 — 게스트는 갱신으로 사람이 되지 않는다,
   * `Token expired` 를 주면 화면이 갱신을 시도한다)
   */
  async person(token: string): Promise<TokenCheck> {
    const check = await this.check(token);
    if (check.kind === "guest") return { kind: "invalid" };
    if (check.kind === "expired" && isGuestShaped(token)) return { kind: "invalid" };
    return check;
  }

  /** 사람 또는 게스트(시장 경로) */
  async check(token: string): Promise<TokenCheck> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded.payload === "string") return { kind: "invalid" };
    if (decoded.header.alg === "RS256") return this.checkRs(token, decoded.header.kid);
    if (decoded.header.alg === "HS256") return this.checkLegacy(token);
    return { kind: "invalid" };
  }

  private async checkRs(token: string, kid: string | undefined): Promise<TokenCheck> {
    if (!kid) return { kind: "invalid" };
    const key = await this.keys.key(kid);
    if (key === "unavailable") return { kind: "unavailable" };
    if (!key) return { kind: "invalid" };
    try {
      // clockTimestamp — 테스트 시계. 시계 오차 허용 0(옛 기본 그대로)
      const claims = jwt.verify(token, key, {
        algorithms: ["RS256"],
        issuer: TOKEN_ISSUER,
        audience: [AUDIENCE_API, AUDIENCE_GUEST],
        clockTimestamp: Math.floor(this.now() / 1000),
      }) as jwt.JwtPayload;
      const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (aud.includes(AUDIENCE_API)) return this.personOf(claims, false);
      return claims.kind === "guest" ? { kind: "guest", legacy: false } : { kind: "invalid" };
    } catch (error) {
      return expired(error) ? { kind: "expired" } : { kind: "invalid" };
    }
  }

  /**
   * 지우기 허가(`X-Salt-Erase`) — RS256 · `aud` salt-erase 만. 옛 HS 는 받지 않는다(허가는 S3c 에 처음 생겼다).
   * 같은 판정을 플랫폼 `EraseGrants`(Kotlin)가 돈다. 통과면 그 사람, 아니면 null(만료 · 서명 · 받는 쪽 — 이유를 가르지 않는다)
   */
  async eraseGrant(token: string): Promise<TokenPerson | null> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded.payload === "string" || decoded.header.alg !== "RS256" || !decoded.header.kid) return null;
    const key = await this.keys.key(decoded.header.kid);
    if (!key || key === "unavailable") return null;
    try {
      const claims = jwt.verify(token, key, {
        algorithms: ["RS256"],
        issuer: TOKEN_ISSUER,
        audience: AUDIENCE_ERASE,
        clockTimestamp: Math.floor(this.now() / 1000),
      }) as jwt.JwtPayload;
      const check = this.personOf(claims, false);
      return check.kind === "person" ? check.person : null;
    } catch {
      return null;
    }
  }

  private checkLegacy(token: string): TokenCheck {
    if (this.now() >= this.legacyUntil.getTime()) return { kind: "invalid" };
    const clockTimestamp = Math.floor(this.now() / 1000);
    try {
      const claims = jwt.verify(token, this.legacySecret, { algorithms: ["HS256"], clockTimestamp }) as jwt.JwtPayload;
      // 옛 사람 토큰에는 aud 가 없다 — aud 가 있는 HS 는 사람 토큰이 아니다
      return claims.aud === undefined ? this.personOf(claims, true) : { kind: "invalid" };
    } catch (error) {
      if (expired(error)) return { kind: "expired" };
    }
    try {
      jwt.verify(token, legacyGuestSecret(this.legacySecret), { algorithms: ["HS256"], audience: AUDIENCE_GUEST, clockTimestamp });
      return { kind: "guest", legacy: true };
    } catch (error) {
      return expired(error) ? { kind: "expired" } : { kind: "invalid" };
    }
  }

  private personOf(claims: jwt.JwtPayload, legacy: boolean): TokenCheck {
    if (typeof claims.userId !== "string" || claims.userId.length === 0) return { kind: "invalid" };
    return { kind: "person", person: { userId: claims.userId, email: typeof claims.email === "string" ? claims.email : "" }, legacy };
  }
}

/** 운영 검증기 하나 — 미들웨어 둘(`authMiddleware` · `marketReaderMiddleware`)이 같은 것을 쓴다 */
export const tokenVerifier = new TokenVerifier(new JwksKeys(env.IDENTITY_JWKS_URL), env.JWT_SECRET, env.LEGACY_HS_UNTIL);
