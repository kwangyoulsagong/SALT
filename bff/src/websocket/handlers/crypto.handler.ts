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
      const { symbol, timeframe } = message;
      console.log("📩 Received subscribe_candle from client:", message); // 👈 찍기!!

      if (!symbol || !timeframe) {
        return ws.send(
          JSON.stringify({
            type: "error",
            message: "Missing symbol or timeframe",
          })
        );
      }

      const upper = symbol.toUpperCase();

      // 📌 Candle 구독 Map 초기화
      if (!ws.subscribedCandles) ws.subscribedCandles = new Map();

      // 📌 해당 symbol에 대한 timeframe Set 준비
      if (!ws.subscribedCandles.has(upper)) {
        ws.subscribedCandles.set(upper, new Set());
      }

      const tfSet = ws.subscribedCandles.get(upper)!;
      const isFirst = tfSet.size === 0;

      tfSet.add(timeframe);

      logger.info(`WS ${ws.userId} subscribed candle: ${upper} (${timeframe})`);

      // 🟢 처음 구독하는 경우에만 Worker에 반영
      if (isFirst) {
        worker.updateSubscriptions();
      }

      ws.send(
        JSON.stringify({
          type: "subscribed_candle",
          symbol: upper,
          timeframe,
        })
      );
    } catch (error) {
      logger.error("Subscribe candle error:", error);
    }
  }

  handleUnsubscribeCandle(ws: ExtendedWebSocket, message: WSMessage) {
    try {
      const { symbol, timeframe } = message;
      if (!symbol || !timeframe || !ws.subscribedCandles) return;

      const upper = symbol.toUpperCase();
      const tfSet = ws.subscribedCandles.get(upper);
      if (!tfSet) return;

      tfSet.delete(timeframe);
      logger.info(
        `WS ${ws.userId} unsubscribed candle: ${upper} (${timeframe})`
      );

      // ❗️ 모두 제거되면 symbol 삭제
      if (tfSet.size === 0) {
        ws.subscribedCandles.delete(upper);
        // 🔥 모두 제거된 경우 Worker에 반영
        worker.updateSubscriptions();
      }

      ws.send(
        JSON.stringify({
          type: "unsubscribed_candle",
          symbol: upper,
          timeframe,
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
