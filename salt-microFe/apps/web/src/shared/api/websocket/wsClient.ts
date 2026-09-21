import { RECONNECT_TIME_PENDING, WEBSOCKET_URL } from "@/shared/config";

import { dispatchMessage } from "./handlers";
import {
  CandleListener,
  ConnectionStatus,
  PriceListener,
  Timeframe,
  WSClientReceiveMessage,
  WSClientSendMessage,
  WSMessageType,
} from "./types";

/** 재연결 대기 상한. 첫 대기(`RECONNECT_TIME_PENDING`)에서 두 배씩 늘어 여기서 멈춘다. */
const RECONNECT_MAX_MS = 30_000;

type StatusListener = () => void;

/**
 * 실시간 시세 WebSocket 클라이언트 (싱글턴).
 *
 * ## 구독은 참조 카운트다
 *
 * 한 심볼을 두 화면(실시간 표 · 관심 종목 프리뷰)이 같이 볼 수 있다. 서버에는 **첫 리스너가
 * 붙을 때 구독, 마지막 리스너가 떨어질 때 해제**를 보낸다 (`FE-REQ-012` FR-24).
 *
 * > 원래는 표가 `subscribePriceBatch` 로 구독하고 언마운트 때 **리스너만 떼고 해제를
 * > 보내지 않았다.** 화면을 떠나도 BFF 는 100종목을 계속 밀었다. 그리고 해제 함수들이
 * > 재연결 중이면 `return` 해서 **리스너까지 남았다** — 재연결 뒤 떠난 화면의 리스너가
 * > 다시 불렸다.
 *
 * ## 연결은 첫 구독 때 연다
 *
 * 모듈을 import 하는 것만으로 소켓을 열지 않는다(`ssr.md` — module top-level WebSocket
 * 금지). 원래는 생성자에서 연결했다. 클라이언트 컴포넌트도 서버로 한 번 컴파일되고
 * Node 22 에는 전역 `WebSocket` 이 있어서, 그 모듈이 서버에서 평가되는 경로가 생기면
 * Next 프로세스가 소켓을 연다. 브라우저에서 구독이 생길 때만 연다.
 *
 * 또 하나 — 보는 화면이 없으면 끊긴 뒤 다시 열지 않는다(`scheduleReconnect`). 원래는
 * 구독이 0개여도, BFF 가 몇 시간째 꺼져 있어도 3초 간격 그대로 재연결했다. 이제 대기가
 * 두 배씩 늘어 30초에서 멈춘다.
 */
class WSClient {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private status: ConnectionStatus = ConnectionStatus.Idle;
  private reconnectDelay = RECONNECT_TIME_PENDING;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMessageAt: number | null = null;
  private readonly statusListeners = new Set<StatusListener>();

  public readonly priceListeners = new Map<string, Set<PriceListener>>();
  public readonly candleListeners = new Map<
    string,
    Map<Timeframe, Set<CandleListener>>
  >();

  constructor(url: string) {
    this.url = url;
  }

  // ── 연결 상태 ────────────────────────────────────────────────

  getStatus = (): ConnectionStatus => this.status;

  /** 마지막으로 시세·캔들을 받은 시각(ms). 아직 없으면 `null`. */
  getLastMessageAt = (): number | null => this.lastMessageAt;

  /** `useSyncExternalStore` 에 그대로 넘길 수 있는 모양이다. */
  subscribeStatus = (listener: StatusListener): (() => void) => {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  };

  private setStatus(next: ConnectionStatus) {
    if (this.status === next) return;
    this.status = next;
    this.statusListeners.forEach((fn) => fn());
  }

  // ── 연결 ────────────────────────────────────────────────────

  private ensureConnected() {
    if (typeof window === "undefined") return;
    if (this.ws || this.reconnectTimer) return;
    this.connect();
  }

  private connect() {
    this.reconnectTimer = null;
    if (this.status === ConnectionStatus.Idle) {
      this.setStatus(ConnectionStatus.Connecting);
    }

    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = RECONNECT_TIME_PENDING;
      this.setStatus(ConnectionStatus.Open);
      this.resubscribeAll();
    };

    ws.onclose = () => {
      this.ws = null;
      // 한 번이라도 열린 적이 있든 없든, 닫혔으면 사용자에게 보이는 상태는 같다 —
      // 지금 받는 값이 없다. 오래된 기준 시각을 "실시간"으로 두지 않는다 (`FE-REQ-011` FR-12)
      this.setStatus(ConnectionStatus.Reconnecting);
      this.scheduleReconnect();
    };

