import { logger } from "../../config/logger";
import { backendApi } from "../../services/backend-api.service";
import { toKrPriceUpdate, type KrPriceUpdate } from "../../services/kr-stock.viewmodel";
import { ExtendedWebSocket } from "../../types/websocket.types";
import { toUpstreamClientError } from "../../utils/error.util";
import { createSseParser } from "../../utils/sse.util";

/**
 * 국내 주식 실시간 중계 (F011 슬라이스 2 · `BFF-REQ-040` FR-6~9).
 *
 * ```
 * salt-server GET /api/market/kr/stream (SSE, 사용자 JWT · 소유자 전용)
 *   → 연결별 중계 → 그 연결이 구독한 코드만 · 500ms 묶음 → WS price_update { assetType: "kr_stock" }
 * ```
 *
 * **왜 연결마다 upstream 을 따로 여는가.** 서버 스트림은 소유자만 열 수 있다(슬라이스 1 판단 8 — 내부 토큰 대신 사용자
 * JWT). 하나를 열어 모두에게 뿌리면 비소유자 연결에도 국내 주식 시세가 간다. 연결이 자기 토큰으로 열면 소유자 판정을
 * 서버가 연결마다 한다. 사용자 ≤10명 · 소유자 전용이라 실제 동시 스트림은 소유자 탭 수다 — 상한 `MAX_RELAYS` 로 막는다.
 *
 * 업비트 경로(`price-updater.worker` · `upbit-ws.service`)와 **섞지 않는다.** 6자리 코드를 업비트에 보내면 업비트가
 * 모르는 코드라 구독 요청이 통째로 거부될 수 있다(실측 안 함) — 그러면 코인 시세까지 끊긴다.
 *
 * 토큰은 이 맵 안에만 있다. 소켓 객체 · 로그에 두지 않는다(`ExtendedWebSocket.authenticated` 주석).
 */

/** 서버는 체결마다 바로 흘린다 — 화면 반영 < 1s 목표 안에서 리렌더를 묶는다(`performance-bff.md` §6 throttle) */
const FLUSH_MS = 500;
/** 서버 하트비트가 15초 — 세 번 놓치면 끊긴 것으로 본다 */
const IDLE_TIMEOUT_MS = 45_000;
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000];
/** 동시 upstream 상한(`performance-bff.md` §7). 소유자 1~2명 × 탭 몇 개 */
export const MAX_RELAYS = 20;
/** 연결 하나가 구독할 수 있는 코드 수 — 서버 수집 유니버스 상한(100)과 같다 */
export const MAX_KR_CODES = 100;

export type KrStreamOpener = (token: string, signal: AbortSignal) => Promise<NodeJS.ReadableStream>;

interface Relay {
  ws: ExtendedWebSocket;
  token: string;
  codes: Set<string>;
  aborter: AbortController | null;
  pending: Map<string, KrPriceUpdate>;
  flushTimer: NodeJS.Timeout | null;
  reconnectTimer: NodeJS.Timeout | null;
  attempt: number;
}

const send = (ws: ExtendedWebSocket, message: unknown) => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
};

/** 화면이 받는 오류 — `code` 로 분기한다. 404 = 소유자 아님 · 503 = 꺼짐 · 401 = 토큰 만료(새 토큰으로 다시 구독) */
const sendError = (ws: ExtendedWebSocket, code: string, message: string) =>
  send(ws, { type: "error", assetType: "kr_stock", code, message });

const defaultOpener: KrStreamOpener = (token, signal) =>
  backendApi.openAuthStream("/market/kr/stream", token, undefined, { method: "GET", timeout: IDLE_TIMEOUT_MS, signal });

export class KrStreamManager {
  private readonly relays = new Map<string, Relay>();

  constructor(
    private readonly open: KrStreamOpener = defaultOpener,
    private readonly timing: { flushMs: number; backoffMs: readonly number[] } = { flushMs: FLUSH_MS, backoffMs: BACKOFF_MS },
  ) {}

  /**
   * 구독 추가. 토큰은 매번 바꿔 둔다 — 만료로 끊긴 뒤 화면이 새 토큰으로 다시 구독하면 그 토큰으로 다시 연다.
   * @returns 이 연결이 지금 구독 중인 코드 전체. 상한에 걸렸으면 `null`
   */
  subscribe(ws: ExtendedWebSocket, codes: string[], token: string): string[] | null {
    const existing = this.relays.get(ws.connectionId);
    const current = existing?.codes ?? new Set<string>();
    if (current.size + codes.filter((c) => !current.has(c)).length > MAX_KR_CODES) {
      sendError(ws, "KR_STREAM_LIMIT", `up to ${MAX_KR_CODES} codes per connection`);
      return null;
    }
    if (!existing && this.relays.size >= MAX_RELAYS) {
      logger.warn(`[kr-stream] 상한 ${MAX_RELAYS} — ${ws.connectionId} 거부`);
      sendError(ws, "KR_STREAM_LIMIT", "too many kr_stock streams");
      return null;
    }
    const relay: Relay = existing ?? {
      ws,
      token,
      codes: current,
      aborter: null,
      pending: new Map(),
      flushTimer: null,
      reconnectTimer: null,
      attempt: 0,
    };
    this.relays.set(ws.connectionId, relay);
    relay.token = token;
    codes.forEach((c) => relay.codes.add(c));
    // 열려 있거나 다시 열기를 기다리는 중이면 그대로 둔다 — 새 코드는 같은 스트림에서 거른다
    if (!relay.aborter && !relay.reconnectTimer) void this.connect(relay);
    return [...relay.codes];
  }

