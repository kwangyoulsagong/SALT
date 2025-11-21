// src/lib/wsClient.ts
type Timeframe = "1m" | "5m" | "1h";

export interface PriceUpdate {
  symbol: string;
  currentPrice: number;
  change24h: number;
  timestamp: string;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type PriceListener = (data: PriceUpdate) => void;
type CandleListener = (data: {
  symbol: string;
  timeframe: Timeframe;
  candle: Candle;
}) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnecting = false; // 👈 추가

  private priceListeners = new Map<string, Set<PriceListener>>();
  private candleListeners = new Map<
    string,
    Map<Timeframe, Set<CandleListener>>
  >();

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
    this.reconnecting = true; // 👈 재연결 시작
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("🔄 WS reconnected, resubscribing...");

      // 📌 가격 재구독
      const priceSymbols = Array.from(this.priceListeners.keys());
      if (priceSymbols.length > 0) {
        this.send({ type: "subscribe", symbols: priceSymbols });
      }

      // 📌 캔들 재구독
      this.candleListeners.forEach((tfMap, symbol) => {
        tfMap.forEach((_, timeframe) => {
          this.send({ type: "subscribe_candle", symbol, timeframe });
        });
      });

      this.reconnecting = false; // 👈 재연결 완료!
    };

    this.ws.onclose = () => {
      console.log("❌ WS closed, reconnecting...");
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => console.error("WS error", err);

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "price_update") {
        const listeners = this.priceListeners.get(msg.data.symbol);
        listeners?.forEach((fn) => fn(msg.data));
      }

      if (msg.type === "candle") {
        const tfMap = this.candleListeners.get(msg.symbol);
        const listeners = tfMap?.get(msg.timeframe);
        listeners?.forEach((fn) =>
          fn({ symbol: msg.symbol, timeframe: msg.timeframe, candle: msg.data })
        );
      }
    };
  }

  private send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
  subscribePriceBatch(symbols: string[]) {
    const upper = symbols.map((s) => s.toUpperCase());

    // 🔐 현재 재연결 중이면, 바로 보내지 말고 onopen 때 자동 구독됨
    if (!this.reconnecting) {
      this.send({ type: "subscribe", symbols: upper });
    }

    // 💾 리스너용 Map에 (심볼은 등록만)
    upper.forEach((symbol) => {
      if (!this.priceListeners.has(symbol)) {
        this.priceListeners.set(symbol, new Set());
      }
    });
  }
  unsubscribePriceBatch(symbols: string[]) {
    const upper = symbols.map((s) => s.toUpperCase());

    // 🔐 재연결 중이면 서버와 sync가 안 맞을 수 있음 → 무시
    if (!this.reconnecting) {
      this.send({ type: "unsubscribe", symbols: upper });
    }

    // 💾 Map에서 리스너만 제거 (서버에게 요청 보내지는 위에서)
    upper.forEach((symbol) => {
      this.priceListeners.delete(symbol);
    });
  }
  // ---- 시세 구독 ----
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
    if (this.reconnecting) return; // 🔥 재연결 중이면 무시

    const upper = symbol.toUpperCase();
    const set = this.priceListeners.get(upper);
    if (!set) return;

    set.delete(listener);

    if (set.size === 0) {
      this.priceListeners.delete(upper);
      this.send({ type: "unsubscribe", symbols: [upper] });
    }
  }

  // ---- 캔들 ----
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

    // 🔥 reconnect 상관없이 항상 서버에 구독 요청 전송
    this.send({ type: "subscribe_candle", symbol: upper, timeframe });
  }

  unsubscribeCandle(
    symbol: string,
    timeframe: Timeframe,
    listener: CandleListener
  ) {
    if (this.reconnecting) return; // 🔥 재연결 중이면 무시

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

export const wsClient = new WSClient("ws://localhost:4002");
