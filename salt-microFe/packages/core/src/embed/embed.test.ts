import { describe, expect, it } from "vitest";

import { isAppWebView } from "./index";

describe("isAppWebView — 앱 웹뷰 User-Agent 계약", () => {
  it("끝에 SALTApp/버전 이 붙으면 앱이다", () => {
    expect(isAppWebView("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 SALTApp/1.0.0")).toBe(true);
    expect(isAppWebView("SALTApp/2 Mozilla/5.0")).toBe(true);
  });

  it("휴대폰 브라우저 · 이름만 비슷한 것은 앱이 아니다", () => {
    expect(isAppWebView("Mozilla/5.0 (Linux; Android 14) Chrome/128 Mobile Safari/537.36")).toBe(false);
    expect(isAppWebView("Mozilla/5.0 NotSALTApp/1.0")).toBe(false);
    expect(isAppWebView("Mozilla/5.0 SALTApp")).toBe(false);
  });
});
