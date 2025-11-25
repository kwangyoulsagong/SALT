import WebSocket from "ws";
import { logger } from "../config/logger";
import { connectionManager } from "../websocket/managers/connection.manager";
import { candleBuilder } from "../builder/candleBuilder.builder";

export interface UpbitTicker {
  type: "ticker";
  code: string; // "KRW-BTC"
  trade_price: number;
  signed_change_rate: number;
  timestamp: number;
  trade_volume: number;
}

class UpbitWebSocketService {
  private ws: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private priceCache: Map<string, any> = new Map();

  constructor() {
    this.connect();
  }

  /**
   * Upbit WebSocket 연결
   */
  private connect() {
    try {
      this.ws = new WebSocket("wss://api.upbit.com/websocket/v1");

      this.ws.on("open", () => {
        logger.info("✅ Connected to Upbit WebSocket");
        if (this.subscribedSymbols.size > 0) {
          this.resubscribe();
        }
      });

      this.ws.on("message", (data: Buffer) => {
        try {
          const ticker: UpbitTicker = JSON.parse(data.toString());
          this.handlePriceUpdate(ticker);
        } catch (error) {
          logger.error("Upbit message parse error:", error);
        }
      });

      this.ws.on("error", (error) => {
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

  /**
   * 재연결 스케줄
   */
  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      logger.info("Reconnecting to Upbit WebSocket...");
      this.connect();
    }, 5000);
  }

  /**
   * 재구독
   */
  private resubscribe() {
    if (this.subscribedSymbols.size > 0) {
      const symbols = Array.from(this.subscribedSymbols);
      this.subscribe(symbols);
    }
  }

  /**
   * 심볼 구독
   */
  subscribe(symbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn("WebSocket not ready, queuing symbols:", symbols);
      symbols.forEach((s) => this.subscribedSymbols.add(s.toUpperCase()));
      return;
    }

    const markets = symbols.map((s) => `KRW-${s.toUpperCase()}`);

    const message = [
      { ticket: "salt-bff" },
      {
        type: "ticker",
        codes: markets,
      },
    ];

    this.ws.send(JSON.stringify(message));
    symbols.forEach((s) => this.subscribedSymbols.add(s.toUpperCase()));

    logger.info(`📡 Subscribed to Upbit: ${symbols.join(", ")}`);
  }

  /**
   * 가격 업데이트 처리
   */
  private handlePriceUpdate(ticker: UpbitTicker) {
    const symbol = ticker.code.replace("KRW-", "");

    const priceData = {
      symbol,
      currentPrice: ticker.trade_price,
      change24h: ticker.signed_change_rate * 100,
      timestamp: new Date(ticker.timestamp),
    };

    // 캐시 저장
    this.priceCache.set(symbol, priceData);

    // WebSocket으로 구독자들에게 전송
    connectionManager.broadcastToSubscribers(symbol, {
      type: "price_update",
      data: priceData,
    });

    logger.debug(`Price update: ${symbol} = ${priceData.currentPrice}`);
    const candle = candleBuilder.update(
      symbol,
      ticker.trade_price,
      ticker.trade_volume
    );

    // 캔들 구독자에게만 전송
    Object.entries(candle).forEach(([tf, lastCandle]) => {
      connectionManager.broadcastCandleToSubscribers(symbol, tf, lastCandle);
    });
  }

  /**
   * 현재 캐시된 가격 데이터 가져오기
   */
  getPriceCache(): Map<string, any> {
    return this.priceCache;
  }

  /**
   * 구독 중인 심볼 가져오기
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  /**
   * 연결 종료
   */
  close() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const upbitWSService = new UpbitWebSocketService();
