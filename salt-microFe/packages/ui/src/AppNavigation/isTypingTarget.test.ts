import { describe, expect, it } from "vitest";

import { isTypingTarget } from "./isTypingTarget";

/** `/` 단축키 경계(`FE-REQ-066` FR-1) — 글을 쓰는 자리면 `/` 는 글자다 */
const event = (target: unknown, isComposing = false) => ({ target, isComposing }) as unknown as KeyboardEvent;

describe("isTypingTarget", () => {
  it.each([
    ["INPUT", true],
    ["TEXTAREA", true],
    ["SELECT", true],
    ["BUTTON", false],
    ["A", false],
    ["BODY", false],
    ["DIV", false],
  ])("%s → %s", (tagName, expected) => {
    expect(isTypingTarget(event({ tagName, isContentEditable: false }))).toBe(expected);
  });

  it("편집 가능한 요소는 글을 쓰는 중이다", () => {
    expect(isTypingTarget(event({ tagName: "DIV", isContentEditable: true }))).toBe(true);
  });

  it("한글 조합 중이면 어디서든 글자다", () => {
    expect(isTypingTarget(event({ tagName: "BODY", isContentEditable: false }, true))).toBe(true);
  });

  it("대상이 없으면(문서) 단축키다", () => {
    expect(isTypingTarget(event(null))).toBe(false);
  });
});
