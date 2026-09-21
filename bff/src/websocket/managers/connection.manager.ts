import { ExtendedWebSocket } from "../../types/websocket.types";
import { logger } from "../../config/logger";

class ConnectionManager {
  private connections: Map<string, ExtendedWebSocket> = new Map();

  /**
   * 연결 추가. 키는 **소켓 id** 다 (`ExtendedWebSocket.connectionId`).
   */
  addConnection(ws: ExtendedWebSocket) {
    this.connections.set(ws.connectionId, ws);
    logger.info(
      `WS connected: ${ws.connectionId} (${ws.authenticated ? "auth" : "guest"}), Total: ${this.connections.size}`
    );
  }

  /**
   * 연결 제거. 이미 지워진 id 면 아무것도 하지 않는다 — heartbeat 종료와 `close`
   * 이벤트가 같은 소켓에 대해 둘 다 부른다.
   */
  removeConnection(connectionId: string) {
    if (!this.connections.delete(connectionId)) return;
    logger.info(
      `WS disconnected: ${connectionId}, Total: ${this.connections.size}`
    );
  }

  /**
   * 모든 사용자에게 브로드캐스트
   */
  broadcast(message: any) {
    const messageStr = JSON.stringify(message);
    let sent = 0;

    this.connections.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(messageStr);
        sent++;
      }
    });

    logger.debug(`Broadcast message to ${sent} users`);
  }

  /**
   * 특정 심볼을 구독 중인 사용자들에게만 전송
   */
  broadcastToSubscribers(symbol: string, message: any) {
    const messageStr = JSON.stringify(message);
    let sent = 0;

    this.connections.forEach((ws) => {
      if (ws.readyState === ws.OPEN && ws.subscribedSymbols?.has(symbol)) {
        ws.send(messageStr);
        sent++;
      }
    });

    logger.debug(`Sent ${symbol} update to ${sent} subscribers`);
  }

  /**
   * 현재 연결 수
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 모든 구독 중인 심볼 가져오기
   */
  getAllSubscribedSymbols(): string[] {
    const symbols = new Set<string>();

    this.connections.forEach((ws) => {
      ws.subscribedSymbols?.forEach((symbol) => symbols.add(symbol));
    });

    return Array.from(symbols);
  }
  /**
   * 특정 심볼 차트를 구독 중인 사용자에게만 캔들 업데이트 전송
   */
  broadcastCandleToSubscribers(symbol: string, timeframe: string, candle: any) {
    if (!symbol || !timeframe || !candle) return;

    const messageStr = JSON.stringify({
      type: "candle",
      symbol,
      timeframe,
      data: candle,
    });

    let sent = 0;

    this.connections.forEach((ws) => {
      if (!ws.subscribedCandles) return;

      if (!(ws.subscribedCandles instanceof Map)) return;

      const tfSet = ws.subscribedCandles.get(symbol);
      if (!tfSet) return;

      if (!tfSet.has(timeframe)) return;

      // 💚 이제 안전하게 보냄
      if (ws.readyState === ws.OPEN) {
        ws.send(messageStr);
        sent++;
      }
    });

    logger.debug(`Sent ${symbol} (${timeframe}) candle to ${sent} subscribers`);
  }
}

export const connectionManager = new ConnectionManager();
