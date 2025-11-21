import { ExtendedWebSocket, WSMessage } from "../../types/websocket.types";
import { logger } from "../../config/logger";
import { worker } from "../../workers/price-updater.worker";

export class CryptoHandler {
  /**
   * 심볼 구독
   */
  handleSubscribe(ws: ExtendedWebSocket, message: WSMessage) {
    try {
      const { symbols } = message;

      if (!Array.isArray(symbols)) {
        return ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid symbols format",
          })
        );
      }

      if (!ws.subscribedSymbols) {
        ws.subscribedSymbols = new Set();
      }

      // 변경 전과 달라진 부분 🔥
      const upper = symbols.map((s) => s.toUpperCase());
      const before = new Set(ws.subscribedSymbols);
      upper.forEach((s) => ws.subscribedSymbols!.add(s));

      // 실제 추가된 심볼만 추출
      const added = upper.filter((s) => !before.has(s));

      if (added.length > 0) {
        logger.info(`User ${ws.userId} subscribed to: ${added.join(", ")}`);

        // 🔥 한 번만 요청하도록 변경
        worker.updateSubscriptions();
      }

      ws.send(
        JSON.stringify({
          type: "subscribed",
          symbols: Array.from(ws.subscribedSymbols),
        })
      );
    } catch (error: any) {
      logger.error("Subscribe error:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Failed to subscribe",
        })
      );
    }
  }

  /**
   * 심볼 구독 해제
   */
  handleUnsubscribe(ws: ExtendedWebSocket, message: WSMessage) {
    try {
      const { symbols } = message;
      if (!Array.isArray(symbols) || !ws.subscribedSymbols) return;

      const upper = symbols.map((s) => s.toUpperCase());
      const before = new Set(ws.subscribedSymbols);

      upper.forEach((s) => ws.subscribedSymbols!.delete(s));

      const removed =
        before.size > 0
          ? upper.filter((s) => !ws.subscribedSymbols!.has(s))
          : [];

      if (removed.length > 0) {
        logger.info(
          `User ${ws.userId} unsubscribed from: ${removed.join(", ")}`
        );

        // 🔥 한 번만 호출
        worker.updateSubscriptions();
      }

      ws.send(
        JSON.stringify({
          type: "unsubscribed",
          symbols: removed,
        })
      );
    } catch (error: any) {
      logger.error("Unsubscribe error:", error);
    }
  }
  /**
   * 실시간 차트(캔들) 구독
   */
  handleSubscribeCandle(ws: ExtendedWebSocket, message: WSMessage) {
    try {
      const { symbol } = message;

      if (!symbol) {
        return ws.send(
          JSON.stringify({ type: "error", message: "Missing symbol" })
        );
      }

      if (!ws.subscribedCandles) ws.subscribedCandles = new Set();

      ws.subscribedCandles.add(symbol.toUpperCase());

      logger.info(`User ${ws.userId} subscribed candle: ${symbol}`);

      ws.send(
        JSON.stringify({
          type: "subscribed_candle",
          symbol,
        })
      );
    } catch (error) {
      logger.error("Subscribe candle error:", error);
    }
  }

  /**
   * 실시간 차트(캔들) 구독 해제
   */
  handleUnsubscribeCandle(ws: ExtendedWebSocket, message: WSMessage) {
    try {
      const { symbol } = message;

      if (!symbol || !ws.subscribedCandles) return;

      ws.subscribedCandles.delete(symbol.toUpperCase());

      logger.info(`User ${ws.userId} unsubscribed candle: ${symbol}`);

      ws.send(
        JSON.stringify({
          type: "unsubscribed_candle",
          symbol,
        })
      );
    } catch (error) {
      logger.error("Unsubscribe candle error:", error);
    }
  }

  /**
   * Ping 응답
   */
  handlePing(ws: ExtendedWebSocket) {
    ws.isAlive = true;
    ws.send(JSON.stringify({ type: "pong" }));
  }
}

export const cryptoHandler = new CryptoHandler();
