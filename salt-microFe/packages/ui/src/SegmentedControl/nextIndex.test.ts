import { describe, expect, it } from "vitest";

import { nextSegmentIndex } from "./nextIndex";

describe("nextSegmentIndex", () => {
  it("오른쪽 · 아래는 다음 칸, 끝에서 처음으로 돈다", () => {
    expect(nextSegmentIndex("ArrowRight", 0, 2)).toBe(1);
    expect(nextSegmentIndex("ArrowDown", 1, 2)).toBe(0);
  });

  it("왼쪽 · 위는 이전 칸, 처음에서 끝으로 돈다", () => {
    expect(nextSegmentIndex("ArrowLeft", 1, 3)).toBe(0);
    expect(nextSegmentIndex("ArrowUp", 0, 3)).toBe(2);
  });

  it("Home · End 는 양 끝", () => {
    expect(nextSegmentIndex("Home", 2, 3)).toBe(0);
    expect(nextSegmentIndex("End", 0, 3)).toBe(2);
  });

  it("이동 키가 아니면 null — Tab 을 가로채지 않는다", () => {
    expect(nextSegmentIndex("Tab", 0, 2)).toBeNull();
    expect(nextSegmentIndex("Enter", 0, 2)).toBeNull();
  });

  it("항목이 없으면 null", () => {
    expect(nextSegmentIndex("ArrowRight", 0, 0)).toBeNull();
  });
});
