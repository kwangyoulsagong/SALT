import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../../config/env";
import { GUEST_AUDIENCE, JwtUtil } from "../../lib/jwt";
import { authMiddleware } from "../authMiddleware";
import { marketReaderMiddleware } from "../marketReaderMiddleware";
import { ownerOnlyMiddleware } from "../ownerOnlyMiddleware";

/**
 * `SRV-REQ-056` · `ADR-011` — 시장 경로는 사람 토큰 **또는** 게스트 토큰, 나머지(★ · 포트폴리오 · 코치)는 사람 토큰만.
 *
 * 핵심 불변식: **게스트 토큰은 `authMiddleware` 를 지나지 못한다.** 비밀이 달라서다(`jwt.ts` `guestSecret`) —
 * 이 표가 그 사실을 토큰 종류 × 미들웨어 전부로 잰다. 발급 유스케이스 테스트는 `auth/application/__tests__/issueGuestToken.test.ts`.
 */

const past = () => Math.floor(Date.now() / 1000) - 60;

/** 게스트 비밀 파생은 `jwt.ts` 와 같은 식이다 — 만료된 게스트 토큰을 만들려면 비밀이 필요하다(발급 함수는 지금 시각만 쓴다) */
const guestSecret = createHmac("sha256", env.JWT_SECRET).update("salt-guest-token").digest("hex");

const tokens = {
  "사람 토큰": () => JwtUtil.generateAccessToken("u1", "friend@example.com"),
  "게스트 토큰": () => JwtUtil.generateGuestToken(),
  "만료된 게스트 토큰": () => jwt.sign({ kind: "guest", exp: past() }, guestSecret, { audience: GUEST_AUDIENCE }),
  "토큰 없음": () => null,
  "다른 비밀로 서명": () => jwt.sign({ userId: "u1", email: "friend@example.com" }, "not-the-server-secret"),
  "만료된 사람 토큰": () => jwt.sign({ userId: "u1", email: "friend@example.com", exp: past() }, env.JWT_SECRET),
} as const;

type TokenKind = keyof typeof tokens;

type Outcome =
  | { pass: true; reader?: Request["reader"]; user?: Request["user"] }
  | { pass: false; status: number; message: string };

const run = (middleware: (req: Request, res: Response, next: NextFunction) => void, token: string | null): Outcome => {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} } as Request;
  let outcome: Outcome | undefined;
  middleware(req, {} as Response, (error?: unknown) => {
    if (error) {
      const e = error as { statusCode: number; message: string };
      outcome = { pass: false, status: e.statusCode, message: e.message };
    } else {
      outcome = { pass: true, reader: req.reader, user: req.user };
    }
  });
  assert.ok(outcome, "next 를 반드시 한 번 부른다");
  return outcome;
};

/** 경계 표 — 토큰 종류 × {시장 읽기, 사람만}. 기대값은 통과(true) 또는 401 메시지 */
const table: Array<{ token: TokenKind; market: true | string; auth: true | string }> = [
  { token: "사람 토큰", market: true, auth: true },
  { token: "게스트 토큰", market: true, auth: "Invalid token" },
  { token: "만료된 게스트 토큰", market: "Token expired", auth: "Invalid token" },
  { token: "토큰 없음", market: "No token provided", auth: "No token provided" },
  { token: "다른 비밀로 서명", market: "Invalid token", auth: "Invalid token" },
  { token: "만료된 사람 토큰", market: "Token expired", auth: "Token expired" },
];

const verdict = (v: true | string) => (v === true ? "통과" : `401 ${v}`);

describe("marketReaderMiddleware × authMiddleware — 토큰 경계 표(ADR-011)", () => {
  for (const row of table) {
    it(`${row.token} — 시장 읽기 ${verdict(row.market)} · 사람만 ${verdict(row.auth)}`, () => {
      const token = tokens[row.token]();
      const cases = [
        ["marketReaderMiddleware", marketReaderMiddleware, row.market],
        ["authMiddleware", authMiddleware, row.auth],
      ] as const;
      for (const [name, middleware, expected] of cases) {
        const outcome = run(middleware, token);
        if (expected === true) assert.equal(outcome.pass, true, `${name} 는 통과해야 한다`);
        else assert.deepEqual(outcome, { pass: false, status: 401, message: expected }, name);
      }
    });
  }

  it("핵심 불변식 — 게스트 토큰은 사람 경로에서 401 이고 req.user 를 채우지 않는다", () => {
    const req = { headers: { authorization: `Bearer ${JwtUtil.generateGuestToken()}` } } as Request;
    let status: number | undefined;
    authMiddleware(req, {} as Response, (error?: unknown) => {
      status = (error as { statusCode?: number } | undefined)?.statusCode;
    });
    assert.equal(status, 401);
    assert.equal(req.user, undefined);
  });

  it("게스트 → 시장 읽기는 reader.kind 'guest' · 사람 칸(req.user)은 비어 있다", () => {
    const outcome = run(marketReaderMiddleware, JwtUtil.generateGuestToken());
    assert.deepEqual(outcome, { pass: true, reader: { kind: "guest" }, user: undefined });
  });

  it("사람 → 시장 읽기는 reader.kind 'user' 와 req.user 를 함께 채운다(검색 ★ 같은 사람 칸)", () => {
    const outcome = run(marketReaderMiddleware, JwtUtil.generateAccessToken("u1", "friend@example.com"));
    assert.equal(outcome.pass, true);
    if (!outcome.pass) return;
    assert.deepEqual(outcome.reader, { kind: "user", userId: "u1", email: "friend@example.com" });
    assert.equal(outcome.user?.userId, "u1");
  });

  it("만료된 사람 토큰은 게스트로 내려가지 않는다 — 401 Token expired(화면이 갱신해야 ★ · 코치가 돌아온다)", () => {
    assert.deepEqual(run(marketReaderMiddleware, tokens["만료된 사람 토큰"]()), {
      pass: false,
      status: 401,
      message: "Token expired",
    });
  });

  it("게스트 토큰 본문엔 사람 정보가 없다 — kind · aud · 시각뿐", () => {
    const decoded = jwt.decode(JwtUtil.generateGuestToken()) as Record<string, unknown>;
    assert.deepEqual(Object.keys(decoded).sort(), ["aud", "exp", "iat", "kind"]);
    assert.equal(decoded.aud, GUEST_AUDIENCE);
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
