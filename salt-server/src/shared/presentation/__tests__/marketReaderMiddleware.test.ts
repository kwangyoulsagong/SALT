import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { AUDIENCE_API, AUDIENCE_GUEST, TOKEN_ISSUER, TokenVerifier } from "../../lib/tokenVerifier";
import { createAuthMiddleware } from "../authMiddleware";
import { createMarketReaderMiddleware } from "../marketReaderMiddleware";
import { ownerOnlyMiddleware } from "../ownerOnlyMiddleware";

/**
 * `SRV-REQ-056` · `ADR-011` — 시장 경로는 사람 토큰 **또는** 게스트 토큰, 나머지(★ · 포트폴리오 · 코치)는 사람 토큰만.
 *
 * 핵심 불변식: **게스트 토큰은 `authMiddleware` 를 지나지 못한다.** 서버 S3b(2026-11-12)부터 발급은 identity(RS256) —
 * 새 토큰은 받는 쪽(`aud`)으로, 이중 기간의 옛 HS 는 비밀이 달라서 막힌다. 이 표가 토큰 종류 × 미들웨어 전부로 잰다.
 * 판정 경계(만료 정각 · 끝 시각 · kid)는 `shared/lib/__tests__/tokenVerifier.test.ts`.
 */

const SECRET = "legacy-secret-at-least-32-bytes-long-0123";
const KID = "kid-1";
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const verifier = new TokenVerifier({ key: async (kid) => (kid === KID ? publicKey : null) }, SECRET, new Date("2099-01-01T00:00:00Z"));
const authMiddleware = createAuthMiddleware(verifier);
const marketReaderMiddleware = createMarketReaderMiddleware(verifier);

const now = () => Math.floor(Date.now() / 1000);
const person = { userId: "u1", email: "friend@example.com" };
const rs = (payload: Record<string, unknown>, aud: string, exp = now() + 900) =>
  jwt.sign({ ...payload, aud, iss: TOKEN_ISSUER, exp }, privateKey, { algorithm: "RS256", keyid: KID });
const guestSecret = createHmac("sha256", SECRET).update("salt-guest-token").digest("hex");

const tokens = {
  "사람 토큰": () => rs(person, AUDIENCE_API),
  "게스트 토큰": () => rs({ kind: "guest" }, AUDIENCE_GUEST),
  "만료된 게스트 토큰": () => rs({ kind: "guest" }, AUDIENCE_GUEST, now() - 60),
  "갱신 토큰": () => rs(person, "salt-refresh"),
  "옛 HS 사람 토큰": () => jwt.sign(person, SECRET, { expiresIn: "15m" }),
  "옛 HS 게스트 토큰": () => jwt.sign({ kind: "guest" }, guestSecret, { expiresIn: "30m", audience: AUDIENCE_GUEST }),
  "토큰 없음": () => null,
  "다른 비밀로 서명": () => jwt.sign(person, "not-the-server-secret-at-least-32-bytes"),
  "만료된 사람 토큰": () => rs(person, AUDIENCE_API, now() - 60),
} as const;

type TokenKind = keyof typeof tokens;

type Outcome =
  | { pass: true; reader?: Request["reader"]; user?: Request["user"] }
  | { pass: false; status: number; message: string };

const run = (middleware: (req: Request, res: Response, next: NextFunction) => void, token: string | null): Promise<Outcome> =>
  new Promise((resolve) => {
    const req = { headers: token ? { authorization: `Bearer ${token}` } : {} } as Request;
    middleware(req, {} as Response, (error?: unknown) => {
      if (error) {
        const e = error as { statusCode: number; message: string };
        resolve({ pass: false, status: e.statusCode, message: e.message });
      } else {
        resolve({ pass: true, reader: req.reader, user: req.user });
      }
    });
  });

