import WebSocket from 'ws';

export interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
  subscribedSymbols?: Set<string>;
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
