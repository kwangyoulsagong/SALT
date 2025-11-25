import WebSocket from "ws";

export interface ExtendedWebSocket extends WebSocket {
  userId?: string | null;
  isAlive?: boolean;

  // 시세 구독 (BTC, ETH 등)
  subscribedSymbols?: Set<string>;

  // 캔들 구독 (BTC → ["1m","5m"], ETH → ["1m"])
  subscribedCandles?: Map<string, Set<string>>;
}

export interface WSMessage {
  type: string;
  [key: string]: any;
}

export interface PriceUpdate {
  symbol: string;
  currentPrice: number;
  change24h: number;
  timestamp: Date;
}
