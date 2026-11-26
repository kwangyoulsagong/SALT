import { describe, expect, it } from "vitest";

import { formatAmount, parseAmount } from "./parseAmount";

describe("parseAmount — 굴릴 수 있는 금액 글자만", () => {
  it.each([
    ["1,234,567원", { sign: "", value: 1234567, rest: "원", grouped: true }],
    ["−12,000원", { sign: "−", value: 12000, rest: "원", grouped: true }],
    ["0원", { sign: "", value: 0, rest: "원", grouped: false }],
    ["300원 중", { sign: "", value: 300, rest: "원 중", grouped: false }],
    ["15000", { sign: "", value: 15000, rest: "", grouped: false }],
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

describe("모양 그대로 — 쉼표 없는 숫자에 쉼표를 넣지 않는다", () => {
  it.each([
    ["2027년 11월", 2027, "2027년 11월"],
    ["1500원", 1500, "1500원"],
    ["12,000원", 12000, "12,000원"],
  ])("%s 도착값은 받은 글자 그대로", (text, value, shown) => {
    expect(formatAmount(parseAmount(text)!, value)).toBe(shown);
  });

  it("쉼표 없는 숫자는 굴리는 중간값에도 쉼표가 없다", () => {
    expect(formatAmount(parseAmount("1500원")!, 1234)).toBe("1234원");
  });
});
