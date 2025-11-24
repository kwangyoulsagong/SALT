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
  public priceListners = new Map<string, Set<PriceListener>>();
  // 캔들 리스너
  public candleListners = new Map<
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
      const priceSymbols = Array.from(this.priceListners.keys());
      if (priceSymbols.length > 0) {
        this.send({ type: "subscribe", symbols: priceSymbols });
      }

      // 캔들 재구독
      this.candleListners.forEach((tfMap, symbol) => {
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
}

export const wsCLient = new WSClient(WEBSOCKET_URL);
