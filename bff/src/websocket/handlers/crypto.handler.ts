import { ExtendedWebSocket, WSMessage } from '../../types/websocket.types';
import { logger } from '../../config/logger';

export class CryptoHandler {
  /**
   * 심볼 구독
   */
  handleSubscribe(ws: ExtendedWebSocket, message: WSMessage) {
    try {
      const { symbols } = message;

      if (!Array.isArray(symbols)) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid symbols format',
        }));
        return;
      }

      // 기존 구독이 없으면 초기화
      if (!ws.subscribedSymbols) {
        ws.subscribedSymbols = new Set();
      }

      // 심볼 추가
      symbols.forEach(symbol => {
        ws.subscribedSymbols!.add(symbol.toUpperCase());
      });

      logger.info(`User ${ws.userId} subscribed to: ${symbols.join(', ')}`);

      ws.send(JSON.stringify({
        type: 'subscribed',
        symbols: Array.from(ws.subscribedSymbols),
      }));
    } catch (error: any) {
      logger.error('Subscribe error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to subscribe',
      }));
    }
  }

  /**
   * 심볼 구독 해제
   */
  handleUnsubscribe(ws: ExtendedWebSocket, message: WSMessage) {
    try {
      const { symbols } = message;

      if (!Array.isArray(symbols) || !ws.subscribedSymbols) {
        return;
      }

      symbols.forEach(symbol => {
        ws.subscribedSymbols!.delete(symbol.toUpperCase());
      });

      logger.info(`User ${ws.userId} unsubscribed from: ${symbols.join(', ')}`);

      ws.send(JSON.stringify({
        type: 'unsubscribed',
        symbols,
      }));
    } catch (error: any) {
      logger.error('Unsubscribe error:', error);
    }
  }

  /**
   * Ping 응답
   */
  handlePing(ws: ExtendedWebSocket) {
    ws.isAlive = true;
    ws.send(JSON.stringify({ type: 'pong' }));
  }
}

export const cryptoHandler = new CryptoHandler();
