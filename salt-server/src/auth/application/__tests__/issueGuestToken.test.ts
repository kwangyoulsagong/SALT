import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GuestAccessDisabledError } from "../../domain";
import { IssueGuestToken } from "../IssueGuestToken";

/** `SRV-REQ-056` FR-1 · `ADR-011` — 게스트 토큰 발급. 공개 스위치 하나로 되돌린다 */
describe("IssueGuestToken", () => {
  it("켜져 있으면 발급기의 토큰을 그대로 준다", () => {
    const issuer = { issueGuest: () => ({ guestToken: "g", expiresIn: 1800 }) };
    assert.deepEqual(new IssueGuestToken(issuer, true).execute(), { guestToken: "g", expiresIn: 1800 });
  });

  it("꺼져 있으면(PUBLIC_MARKET_GUEST=false) GuestAccessDisabledError(403) — 발급기를 부르지 않는다", () => {
    let called = 0;
    const counting = { issueGuest: () => (called++, { guestToken: "g", expiresIn: 1800 }) };
    assert.throws(
      () => new IssueGuestToken(counting, false).execute(),
      (error: unknown) => error instanceof GuestAccessDisabledError && error.code === "GUEST_DISABLED"
    );
    assert.equal(called, 0);
  });
});
