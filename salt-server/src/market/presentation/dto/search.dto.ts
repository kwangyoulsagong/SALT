import { z } from "zod";

import { ASSET_SEARCH_MAX_LIMIT } from "../../application/SearchAssets";
import { RISING_SECTOR_DEFAULT_LIMIT, RISING_SECTOR_MAX_LIMIT } from "../../domain";

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

/** 검색 모달 결과 묶음(`SRV-REQ-055` FR-1) — 비어 있으면 빈 묶음(400 이 아니다 — 첫 글자 지우는 순간에도 부른다) */
export const searchGroupsSchema = z.object({
  q: z.string().max(30).default(""),
});

/** 뜨는 업종(FR-2) — 줄 수 상한은 도메인 값 */
export const risingSectorsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(RISING_SECTOR_MAX_LIMIT).default(RISING_SECTOR_DEFAULT_LIMIT),
});

/**
 * 곁 칸(FR-3) — 종목(`assetType` + `symbol`) 또는 업종(`sector`) 하나. 둘 다 · 둘 다 없음은 400.
 * 국내 코드 · 업종 코드는 숫자 · 대문자 형식만(시세 표 · KIS 업종 코드)
 */
export const searchRelatedSchema = z
  .object({
    assetType: z.enum(["crypto", "kr_stock"]).optional(),
    symbol: z.string().regex(/^[0-9A-Za-z]{1,15}$/).optional(),
    sector: z.string().regex(/^\d{4}$/).optional(),
  })
  .refine((v) => (v.sector !== undefined) !== (v.assetType !== undefined && v.symbol !== undefined), {
    message: "assetType+symbol 또는 sector 하나",
  })
  .refine((v) => v.assetType !== "kr_stock" || /^[0-9A-Z]{6}$/.test(v.symbol ?? ""), { message: "국내 코드 형식" })
  .transform((v) =>
    v.sector !== undefined
      ? { sector: v.sector }
      : { assetType: v.assetType!, symbol: v.assetType === "crypto" ? v.symbol!.toUpperCase() : v.symbol! }
  );
