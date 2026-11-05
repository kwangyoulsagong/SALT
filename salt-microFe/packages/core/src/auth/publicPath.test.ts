import { describe, expect, it } from "vitest";

import { isPublicPath } from "./keys";

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
