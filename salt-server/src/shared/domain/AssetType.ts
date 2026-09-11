/**
 * 자산군 — 세 컨텍스트 이상이 이것으로 분기한다(`tax`·`portfolio`·`ledger`).
 *
 * 값은 프론트 `shared/model` 과 BFF 계약이 같은 문자열을 쓴다.
 */
export enum AssetType {
  Crypto = "crypto",
  KrStock = "kr_stock",
  UsStock = "us_stock",
}

export const isAssetType = (value: unknown): value is AssetType =>
  typeof value === "string" &&
  (Object.values(AssetType) as string[]).includes(value);