    // 오류 뒤에는 언제나 close 가 온다. 재연결은 close 한 곳에서만 건다
    ws.onerror = () => undefined;

    ws.onmessage = (event) => {
      let msg: WSClientReceiveMessage;
      try {
        msg = JSON.parse(event.data) as WSClientReceiveMessage;
      } catch {
        return;
      }
      if (
        msg.type === WSMessageType.PriceUpdate ||
        msg.type === WSMessageType.Candle
      ) {
        this.lastMessageAt = Date.now();
      }
      dispatchMessage(this, msg);
    };
  }

  private scheduleReconnect() {
    if (!this.hasListeners()) {
      // 보는 화면이 없으면 다시 열 이유가 없다. 다음 구독이 연다
      this.setStatus(ConnectionStatus.Idle);
      return;
    }
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private hasListeners() {
    return this.priceListeners.size > 0 || this.candleListeners.size > 0;
  }

  /** 연결이 (다시) 열릴 때 지금 붙어 있는 구독 전부를 서버에 다시 알린다. */
  private resubscribeAll() {
    const symbols = Array.from(this.priceListeners.keys());
    if (symbols.length > 0) {
      this.send({ type: WSMessageType.Subscribe, symbols });
    }
    this.candleListeners.forEach((tfMap, symbol) => {
      tfMap.forEach((_, timeframe) => {
        this.send({ type: WSMessageType.SubscribeCandle, symbol, timeframe });
      });
    });
  }

  /** 열려 있을 때만 보낸다. 닫혀 있으면 열릴 때 `resubscribeAll` 이 보낸다. */
  private send<T extends WSClientSendMessage>(msg: T) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // ── 시세 구독 ────────────────────────────────────────────────

  /**
   * 여러 심볼에 같은 리스너를 붙인다. **돌려준 함수를 언마운트 때 부른다.**
   *
   * 서버 메시지는 한 번씩만 간다 — 이번에 처음 생긴 심볼만 모아 구독 1건, 해제 때
   * 리스너가 0이 된 심볼만 모아 해제 1건.
   */
  subscribePrices(symbols: string[], listener: PriceListener): () => void {
    const upper = Array.from(new Set(symbols.map((s) => s.toUpperCase())));
    const added: string[] = [];

    upper.forEach((symbol) => {
      let set = this.priceListeners.get(symbol);
      if (!set) {
        set = new Set();
        this.priceListeners.set(symbol, set);
        added.push(symbol);
      }
      set.add(listener);
    });

    this.ensureConnected();
    if (added.length > 0) {
      this.send({ type: WSMessageType.Subscribe, symbols: added });
    }

    return () => {
      const removed: string[] = [];
      upper.forEach((symbol) => {
        const set = this.priceListeners.get(symbol);
        if (!set) return;
        set.delete(listener);
        if (set.size === 0) {
          this.priceListeners.delete(symbol);
          removed.push(symbol);
        }
      });
      if (removed.length > 0) {
        this.send({ type: WSMessageType.Unsubscribe, symbols: removed });
      }
    };
  }

  // ── 캔들 구독 ────────────────────────────────────────────────

  subscribeCandle(
    symbol: string,
    timeframe: Timeframe,
    listener: CandleListener,
  ): () => void {
    const upper = symbol.toUpperCase();
    let tfMap = this.candleListeners.get(upper);
    if (!tfMap) {
      tfMap = new Map();
      this.candleListeners.set(upper, tfMap);
    }
    let set = tfMap.get(timeframe);
    const isFirst = !set;
    if (!set) {
      set = new Set();
      tfMap.set(timeframe, set);
    }
    set.add(listener);

    this.ensureConnected();
    if (isFirst) {
      this.send({ type: WSMessageType.SubscribeCandle, symbol: upper, timeframe });
    }

    return () => {
      const current = this.candleListeners.get(upper);
      const listeners = current?.get(timeframe);
      if (!current || !listeners) return;

      listeners.delete(listener);
      if (listeners.size > 0) return;

      current.delete(timeframe);
      if (current.size === 0) this.candleListeners.delete(upper);
      this.send({
        type: WSMessageType.UnsubscribeCandle,
        symbol: upper,
        timeframe,
      });
    };
  }
}

export const wsClient = new WSClient(WEBSOCKET_URL);