  /** @returns 실제로 빠진 코드. 남은 코드가 없으면 upstream 을 닫는다 */
  unsubscribe(ws: ExtendedWebSocket, codes: string[]): string[] {
    const relay = this.relays.get(ws.connectionId);
    if (!relay) return [];
    const removed = codes.filter((c) => relay.codes.delete(c));
    removed.forEach((c) => relay.pending.delete(c));
    if (relay.codes.size === 0) this.release(ws.connectionId);
    return removed;
  }

  /** 연결이 끊겼다 — upstream 을 닫는다. 안 하면 서버 스트림이 유령으로 남는다(`streaming-sse.md` §4) */
  release(connectionId: string) {
    const relay = this.relays.get(connectionId);
    if (!relay) return;
    this.relays.delete(connectionId);
    relay.aborter?.abort();
    if (relay.flushTimer) clearInterval(relay.flushTimer);
    if (relay.reconnectTimer) clearTimeout(relay.reconnectTimer);
    logger.info(`[kr-stream] ${connectionId} 해제 — 남은 중계 ${this.relays.size}`);
  }

  releaseAll() {
    [...this.relays.keys()].forEach((id) => this.release(id));
  }

  /** 테스트 · 관측용 */
  activeCount() {
    return this.relays.size;
  }

  private isCurrent(relay: Relay) {
    return this.relays.get(relay.ws.connectionId) === relay;
  }

  private async connect(relay: Relay) {
    const aborter = new AbortController();
    relay.aborter = aborter;
    let stream: NodeJS.ReadableStream;
    try {
      stream = await this.open(relay.token, aborter.signal);
    } catch (error) {
      relay.aborter = null;
      if (aborter.signal.aborted || !this.isCurrent(relay)) return;
      this.onOpenFailed(relay, error);
      return;
    }
    if (aborter.signal.aborted || !this.isCurrent(relay)) {
      (stream as unknown as { destroy?: () => void }).destroy?.();
      return;
    }

    relay.attempt = 0;
    logger.info(`[kr-stream] ${relay.ws.connectionId} 열림 — 코드 ${relay.codes.size}`);
    if (!relay.flushTimer) relay.flushTimer = setInterval(() => this.flush(relay), this.timing.flushMs);

    const parse = createSseParser(({ event, data }) => {
      if (event !== "tick") return;
      let events: unknown;
      try {
        events = JSON.parse(data);
      } catch {
        return;
      }
      if (!Array.isArray(events)) return;
      for (const raw of events) {
        const update = toKrPriceUpdate(raw);
        // 그 연결이 구독한 코드만(`performance-bff.md` §6 하위 구독). 같은 코드는 최신 값 하나만 남긴다
        if (update && relay.codes.has(update.symbol)) relay.pending.set(update.symbol, update);
      }
    });

    const ended = () => {
      if (relay.aborter !== aborter) return;
      relay.aborter = null;
      if (aborter.signal.aborted || !this.isCurrent(relay)) return;
      logger.warn(`[kr-stream] ${relay.ws.connectionId} upstream 끊김 — 다시 연다`);
      this.scheduleReconnect(relay);
    };
    stream.on("data", (chunk: Buffer | string) => parse(chunk.toString()));
    stream.on("end", ended);
    stream.on("close", ended);
    stream.on("error", (error: Error) => {
      if (!aborter.signal.aborted) logger.warn(`[kr-stream] ${relay.ws.connectionId} upstream 오류: ${error.message}`);
      ended();
    });
  }

  /**
   * 4xx 는 다시 열어도 같은 답이다 — 화면에 알리고 멈춘다. 401(토큰 만료)은 화면이 새 토큰으로 다시 구독하면 다시 연다.
   * 503 `KR_STOCK_DISABLED`(키 없음)도 같다. 그 밖(5xx · 연결 실패 · 타임아웃)은 물러서며 다시 연다
   */
  private onOpenFailed(relay: Relay, error: unknown) {
    const client = toUpstreamClientError(error);
    const response = (error as { response?: { status?: number; data?: { code?: unknown } } })?.response;
    if (client) {
      logger.warn(`[kr-stream] ${relay.ws.connectionId} 거부 ${client.status} ${client.code ?? ""}`);
      sendError(relay.ws, client.code ?? `HTTP_${client.status}`, client.message);
      this.release(relay.ws.connectionId);
      return;
    }
    if (response?.status === 503 && response.data?.code === "KR_STOCK_DISABLED") {
      sendError(relay.ws, "KR_STOCK_DISABLED", "kr_stock_disabled");
      this.release(relay.ws.connectionId);
      return;
    }
    logger.warn(`[kr-stream] ${relay.ws.connectionId} 열기 실패: ${(error as Error)?.message}`);
    this.scheduleReconnect(relay);
  }

  private scheduleReconnect(relay: Relay) {
    const { backoffMs } = this.timing;
    const delay = backoffMs[Math.min(relay.attempt, backoffMs.length - 1)];
    relay.attempt += 1;
    relay.reconnectTimer = setTimeout(() => {
      relay.reconnectTimer = null;
      if (this.isCurrent(relay)) void this.connect(relay);
    }, delay);
  }

  private flush(relay: Relay) {
    if (relay.pending.size === 0) return;
    const updates = [...relay.pending.values()];
    relay.pending.clear();
    // 코인과 같은 메시지 — 종목 하나에 한 통(`upbit-ws.service` `broadcastToSubscribers`)
    for (const data of updates) send(relay.ws, { type: "price_update", data });
  }
}

export const krStreamManager = new KrStreamManager();
