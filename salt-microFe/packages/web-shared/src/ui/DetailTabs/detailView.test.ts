import { describe, expect, it } from "vitest";

import { detailViewHref, resolveDetailView } from "./detailView";

const TABS = ["overview", "orderbook", "investors", "news"] as const;

describe("resolveDetailView — 주소 값이 여는 탭", () => {
  it.each([
    ["없으면 첫 탭", null, false, "overview"],
    ["있는 탭이면 그 탭", "investors", false, "investors"],
    ["모르는 값(옛 링크)은 첫 탭", "judgment", false, "overview"],
    ["빈 문자열은 첫 탭", "", false, "overview"],
    ["넓은 폭의 trade 는 첫 탭(고정 열이 이미 보인다)", "trade", false, "overview"],
    ["좁은 폭의 trade 는 내 거래 탭", "trade", true, "trade"],
    ["좁은 폭에서도 다른 탭은 그대로", "news", true, "news"],
  ])("%s", (_, fromUrl, asideIsTab, expected) => {
    expect(resolveDetailView(fromUrl, TABS, "trade", asideIsTab)).toBe(expected);
  });

  it("빠진 탭(비소유자 코인 일정)은 첫 탭", () => {
    expect(resolveDetailView("events", ["overview"], "trade", false)).toBe("overview");
  });
});

describe("detailViewHref — 고른 뒤 주소", () => {
  const base = "http://h/investments/005930";
  it("첫 탭이면 view 를 지운다", () => {
    expect(detailViewHref(`${base}?view=news&horizon=5d`, "overview", "overview", "view")).toBe(`${base}?horizon=5d`);
  });
  it("다른 탭이면 view 를 넣고 다른 값 · 해시는 남긴다", () => {
    expect(detailViewHref(`${base}?horizon=1h#why-moved`, "orderbook", "overview", "view")).toBe(`${base}?horizon=1h&view=orderbook#why-moved`);
  });
});
