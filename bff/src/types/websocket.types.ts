import WebSocket from "ws";

export interface ExtendedWebSocket extends WebSocket {
  /**
   * **소켓마다 다른 값이다.** 사용자 식별자가 아니다.
   *
   * 원래는 토큰(없으면 `guest_` + ms)을 키로 썼다. 같은 사용자가 탭을 둘 열면 두 번째
   * 소켓이 첫 번째를 **덮어써서** 첫 탭의 시세가 멈췄고, 어느 탭이든 닫히면 남은 탭의
   * 항목까지 지워졌다. 연결 관리는 "누구인가"가 아니라 "어느 소켓인가"를 센다.
   */
  connectionId: string;
  /** 토큰을 들고 왔는지만 안다. 토큰 원문은 소켓에 두지 않는다 — 로그로 새어 나간다. */
  authenticated: boolean;
  isAlive?: boolean;

  // 시세 구독 (BTC, ETH 등)
  subscribedSymbols?: Set<string>;

  // 캔들 구독 (BTC → ["1m","5m"], ETH → ["1m"])
  subscribedCandles?: Map<string, Set<string>>;
}

export interface WSMessage {
  type: string;
  [key: string]: any;
}

export interface PriceUpdate {
  symbol: string;
  currentPrice: number;
  change24h: number;
  timestamp: Date;
}
