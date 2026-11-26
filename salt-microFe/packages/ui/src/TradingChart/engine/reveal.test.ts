import { describe, expect, it } from "vitest";

import { REVEAL_MS, revealHiddenWidth } from "./reveal";

describe("revealHiddenWidth — 처음 그릴 때 가려 둘 오른쪽 폭", () => {
  it("시작은 전부 가리고 끝나면 0", () => {
    expect(revealHiddenWidth(0, 600)).toBe(600);
    expect(revealHiddenWidth(REVEAL_MS, 600)).toBe(0);
    expect(revealHiddenWidth(REVEAL_MS * 3, 600)).toBe(0);
  });

  it("가운데는 줄어든다 — 늘 0 ~ 폭 안", () => {
    let previous = 600;
    for (let t = 0; t <= REVEAL_MS; t += REVEAL_MS / 20) {
      const hidden = revealHiddenWidth(t, 600);
      expect(hidden).toBeGreaterThanOrEqual(0);
      expect(hidden).toBeLessThanOrEqual(previous + 1e-9);
      previous = hidden;
    }
  });

  it("그림 칸이 없거나 시각이 거꾸로면 안전하게", () => {
    expect(revealHiddenWidth(100, 0)).toBe(0);
    expect(revealHiddenWidth(-50, 300)).toBe(300);
  });
});
