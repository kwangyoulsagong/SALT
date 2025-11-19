import WebSocket from "ws";
import { logger } from "../../config/logger";

export interface UpbitTicker {
  type: "ticker";
  code: string; // "KRW-BTC"
  trade_price: number;
  signed_change_rate: number;
  acc_trade_volume_24h: number;
  high_price: number;
  low_price: number;
  timestamp: number;
}

export class UpbitWebSocketClient {
  private ws: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private onMessageCallback: ((data: UpbitTicker) => void) | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket("wss://api.upbit.com/websocket/v1");

      this.ws.on("open", () => {
        logger.info("Upbit WebSocket connected");
        if (this.subscribedSymbols.size > 0) {
          this.resubscribe();
        }
      });

      this.ws.on("message", (data: Buffer) => {
        try {
          const ticker: UpbitTicker = JSON.parse(data.toString());
          if (this.onMessageCallback) {
            this.onMessageCallback(ticker);
          }
        } catch (error) {
          logger.error("Upbit message parse error:", error);
        }
      });

      this.ws.on("error", (error: any) => {
        logger.error("Upbit WebSocket error:", error);
      });

      this.ws.on("close", () => {
        logger.warn("⚠️ Upbit WebSocket closed, reconnecting...");
        this.scheduleReconnect();
      });
    } catch (error) {
      logger.error("Upbit WebSocket connection error:", error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 5000); // 5초 후 재연결
  }

  private resubscribe() {
    if (this.subscribedSymbols.size > 0) {
      const symbols = Array.from(this.subscribedSymbols);
      this.subscribe(symbols);
    }
  }

  subscribe(symbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn("WebSocket not ready, queuing symbols:", symbols);
      symbols.forEach((s) => this.subscribedSymbols.add(s));
      return;
    }

    const markets = symbols.map((s) => `KRW-${s.toUpperCase()}`);

    const message = [
      { ticket: "salt-backend" },
      {
        type: "ticker",
        codes: markets,
      },
    ];

    this.ws.send(JSON.stringify(message));
    symbols.forEach((s) => this.subscribedSymbols.add(s.toUpperCase()));

    logger.info(`📡 Subscribed to Upbit symbols: ${symbols.join(", ")}`);
  }

  unsubscribe(symbols: string[]) {
    symbols.forEach((s) => this.subscribedSymbols.delete(s.toUpperCase()));
    // Upbit은 unsubscribe를 따로 지원하지 않으므로 재구독
    this.resubscribe();
  }

  onMessage(callback: (data: UpbitTicker) => void) {
    this.onMessageCallback = callback;
  }

  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  close() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Singleton instance
export const upbitWSClient = new UpbitWebSocketClient();
