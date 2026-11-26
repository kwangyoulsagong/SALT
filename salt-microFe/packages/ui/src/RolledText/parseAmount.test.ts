import { describe, expect, it } from "vitest";

import { formatAmount, parseAmount } from "./parseAmount";

describe("parseAmount — 굴릴 수 있는 금액 글자만", () => {
  it.each([
    ["1,234,567원", { sign: "", value: 1234567, rest: "원" }],
    ["−12,000원", { sign: "−", value: 12000, rest: "원" }],
    ["0원", { sign: "", value: 0, rest: "원" }],
    ["300원 중", { sign: "", value: 300, rest: "원 중" }],
    ["15000", { sign: "", value: 15000, rest: "" }],
  ])("%s 는 나눈다", (text, parsed) => {
    expect(parseAmount(text)).toEqual(parsed);
  });

  it.each(["불러오지 못했어요", "약 3만원", "0.000485원", "1.5%", "", "₩1,000"])("%s 는 굴리지 않는다", (text) => {
    expect(parseAmount(text)).toBeNull();
  });

  it("중간값도 같은 모양으로 — 쉼표 · 부호 · 꼬리 그대로", () => {
    const parsed = parseAmount("−1,200,000원")!;
    expect(formatAmount(parsed, 1_000_000)).toBe("−1,000,000원");
    expect(formatAmount(parsed, 0)).toBe("0원");
    expect(formatAmount(parseAmount("1,234원")!, 1234)).toBe("1,234원");
  });
});
