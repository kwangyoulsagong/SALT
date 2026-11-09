import { describe, expect, it } from "vitest";

import { formatPrice } from "./price";

describe("formatPrice — 0 이 아닌 값은 0 으로 보이지 않는다", () => {
  it.each([
    [100455000, "100,455,000"],
    [1475, "1,475"],
    [92.6, "92.6"],
    [1, "1"],
    [1.23456, "1.235"],
    [0.999, "0.999"],
    [0.5, "0.5"],
    [0.000485, "0.000485"],
    [0.00048567, "0.0004857"],
    [-0.000485, "-0.000485"],
    [0, "0"],
    [-1234.5, "-1,234.5"],
  ])("%d → %s", (value, expected) => expect(formatPrice(value)).toBe(expected));

  it.each([0.000485, 0.0000001, 0.004, -0.00002])("%d 는 '0' 이 아니다", (value) => {
    expect(formatPrice(value)).not.toBe("0");
    expect(formatPrice(value)).not.toBe("-0");
  });
});
