import { WebSocketServer } from "ws";
import { parse } from "url";
import { randomUUID } from "crypto";
import { ExtendedWebSocket, WSMessage } from "../types/websocket.types";
import { connectionManager } from "./managers/connection.manager";
import { cryptoHandler } from "./handlers/crypto.handler";
import { env } from "../config/env";
import { logger } from "../config/logger";

const PORT = env.WS_PORT;

const wss = new WebSocketServer({ port: PORT });

/**
 * WebSocket 연결
 *
 * **토큰을 해석하지 않는다**(`bff-architecture.md` §6). 시세는 공개 데이터라 게스트도
 * 받는다 — 토큰은 "들고 왔는가"만 기록한다. 원래는 토큰 원문을 `userId` 로 써서
 * 연결 로그와 환영 메시지에 그대로 찍었다.
 */
wss.on("connection", (ws: ExtendedWebSocket, req) => {
  const { query } = parse(req.url || "", true);

  ws.connectionId = randomUUID();
  ws.authenticated = typeof query.token === "string" && query.token.length > 0;
  ws.isAlive = true;
  ws.subscribedSymbols = new Set();
  ws.subscribedCandles = new Map();

  const connectionId = ws.connectionId;
  connectionManager.addConnection(ws);

  // 환영 메시지
  ws.send(
    JSON.stringify({
      type: "connected",
      message: "WebSocket connection established",
    })
  );

  /**
   * 메시지 수신
   */
  ws.on("message", (data: Buffer) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());

      logger.debug(`Message from ${connectionId}:`, message);

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
        case "subscribe_candle":
          cryptoHandler.handleSubscribeCandle(ws, message);
          break;

        case "unsubscribe_candle":
          cryptoHandler.handleUnsubscribeCandle(ws, message);
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
    connectionManager.removeConnection(connectionId);
  });

  /**
   * 에러
   */
  ws.on("error", (error) => {
    logger.error(`WebSocket error for ${connectionId}:`, error);
  });
});

/**
 * Heartbeat - 30초마다 살아있는지 확인
 */
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws: any) => {
    const extWs = ws as ExtendedWebSocket;

    if (extWs.isAlive === false) {
      logger.warn(`Terminating inactive connection: ${extWs.connectionId}`);
      connectionManager.removeConnection(extWs.connectionId);
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
logger.info(`📡 Clients can connect: ws://localhost:${PORT}`);

/**
 * 종료.
 *
 * **열린 연결을 먼저 끊는다.** `wss.close()` 는 새 연결만 막고 기존 연결을 닫지 않으며,
 * 콜백은 연결이 전부 끝나야 불린다. 원래는 그 콜백에서 `exit` 해서 SIGTERM 을 받은
 * 프로세스가 **포트만 놓고 기존 클라이언트에 시세를 계속 보냈다**(2026-09-21 실측:
 * 40초 뒤에도 살아서 175건 전송). 재배포나 `tsx watch` 재시작 뒤에도 브라우저는 옛
 * 프로세스에 붙어 있었고, 화면은 "연결 끊김"을 알 방법이 없었다.
 */
const shutdown = (signal: string) => {
  logger.info(`${signal}: Closing WebSocket server`);
  clearInterval(heartbeatInterval);
  wss.clients.forEach((client) => client.terminate());
  wss.close(() => process.exit(0));
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export { wss, connectionManager };
