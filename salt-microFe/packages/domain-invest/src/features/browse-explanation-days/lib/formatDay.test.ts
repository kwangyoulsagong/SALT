import { describe, expect, it } from "vitest";

import { formatPercent, formatTradeDay } from "./formatDay";

/** 해설 지난 날 보기 표시(`FE-REQ-079`) — 지금 시각을 읽지 않는다(수화 안전) · 부호를 늘 같이 */
describe("formatTradeDay", () => {
  it("KST 날짜를 월/일(요일)로", () => {
    expect(formatTradeDay("2026-11-25")).toBe("11/25(수)");
    expect(formatTradeDay("2026-11-23")).toBe("11/23(월)");
  });
  it("형식이 다르면 그대로", () => {
    expect(formatTradeDay("11/25")).toBe("11/25");
  });
});

describe("formatPercent", () => {
  it("부호를 같이 쓴다 — 색만으로 방향을 전하지 않는다", () => {
    expect(formatPercent(2.23)).toBe("+2.23%");
    expect(formatPercent(-9.87)).toBe("−9.87%");
    expect(formatPercent(0)).toBe("0.00%");
    expect(formatPercent(-0.001)).toBe("0.00%");
  });
});
