/**
 * 가격 변동 범위 — BFF `GET /api/app/coach/forecast` 응답 (F008 `BFF-REQ-037` · `ADR-003`).
 *
 * 숫자는 전부 서버가 계산했다(가격 · 원화). 화면은 그리기만 한다. 막힌 기간에는 가격 필드가 **없다** —
 * 판별 union 이라 타입에서 새어 나갈 길이 없다.
 */

export interface ForecastPriceRange {
  /** 하위 5% · 하위 25% · 중앙값 · 상위 25% · 상위 5% 가격(원) */
  low: number;
  lowerQuartile: number;
  median: number;
  upperQuartile: number;
  high: number;
  coverage: 90;
}

/** 보유 수량 기준 "이 주에 판다면" 평가금액 변화(원). 보유가 없으면 `null` */
export interface ForecastHoldingScenario {
  quantity: number;
  valueChangeLow: number;
  valueChangeMedian: number;
  valueChangeHigh: number;
}

export interface ForecastTrackRecord {
  /** 라이브 52주 전에는 `backtest` — 화면은 "백테스트" 라벨을 붙인다 */
  kind: "backtest" | "live";
  sample: number;
  /** 90% 범위가 실제로 맞은 비율(0~1) */
  coverage90: number;
  /** 범위 폭(로그) — 모델과 단순 예측. 적중률은 이것과 **같이만** 보인다(FEATURE-008 FR-10) */
  width90: number;
  baselineWidth90: number;
  pinballSkill: number | null;
  misses: { asOf: string; realizedReturn: number; lowReturn: number; highReturn: number }[];
}

export interface ForecastDirection {
  upProbability: number;
  direction: "up" | "down" | "abstain";
  calls: number;
  hits: number;
  baseRate: number | null;
}

export type ForecastHorizonView =
  | {
      horizonWeeks: number;
      renderable: true;
      asOf: string;
      basePrice: number;
      range: ForecastPriceRange;
      scenario: ForecastHoldingScenario | null;
      trackRecord: ForecastTrackRecord;
      /** 기준 모델을 이긴 기간에만 있다 */
      direction?: ForecastDirection;
    }
  | { horizonWeeks: number; renderable: false; blockedReason: string };

/** 과거 일봉 종가(오래된 → 최근) — 차트의 실선. 전망의 기준가와 같은 원천이다 */
export interface ForecastHistoryPoint {
  date: string;
  close: number;
}

export type SymbolForecastResult =
  | {
      status: "ok";
      symbol: string;
      label: string;
      disclaimer: string;
      history: ForecastHistoryPoint[];
      horizons: ForecastHorizonView[];
    }
  | { status: "unavailable" };
