import { describe, expect, it } from "vitest";

import { assetInitials } from "./assetInitials";

describe("assetInitials", () => {
  it.each([
    ["KRW-BTC", "BT"],
    ["KRW-ETH", "ET"],
    ["usdt-sol", "SO"],
    ["005930", "00"],
    ["삼성전자", "삼"],
    ["AAPL", "AA"],
    ["KRW-", "KR"],
    ["  ", "?"],
  ])("%s → %s", (symbol, expected) => {
    expect(assetInitials(symbol)).toBe(expected);
  });

  it.each([
    ["005930", "삼성전자", "삼"],
    ["005930", "005930", "00"],
    ["005930", undefined, "00"],
    ["KRW-BTC", "비트코인", "BT"],
  ])("%s · 이름 %s → %s", (symbol, name, expected) => {
    expect(assetInitials(symbol, name)).toBe(expected);
  });
});
