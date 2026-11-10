import { describe, expect, it } from "vitest";

import {
  ALL_TAB_ASSET_COUNT,
  availableSearchTabs,
  clampActiveIndex,
  effectiveSearchTab,
  escapeStep,
  isSearchListKey,
  moveActiveIndex,
  SearchResultTab,
  splitHighlight,
  visibleSearchResults,
} from "./searchList";

describe("moveActiveIndex — 허용 · 거절 경계", () => {
  it.each([
    // [지금, 행 수, 키, 다음]
    [-1, 0, "ArrowDown", -1],
    [-1, 0, "ArrowUp", -1],
    [-1, 0, "Home", -1],
    [-1, 3, "ArrowDown", 0],
    [-1, 3, "ArrowUp", 2],
    [0, 3, "ArrowDown", 1],
    [2, 3, "ArrowDown", 0],
    [0, 3, "ArrowUp", 2],
    [2, 3, "ArrowUp", 1],
    [1, 3, "Home", 0],
    [1, 3, "End", 2],
    // 목록이 줄었다(5 → 2) — 범위 안으로 당긴 뒤 움직인다
    [4, 2, "ArrowUp", 0],
    [4, 2, "ArrowDown", 0],
    [0, 1, "ArrowDown", 0],
    [0, 1, "ArrowUp", 0],
  ] as const)("%i / %i 행 · %s → %i", (current, count, key, expected) => {
    expect(moveActiveIndex(current, count, key)).toBe(expected);
  });
});

describe("isSearchListKey", () => {
  it.each([
    ["ArrowDown", true],
    ["ArrowUp", true],
    ["Home", true],
    ["End", true],
    ["Enter", false],
    ["Escape", false],
    ["ArrowLeft", false],
    ["a", false],
  ])("%s → %s", (key, expected) => expect(isSearchListKey(key)).toBe(expected));
});

describe("clampActiveIndex", () => {
  it.each([
    [-1, 3, -1],
    [0, 3, 0],
    [2, 3, 2],
    [3, 3, -1],
    [0, 0, -1],
  ])("%i / %i → %i", (current, count, expected) => expect(clampActiveIndex(current, count)).toBe(expected));
});

describe("escapeStep — Esc 두 단계", () => {
  it.each([
    ["", "close"],
    ["삼", "clear"],
    [" ", "clear"],
  ] as const)("'%s' → %s", (input, expected) => expect(escapeStep(input)).toBe(expected));
});

describe("splitHighlight", () => {
  const join = (parts: { text: string }[]) => parts.map((part) => part.text).join("");

  it.each([
    ["삼성전자", "삼성", [["삼성", true], ["전자", false]]],
    ["삼성전자", "전자", [["삼성", false], ["전자", true]]],
    ["삼성전자", "성전", [["삼", false], ["성전", true], ["자", false]]],
    ["Bitcoin", "COIN", [["Bit", false], ["coin", true]]],
    ["비트코인", "  코인 ", [["비트", false], ["코인", true]]],
    ["비트코인", "", [["비트코인", false]]],
    ["비트코인", "이더", [["비트코인", false]]],
    ["", "삼", [["", false]]],
    ["삼성", "삼성전자", [["삼성", false]]],
  ] as const)("%s · '%s'", (text, query, expected) => {
    const parts = splitHighlight(text, query);
    expect(parts.map((part) => [part.text, part.match])).toEqual(expected);
    expect(join(parts)).toBe(text);
  });
});

describe("검색 결과 탭 · 묶음(FR-8)", () => {
  const groups = { sectors: ["전기·전자"], news: [], indices: ["코스피"] };
  const assets = ["a", "b", "c", "d", "e", "f"];

  it("탭 — 전체 · 종목은 늘, 빈 묶음 탭은 없다", () => {
    expect(availableSearchTabs(undefined)).toEqual([SearchResultTab.All, SearchResultTab.Assets]);
    expect(availableSearchTabs(groups)).toEqual([
      SearchResultTab.All,
      SearchResultTab.Assets,
      SearchResultTab.Sectors,
      SearchResultTab.Indices,
    ]);
  });

  it("사라진 탭은 전체로", () => {
    const tabs = availableSearchTabs(groups);
    expect(effectiveSearchTab(SearchResultTab.News, tabs)).toBe(SearchResultTab.All);
    expect(effectiveSearchTab(SearchResultTab.Indices, tabs)).toBe(SearchResultTab.Indices);
  });

  it.each([
    // [탭, 종목 수, 더 보기, 업종 수, 지수 수]
    [SearchResultTab.All, ALL_TAB_ASSET_COUNT, true, 1, 1],
    [SearchResultTab.Assets, 6, false, 0, 0],
    [SearchResultTab.Sectors, 0, false, 1, 0],
    [SearchResultTab.Indices, 0, false, 0, 1],
    [SearchResultTab.News, 0, false, 0, 0],
  ])("%s 탭 — 종목 %d · 더 보기 %s · 업종 %d · 지수 %d", (tab, assetCount, more, sectorCount, indexCount) => {
    const v = visibleSearchResults(tab, assets, groups);
    expect(v.assets).toHaveLength(assetCount);
    expect(v.moreAssets).toBe(more);
    expect(v.sectors).toHaveLength(sectorCount);
    expect(v.indices).toHaveLength(indexCount);
  });

  it("전체 탭 — 종목이 5 이하면 더 보기 없음 · 묶음 없음도 된다", () => {
    expect(visibleSearchResults(SearchResultTab.All, ["a"], undefined)).toEqual({
      assets: ["a"],
      moreAssets: false,
      sectors: [],
      news: [],
      indices: [],
    });
  });
});
