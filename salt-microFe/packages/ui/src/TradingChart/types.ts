/**
 * `TradingChart` 입력 모양. **도메인을 모른다** — 종목 · 코치 · 서버 응답 모양은 앱이 여기로 바꿔 넣는다.
 */

/** 봉 하나. `time` 은 봉 시작 시각(UTC epoch ms). 배열은 **오래된 것부터** 온다 */
export interface TradingCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 가로 가격선. 가격은 부르는 쪽 값 그대로다 — 차트는 계산하지 않는다.
 * `tone` 은 색의 뜻이다(`down` = 하락 색, `neutral` = 회색). hex 를 받지 않는다.
 */
export interface TradingPriceLine {
  key: string;
  price: number;
  tone: "down" | "neutral";
  dashed: boolean;
  label: string;
}

/** 이동평균 한 개 — 기간(봉 수) */
export type MovingAveragePeriod = number;
