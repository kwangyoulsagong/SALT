/** 실시간 시세 WebSocket 의 wire 계약. */

/** 캔들 주기. 문자열 리터럴 union 을 쓰지 않는다 (`layered-architecture.md` §6). */
export enum Timeframe {
  OneMinute = "1m",
  FiveMinutes = "5m",
  OneHour = "1h",
}

/** 메시지 종류. enum 값이 그대로 wire 의 `type` 문자열이다. */
export enum WSMessageType {
  Subscribe = "subscribe",
  Unsubscribe = "unsubscribe",
  SubscribeCandle = "subscribe_candle",
  UnsubscribeCandle = "unsubscribe_candle",
  PriceUpdate = "price_update",
  Candle = "candle",
  Subscribed = "subscribed",
  Unsubscribed = "unsubscribed",
  /**
   * 아래 넷은 BFF 가 원래부터 보내던 응답인데 이 enum 에 없어서, 받을 때마다
   * `dispatchMessage` 의 exhaustive 분기가 `"없는 타입:"` 경고를 찍었다.
   */
  Connected = "connected",
  SubscribedCandle = "subscribed_candle",
  UnsubscribedCandle = "unsubscribed_candle",
  Pong = "pong",
  Error = "error",
}

/**
 * 연결 상태. 화면은 이것으로 "실시간 기준 시각"과 "연결 끊김"을 가른다.
 *
 * `Reconnecting` 은 **닫힌 뒤 다시 여는 중**이다 — 한 번도 열린 적이 없어도 닫혔으면
 * 여기로 온다. 화면에 보여줄 말은 같다: 지금 받는 값이 없다.
 */
export enum ConnectionStatus {
  Idle = "idle",
  Connecting = "connecting",
  Open = "open",
  Reconnecting = "reconnecting",
}

export interface PriceUpdate {
  /**
   * 자산군(`BFF-REQ-040` FR-10). 코인은 `crypto`, 국내 주식은 `kr_stock` — 국내 주식은 `handlers/priceUpdate` 가
   * 따로 보낸다. 옛 BFF 는 보내지 않는다 — 없으면 코인이다
   */
  assetType?: "crypto" | "kr_stock";
  symbol: string;
  currentPrice: number;
  change24h: number;
  /**
   * 24시간 등락 **금액**(거래소 값, BFF 가 옮긴다). 옛 BFF 는 보내지 않는다 — 없으면 이전 값을 둔다.
   */
  change24hAmount?: number;
  timestamp: string;
}

export interface Candle {
  /**
   * 봉 시작 **epoch ms 숫자**다(BFF `candleBuilder`). 전에는 `string` 으로 적혀 있었고, 그 타입을 믿고
   * REST 봉(KST 문자열)과 `===` 로 비교해 틱마다 봉이 붙었다(`FE-REQ-034` 문제 4)
   */
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleEvent {
  symbol: string;
  timeframe: Timeframe;
  candle: Candle;
}

export type PriceListener = (data: PriceUpdate) => void;
/** 국내 주식 체결 — 6자리 코드. 코인 리스너와 맵을 나눈다(같은 문자열이어도 다른 종목이다) */
export type KrPriceListener = (data: PriceUpdate) => void;
/**
 * 국내 주식 구독 거부 — BFF `error { assetType: "kr_stock", code }`. 404 = 소유자 아님 · `KR_STOCK_DISABLED` = 꺼짐 ·
 * `KR_STOCK_AUTH_REQUIRED` = 토큰 없음 · 그 밖 서버 4xx 코드. 받은 쪽은 실시간을 포기하고 저장값 조회로 간다
 */
export type KrErrorListener = (code: string) => void;

/** 자산군 — 구독 메시지가 국내 주식을 고를 때만 단다(없으면 코인, 기존 계약) */
export enum WSAssetType {
  KrStock = "kr_stock",
}
export type CandleListener = (data: CandleEvent) => void;

export type WSClientSendMessage =
  | { type: WSMessageType.Subscribe; symbols: string[] }
  | { type: WSMessageType.Unsubscribe; symbols: string[] }
  /**
   * 국내 주식은 **토큰을 메시지에 싣는다**(`BFF-REQ-040` 결정 3) — 소유자 전용이라 BFF 가 연결마다 이 토큰으로 서버
   * 스트림을 연다. 브라우저 WebSocket 은 헤더를 못 단다
   */
  | { type: WSMessageType.Subscribe; assetType: WSAssetType.KrStock; symbols: string[]; token: string }
  | { type: WSMessageType.Unsubscribe; assetType: WSAssetType.KrStock; symbols: string[] }
  | { type: WSMessageType.SubscribeCandle; symbol: string; timeframe: Timeframe }
  | {
      type: WSMessageType.UnsubscribeCandle;
      symbol: string;
      timeframe: Timeframe;
    };

export type WSClientReceiveMessage =
  | { type: WSMessageType.PriceUpdate; data: PriceUpdate }
  | {
      type: WSMessageType.Candle;
      symbol: string;
      timeframe: Timeframe;
      data: Candle;
    }
  | { type: WSMessageType.Subscribed; symbols: string[] }
  | { type: WSMessageType.Unsubscribed; symbols: string[] }
  | { type: WSMessageType.Connected }
  | { type: WSMessageType.SubscribedCandle; symbol: string; timeframe: string }
  | { type: WSMessageType.UnsubscribedCandle; symbol: string; timeframe: string }
  | { type: WSMessageType.Pong }
  | { type: WSMessageType.Error; message: string; assetType?: WSAssetType; code?: string };

export interface WSClientContext {
  priceListeners: Map<string, Set<PriceListener>>;
  krPriceListeners: Map<string, Set<KrPriceListener>>;
  notifyKrError: (code: string) => void;
  candleListeners: Map<string, Map<Timeframe, Set<CandleListener>>>;
}
