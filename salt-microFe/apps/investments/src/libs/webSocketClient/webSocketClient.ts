import { WEBSOCKET_URL } from "@/constants/api";
import {
  CandleListener,
  PriceListener,
  Timeframe,
  WSClientSendMessage,
  WSClientReceiveMessage,
} from "./type/webSokcetClient.type";
import { RECONNECT_TIME_PENDING } from "@/constants/util";
import { dispatchMessage } from "./webSocketClientHandlers";

class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnecting = false;
  // 가격 리스너
  public priceListeners = new Map<string, Set<PriceListener>>();
  // 캔들 리스너
  public candleListeners = new Map<
    string,
    Map<Timeframe, Set<CandleListener>>
  >();

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  // 연결
  private connect() {
    this.reconnecting = true;
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      console.log("웹소켓을 연결합니다, 재연결, 재구독 ....");

      // 가격 재구독
      const priceSymbols = Array.from(this.priceListeners.keys());
      if (priceSymbols.length > 0) {
        this.send({ type: "subscribe", symbols: priceSymbols });
      }

      // 캔들 재구독
      this.candleListeners.forEach((tfMap, symbol) => {
        tfMap.forEach((_, timeframe) => {
          this.send({ type: "subscribe_candle", symbol, timeframe });
        });
      });

      this.reconnecting = false;
    };

    this.ws.onclose = () => {
      console.log("웹소켓 종료, 재연결 ....");
      setTimeout(() => this.connect(), RECONNECT_TIME_PENDING);
    };

    this.ws.onerror = (err) => {
      console.error("웹소켓 에러 사유", err);
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as WSClientReceiveMessage;
      dispatchMessage(this, msg);
    };
  }
  private send<T extends WSClientSendMessage>(msg: T) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  subscribePriceBatch(symbols: string[]) {
    const upper = symbols.map((s) => s.toUpperCase());

    //현재 재연결 중이면, 바로 보내지 말고 onopen 때 자동 구독
    if (!this.reconnecting) {
      this.send({ type: "subscribe", symbols: upper });
    }

    upper.forEach((symbol) => {
      if (!this.priceListeners.has(symbol)) {
        this.priceListeners.set(symbol, new Set());
      }
    });
  }

  unsubscribePriceBatch(symbols: string[]) {
    const upper = symbols.map((s) => s.toUpperCase());
    if (!this.reconnecting) {
      this.send({ type: "unsubscribe", symbols: upper });
    }
    upper.forEach((symbol) => {
      this.priceListeners.delete(symbol);
    });
  }

  subscribePrice(symbol: string, listener: PriceListener) {
    const upper = symbol.toUpperCase();
    let set = this.priceListeners.get(upper);
    const isFirst = !set || set.size === 0;

    if (!set) {
      set = new Set();
      this.priceListeners.set(upper, set);
    }
    set.add(listener);

    if (isFirst && !this.reconnecting) {
      this.send({ type: "subscribe", symbols: [upper] });
    }
  }

  unsubscribePrice(symbol: string, listener: PriceListener) {
    if (this.reconnecting) return;

    const upper = symbol.toUpperCase();
    const set = this.priceListeners.get(upper);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) {
      this.priceListeners.delete(upper);
      this.send({ type: "unsubscribe", symbols: [upper] });
    }
  }

  subscribeCandle(
    symbol: string,
    timeframe: Timeframe,
    listener: CandleListener
  ) {
    const upper = symbol.toUpperCase();
    let tfMap = this.candleListeners.get(upper);
    if (!tfMap) {
      tfMap = new Map();
      this.candleListeners.set(upper, tfMap);
    }
    let set = tfMap.get(timeframe);
    if (!set) {
      set = new Set();
      tfMap.set(timeframe, set);
    }
    set.add(listener);

    this.send({ type: "subscribe_candle", symbol: upper, timeframe });
  }

  unsubscribeCandle(
    symbol: string,
    timeframe: Timeframe,
    listener: CandleListener
  ) {
    if (this.reconnecting) return;

    const upper = symbol.toUpperCase();
    const tfMap = this.candleListeners.get(upper);
    if (!tfMap) return;

    const set = tfMap.get(timeframe);
    if (!set) return;

    set.delete(listener);

    if (set.size === 0) {
      tfMap.delete(timeframe);
      this.send({ type: "unsubscribe_candle", symbol: upper, timeframe });
    }

    if (tfMap.size === 0) {
      this.candleListeners.delete(upper);
    }
  }

  addPriceListener(symbol: string, listener: PriceListener) {
    const upper = symbol.toUpperCase();
    let set = this.priceListeners.get(upper);
    if (!set) {
      set = new Set();
      this.priceListeners.set(upper, set);
    }
    set.add(listener);
  }

  removePriceListener(symbol: string, listener: PriceListener) {
    const upper = symbol.toUpperCase();
    const set = this.priceListeners.get(upper);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) {
      this.priceListeners.delete(upper);
    }
  }
}

export const wsClient = new WSClient(WEBSOCKET_URL);