/** 경계 표 — 토큰 종류 × {시장 읽기, 사람만}. 기대값은 통과(true) 또는 401 메시지 */
const table: Array<{ token: TokenKind; market: true | string; auth: true | string }> = [
  { token: "사람 토큰", market: true, auth: true },
  { token: "게스트 토큰", market: true, auth: "Invalid token" },
  { token: "만료된 게스트 토큰", market: "Token expired", auth: "Invalid token" },
  { token: "갱신 토큰", market: "Invalid token", auth: "Invalid token" },
  { token: "옛 HS 사람 토큰", market: true, auth: true },
  { token: "옛 HS 게스트 토큰", market: true, auth: "Invalid token" },
  { token: "토큰 없음", market: "No token provided", auth: "No token provided" },
  { token: "다른 비밀로 서명", market: "Invalid token", auth: "Invalid token" },
  { token: "만료된 사람 토큰", market: "Token expired", auth: "Token expired" },
];

const verdict = (v: true | string) => (v === true ? "통과" : `401 ${v}`);

describe("marketReaderMiddleware × authMiddleware — 토큰 경계 표(ADR-011 · SRV-REQ-048 FR-8)", () => {
  for (const row of table) {
    it(`${row.token} — 시장 읽기 ${verdict(row.market)} · 사람만 ${verdict(row.auth)}`, async () => {
      const token = tokens[row.token]();
      const cases = [
        ["marketReaderMiddleware", marketReaderMiddleware, row.market],
        ["authMiddleware", authMiddleware, row.auth],
      ] as const;
      for (const [name, middleware, expected] of cases) {
        const outcome = await run(middleware, token);
        if (expected === true) assert.equal(outcome.pass, true, `${name} 는 통과해야 한다`);
        else assert.deepEqual(outcome, { pass: false, status: 401, message: expected }, name);
      }
    });
  }

  it("핵심 불변식 — 게스트 토큰은 사람 경로에서 401 이고 req.user 를 채우지 않는다", async () => {
    const req = { headers: { authorization: `Bearer ${tokens["게스트 토큰"]()}` } } as Request;
    const status = await new Promise<number | undefined>((resolve) =>
      authMiddleware(req, {} as Response, (error?: unknown) => resolve((error as { statusCode?: number } | undefined)?.statusCode)),
    );
    assert.equal(status, 401);
    assert.equal(req.user, undefined);
  });

  it("게스트 → 시장 읽기는 reader.kind 'guest' · 사람 칸(req.user)은 비어 있다", async () => {
    assert.deepEqual(await run(marketReaderMiddleware, tokens["게스트 토큰"]()), { pass: true, reader: { kind: "guest" }, user: undefined });
  });

  it("사람 → 시장 읽기는 reader.kind 'user' 와 req.user 를 함께 채운다(검색 ★ 같은 사람 칸)", async () => {
    const outcome = await run(marketReaderMiddleware, tokens["사람 토큰"]());
    assert.equal(outcome.pass, true);
    if (!outcome.pass) return;
    assert.deepEqual(outcome.reader, { kind: "user", userId: "u1", email: "friend@example.com" });
    assert.equal(outcome.user?.userId, "u1");
  });

  it("검증 키를 못 읽으면 401 이 아니라 503 — 화면이 로그인으로 튕기지 않는다", async () => {
    const down = createAuthMiddleware(new TokenVerifier({ key: async () => "unavailable" }, SECRET, new Date("2099-01-01T00:00:00Z")));
    assert.deepEqual(await run(down, tokens["사람 토큰"]()), { pass: false, status: 503, message: "Token keys unavailable" });
  });
});

describe("ownerOnlyMiddleware", () => {
  const runOwner = (user: Request["user"]) => {
    let result: unknown = "unset";
    ownerOnlyMiddleware(["Owner@Example.com "])({ user } as Request, {} as Response, (error?: unknown) => {
      result = error === undefined ? "pass" : (error as { statusCode: number }).statusCode;
    });
    return result;
  };

  it("소유자는 대소문자 · 공백 무시로 통과", () => {
    assert.equal(runOwner({ userId: "u1", email: "owner@example.com" }), "pass");
    assert.equal(runOwner({ userId: "u1", email: " OWNER@EXAMPLE.COM" }), "pass");
  });

  it("다른 이메일 · 사용자 없음은 403", () => {
    assert.equal(runOwner({ userId: "u2", email: "friend@example.com" }), 403);
    assert.equal(runOwner(undefined), 403);
  });
});
