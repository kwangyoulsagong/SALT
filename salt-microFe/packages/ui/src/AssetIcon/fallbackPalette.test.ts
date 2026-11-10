import { tokens } from "@repo/tokens";
import { describe, expect, it } from "vitest";

import { fallbackPalette } from "./fallbackPalette";

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe("AssetIcon 이니셜 판 색", () => {
  it.each(fallbackPalette(tokens.colors))("%s — 흰 글자 대비 4.5:1 이상", (color) => {
    expect(contrast(color, tokens.colors.text.white)).toBeGreaterThanOrEqual(4.5);
  });

  it("자리 수 6 — 해시가 고르는 자리가 바뀌면 모든 이니셜 판 색이 섞인다", () => {
    expect(fallbackPalette(tokens.colors)).toHaveLength(6);
  });
});
