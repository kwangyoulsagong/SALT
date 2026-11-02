import type { KrSummaryItem } from "@repo/core/marketKr";

import { type MarketSummaryItem, MarketSummaryTag, SummaryItemKind } from "../model/types";

/**
 * 국내 요약 칸 → 요약 칸 컴포넌트가 받는 모양(`FE-REQ-050` FR-1). **값은 그대로** — 열 이름이 이미 같다(`BFF-REQ-044`).
 * 문자열 리터럴(공용 계약)을 화면 열거값으로 옮기기만 한다. 모르는 태그는 BFF 가 이미 버렸다
 */
export const toMarketSummaryItem = (item: KrSummaryItem): MarketSummaryItem => ({
  ...item,
  kind: item.kind === "index" ? SummaryItemKind.Index : SummaryItemKind.Stock,
  tags: item.tags.includes("wide_move") ? [MarketSummaryTag.WideMove] : [],
});
