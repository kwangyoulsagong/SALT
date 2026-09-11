/** 실시간 시세 WebSocket 의 wire 계약. */

/** 캔들 주기. 문자열 리터럴 union 을 쓰지 않는다 (`layered-architecture.md` §6). */
export enum Timeframe {
  OneMinute = "1m",
  FiveMinutes = "5m",
  OneHour = "1h",
}

/** 메시지 종류. enum 값이 그대로 wire 의 `type` 문자열이다. */
export enum WSMessageType {
  Subscribe = "subscribe",
  Unsubscribe = "unsubscribe",
  SubscribeCandle = "subscribe_candle",
  UnsubscribeCandle = "unsubscribe_candle",
  PriceUpdate = "price_update",
  Candle = "candle",
  Subscribed = "subscribed",
  Unsubscribed = "unsubscribed",
}

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

export interface CandleEvent {
  symbol: string;
  timeframe: Timeframe;
  candle: Candle;
}

export type PriceListener = (data: PriceUpdate) => void;
export type CandleListener = (data: CandleEvent) => void;

export type WSClientSendMessage =
  | { type: WSMessageType.Subscribe; symbols: string[] }
  | { type: WSMessageType.Unsubscribe; symbols: string[] }
  | { type: WSMessageType.SubscribeCandle; symbol: string; timeframe: Timeframe }
  | {
      type: WSMessageType.UnsubscribeCandle;
      symbol: string;
      timeframe: Timeframe;
    };

export type WSClientReceiveMessage =
  | { type: WSMessageType.PriceUpdate; data: PriceUpdate }
  | {
      type: WSMessageType.Candle;
      symbol: string;
      timeframe: Timeframe;
      data: Candle;
    }
  | { type: WSMessageType.Subscribed; symbols: string[] }
  | { type: WSMessageType.Unsubscribed; symbols: string[] };

export interface WSClientContext {
  priceListeners: Map<string, Set<PriceListener>>;
  candleListeners: Map<string, Map<Timeframe, Set<CandleListener>>>;
}
