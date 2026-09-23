import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toUpstreamClientError } from "../error.util";

/** 서버 4xx 보존 (`BFF-REQ-025` FR-6 · `BFF-REQ-023` FR-60). */

const upstream = (status: number, data: unknown, headers: Record<string, unknown> = {}) =>
  ({ response: { status, data, headers } }) as unknown;

describe("toUpstreamClientError", () => {
  it("쿨다운 429 의 Retry-After 헤더와 본문 retryAfterSeconds 를 둘 다 옮긴다", () => {
    const error = toUpstreamClientError(
      upstream(
        429,
        { success: false, code: "COACH_REGENERATE_COOLDOWN", message: "cooling", retryAfterSeconds: 240 },
        { "retry-after": "240" }
      )
    );

    assert.deepEqual(error, {
      status: 429,
      code: "COACH_REGENERATE_COOLDOWN",
      message: "cooling",
      retryAfter: "240",
      retryAfterSeconds: 240,
    });
  });

  it("retryAfterSeconds 가 정수가 아니면 옮기지 않는다 — 지어내지 않는다", () => {
    const error = toUpstreamClientError(upstream(429, { message: "x", retryAfterSeconds: "240" }));
    assert.equal(error?.retryAfterSeconds, undefined);
    assert.equal(
      toUpstreamClientError(upstream(429, { message: "x", retryAfterSeconds: 1.5 }))?.retryAfterSeconds,
      undefined
    );
  });

  it("5xx 는 다루지 않는다", () => {
    assert.equal(toUpstreamClientError(upstream(503, { message: "down" })), null);
  });
});
