import { describe, expect, it } from "vitest";

import { isGuestReadablePath, isPublicPath, safeNextPath, signInHref } from "./keys";

/**
 * 공개 경로 판정 한 곳(`isPublicPath`) — 앱 내비(탭을 숨기나)와 세션 갱신(죽은 세션이면 로그인으로 보내나)이 같이 쓴다.
 * 불변식: `/` 는 그 자리만, 나머지는 그 아래까지. 이름이 앞부분만 같은 경로(`/tipsy`)는 공개가 아니다.
 */
describe("isPublicPath", () => {
  it.each([
    ["/", true],
    ["/login", true],
    ["/onboarding", true],
    ["/tips", true],
    ["/tips/marriage-tax-credit", true],
    ["/tips/cards", true],
    ["/home", false],
    ["/goals", false],
    ["/household/people", false],
    ["/investments", false],
    ["/tipsy", false],
    ["/loginx", false],
    ["/settings", false],
  ])("%s → %s", (pathname, expected) => {
    expect(isPublicPath(pathname)).toBe(expected);
  });
});

/**
 * 게스트 화면(`FE-REQ-070` FR-3) — 로그인 화면으로 보내지 않는 경로 = 공개 ∪ 투자. 내비 판정(`isPublicPath`)과 갈린다:
 * 투자 화면은 게스트도 보지만 레일 · 탭은 그대로다.
 */
describe("isGuestReadablePath", () => {
  it.each([
    ["/investments", true, false],
    ["/investments/BTC", true, false],
    ["/search", true, false],
    ["/portfolio", true, false],
    ["/coach/report", true, false],
    ["/tips/cards", true, true],
    ["/", true, true],
    ["/home", false, false],
    ["/goals", false, false],
    ["/investmentsx", false, false],
    ["/settings", false, false],
  ])("%s → 게스트 %s · 내비 숨김 %s", (pathname, guest, bare) => {
    expect(isGuestReadablePath(pathname)).toBe(guest);
    expect(isPublicPath(pathname)).toBe(bare);
  });
});

/** 돌아올 주소 — 우리 경로만(열린 리디렉트 0). 경계 표 */
describe("safeNextPath", () => {
  it.each([
    ["/investments/005930", "/investments/005930"],
    ["/investments?asset=kr_stock", "/investments?asset=kr_stock"],
    ["/coach/report#risk", "/coach/report#risk"],
    ["//evil.example", null],
    ["/\\evil.example", null],
    ["https://evil.example", null],
    ["javascript:alert(1)", null],
    ["investments", null],
    ["/", null],
    ["/?next=/x", null],
    ["/a\nb", null],
    ["", null],
    [null, null],
    [`/${"a".repeat(600)}`, null],
  ])("%s → %s", (raw, expected) => {
    expect(safeNextPath(raw as string | null)).toBe(expected);
  });

  it("signInHref — 안전한 자리면 next 를 붙이고, 아니면 로그인만", () => {
    expect(signInHref("/", "/investments?asset=kr_stock")).toBe("/?next=%2Finvestments%3Fasset%3Dkr_stock");
    expect(signInHref("/", "//evil")).toBe("/");
  });
});
