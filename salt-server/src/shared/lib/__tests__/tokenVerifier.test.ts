import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync, type KeyObject } from "node:crypto";
import { describe, it } from "node:test";

import jwt from "jsonwebtoken";

import { AUDIENCE_API, AUDIENCE_GUEST, JwksKeys, TOKEN_ISSUER, TokenVerifier, type KeySource } from "../tokenVerifier";

/**
 * 이중 검증 경계 표(`SRV-REQ-048` FR-8 · 수용 기준 "이중 검증 기간 옛 · 새 토큰 모두 통과, 종료 후 옛 토큰 401").
 * 플랫폼 `DualTokenVerifierSpec`(Kotlin)과 같은 표 — 두 리소스 서버가 한 토큰을 다르게 읽지 않게.
 * 불변식 ① 받는 쪽(`aud`)이 다른 토큰은 서로의 경로를 못 지난다 ② 옛 HS 는 끝 시각부터 서명이 맞아도 거절.
 */

const NOW = Date.parse("2026-11-12T03:00:00Z");
const UNTIL = new Date("2026-11-26T15:00:00Z");
const SECRET = "legacy-secret-at-least-32-bytes-long-0123";
const sec = (ms: number) => Math.floor(ms / 1000);

const pair = () => generateKeyPairSync("rsa", { modulusLength: 2048 });
const key = pair();
const stranger = pair();
const KID = "kid-1";

const keys = (map: Record<string, KeyObject> = { [KID]: key.publicKey }): KeySource => ({ key: async (kid) => map[kid] ?? null });
const verifier = (now = NOW, source = keys()) => new TokenVerifier(source, SECRET, UNTIL, () => now);

const person = { userId: "u1", email: "u1@example.com" };
const rs = (
  claims: Record<string, unknown> = {},
  opts: { aud?: string | null; iss?: string | null; exp?: number | null; signer?: KeyObject; kid?: string | null } = {},
) => {
  const payload: Record<string, unknown> = { ...person, iat: sec(NOW) - 10, ...claims };
  if (opts.aud !== null) payload.aud = opts.aud ?? AUDIENCE_API;
  if (opts.iss !== null) payload.iss = opts.iss ?? TOKEN_ISSUER;
  if (opts.exp !== null) payload.exp = opts.exp ?? sec(NOW) + 900;
  return jwt.sign(payload, opts.signer ?? key.privateKey, {
    algorithm: "RS256",
    ...(opts.kid === null ? {} : { keyid: opts.kid ?? KID }),
  });
};
const hs = (payload: Record<string, unknown> = {}, secret = SECRET) =>
  jwt.sign({ ...person, iat: sec(NOW) - 10, exp: sec(NOW) + 900, ...payload }, secret, { algorithm: "HS256" });
const legacyGuest = (exp = sec(NOW) + 900) =>
  jwt.sign({ kind: "guest", exp }, createHmac("sha256", SECRET).update("salt-guest-token").digest("hex"), { audience: AUDIENCE_GUEST });

