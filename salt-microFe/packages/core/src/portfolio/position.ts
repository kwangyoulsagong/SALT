/**
 * 포지션 화면 계약(F006 G절 · `BFF-REQ-028` FR-40) — BFF `bff/src/services/position.viewmodel.ts` 와 같은 정의다.
 * `bff` 는 pnpm workspace 밖이라 두 벌이고, 아래 `CONTRACT` 블록을 BFF `__tests__/position-contract.test.ts` 가 글자 그대로 대조한다.
 */

// CONTRACT:BEGIN PositionView
export type RadarAxisKey = "concentration" | "volatility" | "drawdown" | "news";
export type RadarReasonCode = "over_limit" | "within_limit" | "insufficient_data";
export type FlowRange = "1w" | "1m" | "3m" | "1y";

export interface NamedSymbol {
  symbol: string;
  name: string;
  logoUrl: string | null;
  assetType: string;
}

export interface PositionRadarAxis {
  key: RadarAxisKey;
  /** 0~100 점. 재료가 모자라면 null — 0 으로 그리지 않는다 */
  value: number | null;
  /** 원래 단위 — 집중도 · 뉴스 %, 변동성 연율 %, 낙폭 %(음수) */
  raw: number | null;
  limit: number;
  breached: boolean;
  reasonCode: RadarReasonCode;
  /** 집중도 축의 최대 비중 종목 이름 — 사유 문구에 쓴다 */
  subjectName: string | null;
}

export interface PositionOverviewVM {
  /** 보유 0 — Hero · 레이더 없이 첫 기록 안내 */
  empty: boolean;
  hero: {
    totalValueKrw: number;
    unrealizedProfitKrw: number;
    unrealizedProfitRatePct: number | null;
    investedKrw: number;
    holdingsCount: number;
    topWeight: (NamedSymbol & { pct: number }) | null;
    /** 매수 · 매도 금액을 뺀 시간가중. 30일 전부터 들고 있지 않았으면 null */
    return30dPct: number | null;
  } | null;
  radar: PositionRadarAxis[] | null;
  degraded: boolean;
  degradedReasons: string[];
  namesDegraded: boolean;
}

export interface PositionFlowVM {
  range: FlowRange;
  /** KST 날짜별 평가금(원) — 그날 실제 수량 × 일봉 종가 */
  points: Array<{ date: string; valueKrw: number }>;
  /** 시간가중 지수의 최대 낙폭 — 점이 2개 미만이면 null */
  maxDrawdown: { pct: number; peakDate: string; troughDate: string } | null;
  periodReturnPct: number | null;
  missingSymbols: string[];
  degraded: boolean;
  degradedReasons: string[];
}
// CONTRACT:END PositionView
