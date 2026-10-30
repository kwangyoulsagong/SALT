import { z } from "zod";

import { ASSET_SEARCH_MAX_LIMIT } from "../../application/SearchAssets";

/**
 * 종목 검색 DTO(`SRV-REQ-008` FR-80). `q` 는 비어도 된다 — 비면 추적 목록(관심 ∪ 보유)을 준다(FR-86).
 * 자산군은 검색할 수 있는 둘만 받는다 — 미국 주식(`stock`)은 시세 원천이 없다
 */
export const searchAssetsSchema = z.object({
  q: z.string().max(30).default(""),
  assetType: z.enum(["crypto", "kr_stock"]).optional(),
  limit: z.coerce.number().int().min(1).max(ASSET_SEARCH_MAX_LIMIT).default(20),
});

export type SearchAssetsDto = z.infer<typeof searchAssetsSchema>;
