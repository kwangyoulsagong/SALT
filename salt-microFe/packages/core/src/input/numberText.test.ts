import { describe, expect, it } from "vitest";

import { groupDigits, numberToInputText, readNumberText } from "./numberText";

/**
 * 금액 · 비율 · 개수 입력 허용표(저축 리뷰 3~9차에서 나온 경계 전부). **조용히 지우고 이어 붙이는 경로가 0** 이어야 한다 —
 * 받을 수 없으면 null(부르는 쪽이 이전 값을 두고 안내한다). 값이 나오면 그 값은 사용자가 뜻한 숫자 그대로다.
 */
describe("readNumberText — won(원 단위 금액)", () => {
  it.each([
    ["", ""],
    ["50000", "50,000"],
    ["1,000,000", "1,000,000"],
    ["1,0005", "10,005"], // 표시 중인 "1,000" 뒤에 5 를 친 경우 — 우리 쉼표다
    ["１２３", "123"], // 전각 숫자는 반각으로
    ["50,000원", "50,000"], // 붙여넣기 — 앞뒤 화폐 표시는 뗀다
    ["₩50,000", "50,000"],
    ["￦ 50,000 ", "50,000"],
    ["  7000  ", "7,000"],
    ["999999999999999", "999,999,999,999,999"], // 15자리(999조)까지 — 보내는 숫자(Number)가 정확한 범위
    ["007", "7"],
  ])("받는다 %j → %j", (raw, shown) => {
    expect(readNumberText(raw, "won")).toBe(shown);
  });

  it.each([
    "1000.5", // 원 단위가 아니다
    "1000．5", // 전각 마침표
    "1000。5",
    "1000·5", // 가운뎃점
    "1000 5", // 가운데 공백 — 지우면 10,005
    "1000　5", // 전각 공백
    "1000²", // 위첨자 — NFKC 면 10002
    "①②③", // 원문자 — NFKC 면 123
    "50000a",
    "-5000",
    "5e3",
    "1000000000000000", // 16자리 — 보이는 값과 보내는 값(Number)이 갈라진다(리뷰 11차)
    "9007199254740993",
  ])("거절한다 %j", (raw) => {
    expect(readNumberText(raw, "won")).toBeNull();
  });
});

describe("readNumberText — decimal(금리 · 이율)", () => {
  it.each([
    ["3.5", "3.5"],
    ["3.", "3."], // 치는 중
    ["3．5", "3.5"], // 전각 마침표는 소수점으로
    ["3.5%", "3.5"], // 끝의 % 는 뗀다
    ["3.5 %", "3.5"],
    ["3.5％", "3.5"],
    ["0", "0"],
    ["１０", "10"],
  ])("받는다 %j → %j", (raw, shown) => {
    expect(readNumberText(raw, "decimal")).toBe(shown);
  });

  it.each([
    "3,5", // 쉼표 소수점 — 지우면 35%
    "3.5.1",
    "3 5",
    "3·5",
    "³",
    "abc",
  ])("거절한다 %j", (raw) => {
    expect(readNumberText(raw, "decimal")).toBeNull();
  });
});

describe("readNumberText — price(소수 있는 금액 · 수량 — 코인 가격 · 수량)", () => {
  it.each([
    ["1234.5", "1,234.5"],
    ["1,234.5", "1,234.5"],
    ["1,2345", "12,345"], // 표시 중인 묶음 뒤에 친 글자
    ["0.00012", "0.00012"],
    [".5", "0.5"],
    ["12.", "12."],
    ["１２．５", "12.5"],
    ["  99.9  ", "99.9"],
  ])("받는다 %j → %j", (raw, shown) => {
    expect(readNumberText(raw, "price")).toBe(shown);
  });

  it.each(["1000·5", "1000 5", "1.2.3", "1000²", "abc", "-1", "1,000.5원", "1.123456789", "1234567890123456.5"])("거절한다 %j", (raw) => {
    expect(readNumberText(raw, "price")).toBeNull();
  });
});

describe("readNumberText — count(개월 수)", () => {
  it.each([
    ["12", "12"],
    ["１２", "12"],
    [" 6 ", "6"],
  ])("받는다 %j → %j", (raw, shown) => {
    expect(readNumberText(raw, "count")).toBe(shown);
  });

  it.each(["1.5", "1 2", "1,2", "12개월", "²"])("거절한다 %j", (raw) => {
    expect(readNumberText(raw, "count")).toBeNull();
  });
});

describe("groupDigits — 묶음 규칙 한 곳(formatAmountInput 도 쓴다)", () => {
  it.each([
    ["", ""],
    ["0", "0"],
    ["000", "0"],
    ["1234567", "1,234,567"],
    ["12345678901234567890", "12,345,678,901,234,567,890"],
  ])("%j → %j", (digits, shown) => {
    expect(groupDigits(digits)).toBe(shown);
  });
});

describe("numberToInputText — 코드가 넣는 숫자(현재가 · 칩)를 입력 글자로(지수 표기 없이)", () => {
  it.each([
    [1.2e-7, "price", "0.00000012"], // String(1.2e-7) = "1.2e-7" → 옛 정리 함수는 "1.27"
    [12345.5, "price", "12,345.5"],
    [100000, "won", "100,000"],
    [0, "won", "0"],
    [3.5, "decimal", "3.5"],
    [1234.123456789, "price", "1,234.12345679"], // 저장된 값이 8자리를 넘어도 칸이 비지 않는다
  ] as const)("%j (%s) → %j", (n, kind, shown) => {
    expect(numberToInputText(n, kind)).toBe(shown);
  });

  it("규칙 밖이면 빈칸 — 소수 금액을 원 칸에", () => {
    expect(numberToInputText(1.5, "won")).toBe("");
  });
});
