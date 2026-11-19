import { describe, expect, it } from "vitest";

import { mergeHistoryPages, nextHistoryCursor } from "./conversation";

describe("nextHistoryCursor — 지난 대화 다음 쪽", () => {
  it.each([
    ["다음 커서가 있고 처음이면 그 커서", "c2", [null], "c2"],
    ["다음 커서가 없으면 멈춤", null, [null, "c2"], null],
    ["이미 쓴 커서가 다시 오면 멈춤(되풀이 고리)", "c2", [null, "c2", "c3"], null],
    ["빈 문자열은 멈춤", "", [null], null],
  ] as const)("%s", (_, next, used, expected) => {
    expect(nextHistoryCursor({ nextCursor: next }, used)).toBe(expected);
  });
});

describe("mergeHistoryPages — 화면 순서 · 같은 id 한 번", () => {
  const p = (...ids: string[]) => ({ items: ids.map((id) => ({ id })) });

  it("최신 쪽이 앞인 쪽들을 오래된 것이 위로 편다", () => {
    expect(mergeHistoryPages([p("6", "5", "4"), p("3", "2", "1")]).map((m) => m.id)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("쪽이 겹쳐도 같은 id 는 한 번 — 처음 나온 자리", () => {
    // 펴면 4 5 6 | 3 4 | 4 5 6 → 처음 자리만 남기면 4 5 6 3
    expect(mergeHistoryPages([p("6", "5", "4"), p("4", "3"), p("6", "5", "4")]).map((m) => m.id)).toEqual(["4", "5", "6", "3"]);
  });

  it("빈 쪽은 지나간다", () => {
    expect(mergeHistoryPages([p(), p("2", "1")]).map((m) => m.id)).toEqual(["1", "2"]);
  });
});
