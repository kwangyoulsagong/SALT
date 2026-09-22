import WebSocket from "ws";
import { logger } from "../config/logger";
import { connectionManager } from "../websocket/managers/connection.manager";
import { candleBuilder } from "../builder/candleBuilder.builder";

export interface UpbitTicker {
  type: "ticker";
  code: string; // "KRW-BTC"
  trade_price: number;
  signed_change_rate: number;
  /** 전일 종가 대비 등락 **금액** — 거래소가 준다. BFF 는 계산하지 않고 옮긴다 */
  signed_change_price: number;
  timestamp: number;
  trade_volume: number;
}

/**
 * **첫 `subscribe` 때 연결한다** — import 만으로는 소켓을 열지 않는다.
 *
 * 원래는 생성자에서 연결했다. 그래서 캐시만 읽는 REST 프로세스(`app-watchlist.service`)도
 * 거래소 소켓을 열었고(구독이 없으니 틱은 0 — 캐시는 어차피 비어 있다), 그 모듈을 import
 * 하는 테스트는 소켓 때문에 러너가 끝나지 않았다(`websocket-worker.md` "import 로 시작하지 않는다").
 */
export class UpbitWebSocketService {
  private ws: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private priceCache: Map<string, any> = new Map();
  /** `close()` 뒤에는 다시 붙지 않는다 — close 이벤트가 재연결을 예약하던 것을 막는다 */
  private stopped = false;

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
        if (this.stopped) return;
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
    if (this.subscribedSymbols.size > 0) this.sendSubscription();
  }

  /**
   * 심볼 구독 — **추가분이 아니라 전체 집합을 보낸다.**
   *
   * Upbit 는 같은 연결에 새 구독 요청이 오면 **이전 구독을 대체한다**(2026-09-21 실측:
   * BTC·XRP 구독 뒤 ETH 만 보내자 ETH 만 왔다). 원래는 새 심볼만 보내서, 화면이
   * 목록에 없던 심볼 하나를 요청하는 순간 나머지 전부의 시세가 끊겼다.
   */
  subscribe(symbols: string[]) {
    symbols.forEach((s) => this.subscribedSymbols.add(s.toUpperCase()));

    if (this.stopped) return;
    if (!this.ws) {
      // 첫 구독 — 연결이 열리면 `open` 이 전체 집합을 보낸다
      this.connect();
      return;
    }
    if (this.ws.readyState !== WebSocket.OPEN) {
      logger.warn(`WebSocket not ready, queued ${symbols.length} symbols`);
      return;
    }

    this.sendSubscription();
    logger.info(
      `📡 Upbit subscription: +${symbols.length} → ${this.subscribedSymbols.size} symbols`
    );
  }

  private sendSubscription() {
    const markets = Array.from(this.subscribedSymbols, (s) => `KRW-${s}`);
    this.ws?.send(
      JSON.stringify([{ ticket: "salt-bff" }, { type: "ticker", codes: markets }])
    );
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
      change24hAmount: ticker.signed_change_price,
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
    this.stopped = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const upbitWSService = new UpbitWebSocketService();
