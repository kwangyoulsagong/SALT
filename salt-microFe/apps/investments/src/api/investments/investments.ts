import {
  Order,
  Period,
  Sort,
} from "@/component/Investment/InvestmentFilterTabs/FilterTabsOptions/FilterTabsOptions";
import { BASE_URL, END_POINTS } from "@/constants/api";
import axios from "axios";
export interface MarketOverviewItem {
  symbol: string;
  market: string;
  koreanName: string;
  englishName: string;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  tradeValue24h: number;
  logoUrl: string;
  priceUpdatedAt: string;
}
export interface MarketOverviewResponse {
  items: MarketOverviewItem[];
}
export interface MarketOverviewParams {
  page: number;
  limit: number;
  sort?: Sort;
  order?: Order;
  period?: Period;
  search?: string;
}
export const investmentsAPi = {
  marketOverview: async (
    params: MarketOverviewParams
  ): Promise<MarketOverviewResponse> => {
    const data = await axios.get(
      `${BASE_URL}${END_POINTS.marketOverview(params)}`
    );
    return data.data;
  },
};
