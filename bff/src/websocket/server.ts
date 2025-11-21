import { WebSocketServer } from "ws";
import { parse } from "url";
import { ExtendedWebSocket, WSMessage } from "../types/websocket.types";
import { connectionManager } from "./managers/connection.manager";
import { cryptoHandler } from "./handlers/crypto.handler";
import { env } from "../config/env";
import { logger } from "../config/logger";

const PORT = env.WS_PORT;

const wss = new WebSocketServer({ port: PORT });

/**
 * JWT 검증 (간단 버전 - 실제로는 토큰 검증 필요)
 */
function authenticateToken(token: string | null): string | null {
  if (!token) return null;

  // TODO: 실제 JWT 검증 로직 추가
  // 지금은 간단하게 토큰을 userId로 사용
  return token;
}

/**
 * WebSocket 연결
 */
wss.on("connection", (ws: ExtendedWebSocket, req) => {
  const { query } = parse(req.url || "", true);
  const token = query.token as string;

  // 인증
  const userId = authenticateToken(token);

  // 로그인 안한 경우에도 연결은 허용
  ws.userId = userId ?? "guest";
  ws.isAlive = true;
  ws.subscribedSymbols = new Set();
  ws.subscribedCandles = new Set();

  // 게스트도 connectionManager에 넣기 (고유 ID 부여)
  const connectionId = userId ?? "guest_" + Date.now();
  connectionManager.addConnection(connectionId, ws);

  logger.info(`WebSocket connected: ${connectionId}`);

  logger.info(`WebSocket connected: ${userId}`);

  // 환영 메시지
  ws.send(
    JSON.stringify({
      type: "connected",
      message: "WebSocket connection established",
      userId,
    })
  );

  /**
   * 메시지 수신
   */
  ws.on("message", (data: Buffer) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());

      logger.debug(`Message from ${userId}:`, message);

      switch (message.type) {
        case "subscribe":
          cryptoHandler.handleSubscribe(ws, message);
          break;

        case "unsubscribe":
          cryptoHandler.handleUnsubscribe(ws, message);
          break;

        case "ping":
          cryptoHandler.handlePing(ws);
          break;

        default:
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Unknown message type",
            })
          );
      }
    } catch (error: any) {
      logger.error("Message parse error:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        })
      );
    }
  });

  /**
   * Pong 응답
   */
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  /**
   * 연결 종료
   */
  ws.on("close", () => {
    logger.info(`WebSocket disconnected: ${connectionId}`);
    connectionManager.removeConnection(connectionId);
  });

  /**
   * 에러
   */
  ws.on("error", (error) => {
    logger.error(`WebSocket error for ${userId}:`, error);
  });
});

/**
 * Heartbeat - 30초마다 살아있는지 확인
 */
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws: any) => {
    const extWs = ws as ExtendedWebSocket;

    if (extWs.isAlive === false) {
      logger.warn(`Terminating inactive connection: ${extWs.userId}`);
      if (extWs.userId) {
        connectionManager.removeConnection(extWs.userId);
      }
      return extWs.terminate();
    }

    extWs.isAlive = false;
    extWs.ping();
  });
}, env.WS_HEARTBEAT_INTERVAL);

/**
 * 서버 종료 시 정리
 */
wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

logger.info(`🔌 BFF WebSocket Server is running on port ${PORT}`);
logger.info(`📡 Clients can connect: ws://localhost:${PORT}?token=YOUR_TOKEN`);

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM: Closing WebSocket server");
  clearInterval(heartbeatInterval);
  wss.close(() => {
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT: Closing WebSocket server");
  clearInterval(heartbeatInterval);
  wss.close(() => {
    process.exit(0);
  });
});

export { wss, connectionManager };
