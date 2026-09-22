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
  /** `zone` = 가격 구간(`TradingPriceBand`)의 경계 · 중앙 — 띠와 같은 색 */
  tone: "down" | "neutral" | "zone";
  dashed: boolean;
  label: string;
}

/**
 * 가격 구간 — 두 가격 사이를 옅게 칠하고 왼쪽 위에 이름표를 단다. 경계선은 `priceLines` 가 긋는다.
 * 가격 · 이름표 문구는 부르는 쪽 값 그대로다(차트는 계산 · 작명하지 않는다).
 */
export interface TradingPriceBand {
  lower: number;
  upper: number;
  label: string;
}

/** 이동평균 한 개 — 기간(봉 수) */
export type MovingAveragePeriod = number;
