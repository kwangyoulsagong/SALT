export type Timeframe = "1m" | "5m" | "1h";

export interface PriceUpdate {
  symbol: string;
  currentPrice: number;
  change24h: number;
  timestamp: string;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PriceListener = (data: PriceUpdate) => void;
export type CandleListener = (data: {
  symbol: string;
  timeframe: Timeframe;
  candle: Candle;
}) => void;
export type WSClientSendMessage =
  | { type: "subscribe"; symbols: string[] }
  | { type: "unsubscribe"; symbols: string[] }
  | { type: "subscribe_candle"; symbol: string; timeframe: Timeframe }
  | { type: "unsubscribe_candle"; symbol: string; timeframe: Timeframe };

export type WSClientReceiveMessage =
  | { type: "price_update"; data: PriceUpdate }
  | { type: "candle"; symbol: string; timeframe: Timeframe; data: Candle }
  | { type: "subscribed"; symbols: string[] }
  | { type: "unsubscribed"; symbols: string[] };

export interface WSClientContext {
  priceListeners: Map<string, Set<PriceListener>>;
  candleListeners: Map<string, Map<Timeframe, Set<CandleListener>>>;
}
