import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InviteCode, normalizeInviteCode } from "../InviteCode";
import { judgeInviteAcceptance, publicRejectionOf } from "../policy/inviteAcceptance";

const NOW = new Date("2026-09-18T00:00:00.000Z");
const LATER = new Date("2026-12-31T00:00:00.000Z");

const codeOf = (overrides: Partial<Parameters<typeof InviteCode.from>[0]> = {}) =>
  InviteCode.from({
    id: "inv-1",
    code: "SALTAAAA",
    expiresAt: LATER,
    usedByUserId: null,
    ...overrides,
  });

describe("judgeInviteAcceptance", () => {
  it("멀쩡한 코드 + 자리 있음 → 통과", () => {
    const rejection = judgeInviteAcceptance({
      invite: codeOf(),
      now: NOW,
      activeUserCount: 3,
      maxAccounts: 10,
    });

    assert.equal(rejection, null);
  });

  it("없는 코드 · 사용된 코드 · 만료된 코드를 구분한다", () => {
    const base = { now: NOW, activeUserCount: 0, maxAccounts: 10 };

    assert.equal(judgeInviteAcceptance({ ...base, invite: null }), "not_found");
    assert.equal(
      judgeInviteAcceptance({ ...base, invite: codeOf({ usedByUserId: "u-9" }) }),
      "used"
    );
    assert.equal(
      judgeInviteAcceptance({
        ...base,
        invite: codeOf({ expiresAt: new Date("2026-09-17T23:59:59.000Z") }),
      }),
      "expired"
    );
  });

  it("만료 시각 **정각**은 만료다", () => {
    const rejection = judgeInviteAcceptance({
      invite: codeOf({ expiresAt: NOW }),
      now: NOW,
      activeUserCount: 0,
      maxAccounts: 10,
    });

    assert.equal(rejection, "expired");
  });

  it("자리가 차면 quota 다", () => {
    const rejection = judgeInviteAcceptance({
      invite: codeOf(),
      now: NOW,
      activeUserCount: 10,
      maxAccounts: 10,
    });

    assert.equal(rejection, "quota");
  });

  /**
   * **이 순서가 규칙이다.** 상한을 먼저 보면 정원이 찼을 때 *아무 코드나* `quota` 를 받고,
   * 그러면 무인증 `check` 로 정원 상태를 읽을 수 있게 된다 (`SRV-REQ-009` FR-4 우회).
   */
  it("정원이 찼어도 **잘못된 코드는 코드 사유**로 답한다", () => {
    const full = { now: NOW, activeUserCount: 10, maxAccounts: 10 };

    assert.equal(judgeInviteAcceptance({ ...full, invite: null }), "not_found");
    assert.equal(
      judgeInviteAcceptance({ ...full, invite: codeOf({ usedByUserId: "u-9" }) }),
      "used"
    );
  });
});

describe("publicRejectionOf", () => {
  it("quota 를 지운다 — 무인증 경로가 정원 상태를 노출하지 않는다", () => {
    assert.equal(publicRejectionOf("quota"), null);
  });

  it("나머지 셋은 그대로 내보낸다", () => {
    assert.equal(publicRejectionOf("not_found"), "not_found");
    assert.equal(publicRejectionOf("used"), "used");
    assert.equal(publicRejectionOf("expired"), "expired");
    assert.equal(publicRejectionOf(null), null);
  });
});

describe("normalizeInviteCode", () => {
  it("붙여넣기에 섞이는 공백·줄바꿈·소문자를 같은 값으로 만든다", () => {
    assert.equal(normalizeInviteCode(" salt aaaa\n"), "SALTAAAA");
    assert.equal(normalizeInviteCode("SALT-AAAA"), "SALT-AAAA");
  });
});
