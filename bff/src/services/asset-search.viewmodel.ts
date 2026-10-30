/**
 * 종목 검색 뷰모델 — **순수 함수**(`BFF-REQ-007` H절 FR-70~72).
 *
 * 서버(`GET /api/investment/search`) 값을 화면 계약으로 옮긴다. `isTracked` · `isHeld` · `tracked` 는 **서버 값 그대로**다
 * — BFF 가 추적 여부를 다시 계산하지 않는다(FR-71). 가격이 없으면 `null`, 0 을 만들지 않는다(FR-72).
 */

export interface TrackedCounterVM {
  /** 보유가 아닌 관심 종목 수 — 화면 카운터 `추적 n / limit` 의 `n` */
  count: number;
  limit: number;
}

export interface AssetSearchItemVM {
  /** `crypto` · `kr_stock`(소유자만) · `stock`(관심 목록에 남은 미국 주식 행 — 검색 결과로는 나오지 않는다) */
  assetType: string;
  symbol: string;
  name: string;
  logoUrl: string | null;
  currentPrice: number | null;
  changeRate: number | null;
  isTracked: boolean;
  isHeld: boolean;
}

export interface AssetSearchVM {
  items: AssetSearchItemVM[];
  tracked: TrackedCounterVM | null;
}

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const stringOrNull = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

/** 서버 카운터 — 정수 둘이 아니면 `null`(화면은 카운터를 그리지 않는다). 0 · 10 으로 지어내지 않는다 */
export const toTrackedCounterVM = (raw: unknown): TrackedCounterVM | null => {
  const tracked = raw as { count?: unknown; limit?: unknown } | null | undefined;
  return Number.isInteger(tracked?.count) && Number.isInteger(tracked?.limit)
    ? { count: tracked!.count as number, limit: tracked!.limit as number }
    : null;
};

export const toAssetSearchVM = (data: unknown): AssetSearchVM => {
  const body = data as { items?: unknown; tracked?: unknown } | null | undefined;
  const items = Array.isArray(body?.items) ? body.items : [];
  return {
    items: items.flatMap((raw): AssetSearchItemVM[] => {
      const item = raw as Record<string, unknown>;
      const symbol = stringOrNull(item.symbol);
      const assetType = stringOrNull(item.assetType);
      if (!symbol || !assetType) return [];
      return [
        {
          assetType,
          symbol,
          name: stringOrNull(item.name) ?? symbol,
          logoUrl: stringOrNull(item.logoUrl),
          currentPrice: numberOrNull(item.currentPrice),
          changeRate: numberOrNull(item.changeRate),
          isTracked: item.isTracked === true,
          isHeld: item.isHeld === true,
        },
      ];
    }),
    tracked: toTrackedCounterVM(body?.tracked),
  };
};
