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

export interface MarketChartPreviewItem {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketChartPreviewResponse {
  data: MarketChartPreviewItem[];
}

export interface SentimentInfo {
  id: string;
  symbol: string;

  sentimentScore: number;
  fearGreedIndex: number;
  volatility: number;

  volume24h: number;
  priceChange24h: number;

  socialMentions: number;
  searchTrend: number;

  sentimentLabel: "bullish" | "bearish" | "neutral" | string;

  calculatedAt: string;

  interpretation: InterpretationInfo;

  components: SentimentComponents;
}

export interface SentimentComponents {
  price: number;
  volatility: number;
  volume: number;
  fearGreed: number;
}

export interface SmartMoneyInfo {
  smartMoneyIndex: {
    score: number;
    signal: string;
  };

  signals: {
    largeTrades: number;
    largeBuys: number;
    largeSells: number;
    orderbookRatio: string;
  };

  interpretation: InterpretationInfo;
}

export interface InterpretationInfo {
  emoji: string;
  title: string;
  message: string;
  action: string;
  color: string;
}

export interface MarketIntelligencePreviewItem {
  symbol: string;
  sentiment: SentimentInfo;
  smartMoney: SmartMoneyInfo;
  timestamp: string;
}

export interface MarketIntelligencePreviewResponse {
  data: MarketIntelligencePreviewItem;
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
  marketChartPreview: async (
    symbol: string
  ): Promise<MarketChartPreviewResponse> => {
    const data = await axios.get(
      `${BASE_URL}${END_POINTS.marketChartPreview(symbol)}`
    );
    return data.data;
  },
  marketIntelligencePreview: async (
    symbol: string
  ): Promise<MarketIntelligencePreviewResponse> => {
    const data = await axios.get(
      `${BASE_URL}${END_POINTS.marketIntelligencePreview(symbol)}`
    );
    return data.data;
  },
};