describe("TokenVerifier — 이중 검증 경계 표", () => {
  it("새 RS · 옛 HS 둘 다 사람으로 통과 — 이중 기간", async () => {
    assert.deepEqual(await verifier().person(rs()), { kind: "person", person, legacy: false });
    assert.deepEqual(await verifier().person(hs()), { kind: "person", person, legacy: true });
  });

  it("끝 시각부터 옛 HS(사람 · 게스트)는 서명이 맞아도 invalid · 1초 전 통과 · 새 RS 는 그대로", async () => {
    const at = UNTIL.getTime();
    const long = { exp: sec(at) + 60 };
    assert.deepEqual(await verifier(at).check(hs(long)), { kind: "invalid" });
    assert.deepEqual(await verifier(at).check(legacyGuest(sec(at) + 60)), { kind: "invalid" });
    assert.equal((await verifier(at - 1000).check(hs(long))).kind, "person");
    assert.equal((await verifier(at + 1000).check(rs({}, { exp: sec(at) + 600 }))).kind, "person");
  });

  it("받는 쪽이 다르면 — 갱신 토큰 invalid · 게스트는 시장 읽기만 · aud 없는 RS invalid", async () => {
    assert.deepEqual(await verifier().check(rs({}, { aud: "salt-refresh" })), { kind: "invalid" });
    assert.deepEqual(await verifier().check(rs({}, { aud: null })), { kind: "invalid" });
    const guest = rs({ kind: "guest", userId: undefined, email: undefined }, { aud: AUDIENCE_GUEST });
    assert.deepEqual(await verifier().check(guest), { kind: "guest", legacy: false });
    assert.deepEqual(await verifier().person(guest), { kind: "invalid" });
    // 게스트 aud 인데 kind 가 없으면 게스트도 아니다
    assert.deepEqual(await verifier().check(rs({}, { aud: AUDIENCE_GUEST })), { kind: "invalid" });
  });

  it("옛 HS — aud 있는 사람 모양 invalid · 다른 비밀 invalid · 옛 게스트는 시장 읽기만", async () => {
    assert.deepEqual(await verifier().check(hs({ aud: AUDIENCE_GUEST })), { kind: "invalid" });
    assert.deepEqual(await verifier().check(hs({}, "another-secret-at-least-32-bytes-long-999")), { kind: "invalid" });
    assert.deepEqual(await verifier().check(legacyGuest()), { kind: "guest", legacy: true });
    assert.deepEqual(await verifier().person(legacyGuest()), { kind: "invalid" });
  });

  it("발급자 다름 · 모르는 kid · kid 없음 · 믿는 kid 에 다른 키 서명 invalid", async () => {
    assert.deepEqual(await verifier().check(rs({}, { iss: "someone" })), { kind: "invalid" });
    assert.deepEqual(await verifier().check(rs({}, { kid: "nope" })), { kind: "invalid" });
    assert.deepEqual(await verifier().check(rs({}, { kid: null })), { kind: "invalid" });
    assert.deepEqual(await verifier().check(rs({}, { signer: stranger.privateKey })), { kind: "invalid" });
  });

  it("만료 경계 — exp 정각 expired · 1초 전 통과 · 서명이 틀리면 만료여도 invalid", async () => {
    assert.deepEqual(await verifier().check(rs({}, { exp: sec(NOW) })), { kind: "expired" });
    assert.equal((await verifier().check(rs({}, { exp: sec(NOW) + 1 }))).kind, "person");
    assert.deepEqual(await verifier().check(hs({ exp: sec(NOW) })), { kind: "expired" });
    assert.deepEqual(await verifier().check(legacyGuest(sec(NOW) - 60)), { kind: "expired" });
    assert.deepEqual(await verifier().check(rs({}, { exp: sec(NOW) - 60, signer: stranger.privateKey })), { kind: "invalid" });
    assert.deepEqual(await verifier().check(hs({ exp: sec(NOW) - 60 }, "another-secret-at-least-32-bytes-long-999")), { kind: "invalid" });
  });

  it("알고리즘 none · HS512 · 깨진 글자 · userId 없는 사람 모양 invalid", async () => {
    const none = jwt.sign({ ...person, exp: sec(NOW) + 900 }, "", { algorithm: "none" });
    assert.deepEqual(await verifier().check(none), { kind: "invalid" });
    assert.deepEqual(await verifier().check(jwt.sign(person, SECRET + SECRET, { algorithm: "HS512" })), { kind: "invalid" });
    assert.deepEqual(await verifier().check("abc.def.ghi"), { kind: "invalid" });
    assert.deepEqual(await verifier().check(rs({ userId: "" })), { kind: "invalid" });
  });

  it("JWKS 를 못 읽으면 RS 는 unavailable(401 로 접지 않는다) · 옛 HS 는 그대로", async () => {
    const down: KeySource = { key: async () => "unavailable" };
    assert.deepEqual(await verifier(NOW, down).check(rs()), { kind: "unavailable" });
    assert.equal((await verifier(NOW, down).check(hs())).kind, "person");
  });
});

describe("JwksKeys — 캐시 · 다시 읽기", () => {
  const jwk = { ...key.publicKey.export({ format: "jwk" }), kid: KID, kty: "RSA" };
  const body = (keysList: unknown[]) => new Response(JSON.stringify({ keys: keysList }), { status: 200 });

  it("한 번 읽고 1분 캐시 · 모르는 kid 는 5초 뒤에만 다시 읽는다 · 실패하면 직전 표", async () => {
    let now = 0;
    let calls = 0;
    let fail = false;
    const fetcher = (async () => {
      calls += 1;
      if (fail) throw new Error("down");
      return body([jwk]);
    }) as unknown as typeof fetch;
    const source = new JwksKeys("http://identity/.well-known/jwks.json", () => now, fetcher);
    assert.ok(await source.key(KID));
    assert.ok(await source.key(KID));
    assert.equal(calls, 1);
    assert.equal(await source.key("other"), null);
    assert.equal(calls, 1, "5초 안에는 모르는 kid 로 다시 읽지 않는다");
    now = 5_000;
    assert.equal(await source.key("other"), null);
    assert.equal(calls, 2);
    fail = true;
    now = 120_000;
    assert.ok(await source.key(KID), "실패하면 직전 표");
  });

  it("처음부터 못 읽으면 unavailable", async () => {
    const fetcher = (async () => new Response("", { status: 503 })) as unknown as typeof fetch;
    assert.equal(await new JwksKeys("http://x", () => 0, fetcher).key(KID), "unavailable");
  });
});
