import { describe, expect, it } from "vitest";

import {
  ApiError,
  hasApiStatus,
  isClientApiError,
  isRetriable,
  readApiError,
  retryWhileRetriable,
} from "./apiError";

/**
 * 실패 모양 하나 · 재시도 판정 하나 (`FE-REQ-012` FR-41 · 42).
 *
 * 확인하는 것: BFF 봉투에서 `code` 만 꺼내고 `message` 는 버리는가, 어떤 status 를 다시 부르는가.
 * 전에는 전역 기본값이 4xx 도 두 번 더 불렀다(상세 차트 404 가 4.2초 뒤에야 실패로 보였다).
 */

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("readApiError", () => {
  it("BFF 봉투의 code 를 들고, 서버 message 는 싣지 않는다", async () => {
    const error = await readApiError(
      jsonResponse(404, { success: false, code: "MARKET_SYMBOL_NOT_FOUND", message: "Unknown market symbol: NOPEX" }),
      "market chart",
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.code).toBe("MARKET_SYMBOL_NOT_FOUND");
    expect(error.message).toBe("market chart 404 MARKET_SYMBOL_NOT_FOUND");
    expect(error.message).not.toContain("NOPEX");
  });

  it("code 가 없거나 문자열이 아니면 null — BFF 422 · AppError 는 code 없이 온다", async () => {
    expect((await readApiError(jsonResponse(422, { success: false, message: "x" }), "a")).code).toBeNull();
    expect((await readApiError(jsonResponse(400, { code: 42 }), "a")).code).toBeNull();
  });

  it("본문이 JSON 이 아니어도(프록시 HTML · 빈 본문) 실패를 실패로 만든다", async () => {
    const html = await readApiError(new Response("<html>502</html>", { status: 502 }), "a");
    expect(html.status).toBe(502);
    expect(html.code).toBeNull();
    expect((await readApiError(new Response(null, { status: 500 }), "a")).retriable).toBe(true);
  });
});

describe("retriable", () => {
  it.each([
    [500, true],
    [502, true],
    [503, true],
    [408, true],
    [400, false],
    [401, false],
    [404, false],
    [410, false],
    [422, false],
    // 다시 부를 시각은 서버가 `Retry-After` 로 정했다
    [429, false],
  ])("%i → %s", (status, expected) => {
    expect(new ApiError("a", status).retriable).toBe(expected);
  });
});

describe("isRetriable · retryWhileRetriable", () => {
  it("TypeError(연결 실패 · 코드 버그)는 다시 부르지 않고, 그 밖의 예외는 부른다", () => {
    expect(isRetriable(new TypeError("Failed to fetch"))).toBe(false);
    expect(isRetriable(new SyntaxError("Unexpected token"))).toBe(true);
  });

  it("maxRetries 번까지, 다시 부를 만한 실패만", () => {
    const retry = retryWhileRetriable(2);
    const serverError = new ApiError("a", 500);
    expect([0, 1, 2].map((count) => retry(count, serverError))).toEqual([true, true, false]);
    expect(retry(0, new ApiError("a", 404))).toBe(false);
  });
});

describe("판정 헬퍼", () => {
  it("hasApiStatus 는 ApiError 일 때만 status 를 본다", () => {
    expect(hasApiStatus(new ApiError("a", 404), 404)).toBe(true);
    expect(hasApiStatus(new ApiError("a", 500), 404)).toBe(false);
    expect(hasApiStatus(Object.assign(new Error("x"), { status: 404 }), 404)).toBe(false);
  });

  it("isClientApiError 는 4xx 만", () => {
    expect(isClientApiError(new ApiError("a", 400))).toBe(true);
    expect(isClientApiError(new ApiError("a", 499))).toBe(true);
    expect(isClientApiError(new ApiError("a", 500))).toBe(false);
    expect(isClientApiError(new TypeError("x"))).toBe(false);
  });
});
