import type { VisibleSearchResults } from "@repo/core/search";

import type { AssetSearchItem, SearchGroups, SearchRelatedTarget } from "@/entities/market";

export enum EntryKind {
  Asset = "asset",
  Sector = "sector",
  Index = "index",
  News = "news",
}

/** 키보드가 고르는 한 줄 */
export interface ResultEntry {
  key: string;
  kind: EntryKind;
  /** 갈 곳 — 뉴스는 `null`(모달을 연다) */
  href: string | null;
  /** 곁 칸을 물을 대상 — 종목 · 업종만 */
  side: SearchRelatedTarget | null;
  /** 뉴스 줄이면 그 id */
  newsId: string | null;
}

/** 이 위젯이 그리는 묶음 — 탭 판정은 `@repo/core/search`(`visibleSearchResults`, 테스트 있음) */
export type VisibleResults = VisibleSearchResults<
  AssetSearchItem,
  SearchGroups["sectors"][number],
  SearchGroups["news"][number],
  SearchGroups["indices"][number]
>;

/**
 * 키보드 줄 순서 = 화면 순서(종목 → 업종 → 뉴스 → 지수). 갈 곳: 종목 = 상세 · 업종 · 지수 = 국내 시세 표 · 뉴스 = 모달(주소 없음).
 * 곁 칸 대상: 종목(자산군 + 심볼) · 업종(코드). 뉴스 · 지수는 없다
 */
export const resultEntries = (
  visible: VisibleResults,
  routes: { detail: (symbol: string) => string; krBoard: string },
): ResultEntry[] => [
  ...visible.assets.map(
    (item): ResultEntry => ({
      key: `${item.assetType}:${item.symbol}`,
      kind: EntryKind.Asset,
      href: routes.detail(item.symbol),
      side:
        item.assetType === "crypto" || item.assetType === "kr_stock"
          ? { assetType: item.assetType, symbol: item.symbol }
          : null,
      newsId: null,
    }),
  ),
  ...visible.sectors.map(
    (sector): ResultEntry => ({
      key: `sector:${sector.code}`,
      kind: EntryKind.Sector,
      href: routes.krBoard,
      side: { sector: sector.code },
      newsId: null,
    }),
  ),
  ...visible.news.map(
    (news): ResultEntry => ({ key: `news:${news.market}:${news.id}`, kind: EntryKind.News, href: null, side: null, newsId: news.id }),
  ),
  ...visible.indices.map(
    (index): ResultEntry => ({ key: `index:${index.code}`, kind: EntryKind.Index, href: routes.krBoard, side: null, newsId: null }),
  ),
];
