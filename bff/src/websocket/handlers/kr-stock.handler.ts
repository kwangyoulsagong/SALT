import { ExtendedWebSocket, WSMessage } from "../../types/websocket.types";
import { krStreamManager, KrStreamManager } from "../managers/kr-stream.manager";

/** 서버 DTO(`krCodeParamSchema`)와 같은 규칙 */
const CODE_PATTERN = /^[0-9A-Z]{6}$/;

const reply = (ws: ExtendedWebSocket, message: unknown) => ws.send(JSON.stringify(message));

/**
 * 국내 주식 구독 (F011 · `BFF-REQ-040` FR-6). 코인과 같은 `subscribe` · `unsubscribe` 에 `assetType: "kr_stock"` 을 단다.
 *
 * ```json
 * { "type": "subscribe", "assetType": "kr_stock", "symbols": ["005930"], "token": "<access token>" }
 * ```
 *
 * **토큰을 구독 메시지에 싣는다.** 소유자 전용이라 연결이 누구인지 서버가 판정해야 하는데, 브라우저 WebSocket 은 헤더를
 * 못 단다. 연결 URL `?token=` 도 받지만(기존 계약) 메시지 쪽을 먼저 본다 — 토큰이 만료되면 화면이 새 토큰으로 다시
 * 구독해 이어 붙일 수 있고, URL 은 프록시 접근 로그에 남는다.
 */
export class KrStockHandler {
  constructor(private readonly streams: KrStreamManager = krStreamManager) {}

  private codes(ws: ExtendedWebSocket, message: WSMessage): string[] | null {
    const { symbols } = message;
    if (!Array.isArray(symbols) || symbols.some((s) => typeof s !== "string")) {
      reply(ws, { type: "error", assetType: "kr_stock", code: "INVALID_SYMBOLS", message: "Invalid symbols format" });
      return null;
    }
    const codes = [...new Set((symbols as string[]).map((s) => s.trim().toUpperCase()))];
    if (codes.some((c) => !CODE_PATTERN.test(c))) {
      reply(ws, { type: "error", assetType: "kr_stock", code: "INVALID_SYMBOLS", message: "kr_stock symbols are 6-character codes" });
      return null;
    }
    return codes;
  }

  handleSubscribe(ws: ExtendedWebSocket, message: WSMessage, connectionToken?: string) {
    const codes = this.codes(ws, message);
    if (!codes) return;
    const token = typeof message.token === "string" && message.token.length > 0 ? message.token : connectionToken;
    if (!token) {
      reply(ws, { type: "error", assetType: "kr_stock", code: "KR_STOCK_AUTH_REQUIRED", message: "token required" });
      return;
    }
    const subscribed = this.streams.subscribe(ws, codes, token);
    if (subscribed) reply(ws, { type: "subscribed", assetType: "kr_stock", symbols: subscribed });
  }

  handleUnsubscribe(ws: ExtendedWebSocket, message: WSMessage) {
    const codes = this.codes(ws, message);
    if (!codes) return;
    reply(ws, { type: "unsubscribed", assetType: "kr_stock", symbols: this.streams.unsubscribe(ws, codes) });
  }
}

export const krStockHandler = new KrStockHandler();
