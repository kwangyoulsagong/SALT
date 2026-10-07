import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { errorCodeOf, ExplanationSchemaMismatch, isRetryableGeminiError } from "../GeminiCoachExplainer";

/**
 * Gemini 재시도 판정 (F010 슬라이스 7). SDK 오류는 `error.status` 에 상태를 싣는다 — 공용 판정은 axios 모양만 읽어
 * 4xx 까지 재시도했다(요청 하나가 과금 3회).
 */
describe("isRetryableGeminiError", () => {
  it("SDK 모양 4xx 는 재시도하지 않고, 429 · 5xx · 응답 없음만 다시 건다", () => {
    assert.equal(isRetryableGeminiError(Object.assign(new Error("bad"), { status: 400 })), false);
    assert.equal(isRetryableGeminiError(Object.assign(new Error("key"), { status: 403 })), false);
    assert.equal(isRetryableGeminiError(Object.assign(new Error("rate"), { status: 429 })), true);
    assert.equal(isRetryableGeminiError(Object.assign(new Error("down"), { status: 503 })), true);
    assert.equal(isRetryableGeminiError(new Error("fetch failed")), true);
  });

  it("스키마 불일치는 다시 불러도 같다 — 재시도하지 않는다", () => {
    assert.equal(isRetryableGeminiError(new ExplanationSchemaMismatch("x")), false);
  });
});

describe("errorCodeOf — 원장 실패 분류(본문 없음)", () => {
  it("분류만 남긴다", () => {
    assert.equal(errorCodeOf(Object.assign(new Error("secret body"), { status: 429 })), "http_429");
    assert.equal(errorCodeOf(new ExplanationSchemaMismatch("x")), "schema_mismatch");
    assert.equal(errorCodeOf(new Error("Request timed out")), "timeout");
    assert.equal(errorCodeOf(new Error("boom")), "error");
    const aborted = new AbortController();
    aborted.abort();
    assert.equal(errorCodeOf(new Error("boom"), aborted.signal), "aborted");
  });
});
