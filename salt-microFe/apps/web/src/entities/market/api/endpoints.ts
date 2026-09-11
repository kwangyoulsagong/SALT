import { MarketOrder, MarketPeriod, MarketSort } from "../model/types";

/**
 * 시세 upstream 의 엔드포인트 경로.
 *
 * origin 은 `shared/config` 에 있고 **경로는 부르는 슬라이스가 갖는다** (FR-16).
 */
export const MARKET_ENDPOINTS = {
  overview: ({
    page,
    limit,
    sort,
    order,
    period,
    search,
  }: {
    page: number;
    limit: number;
    sort?: MarketSort | null;
    order?: MarketOrder | null;
    period?: MarketPeriod | null;
    search?: string | null;
  }) =>
    `/api/investment/market/overview?page=${page}&limit=${limit}` +
    `&sort=${sort ?? ""}` +
    `&order=${order ?? ""}` +
    `&period=${period ?? ""}` +
    `&search=${encodeURIComponent(search ?? "")}`,
  chartPreview: (symbol: string) =>
    `/api/investment/crypto/${symbol}/chart?period=miniute&unit=5&count=30`,
  intelligencePreview: (symbol: string) =>
    `/api/market-intelligence/${symbol}/dashboard`,
} as const;
