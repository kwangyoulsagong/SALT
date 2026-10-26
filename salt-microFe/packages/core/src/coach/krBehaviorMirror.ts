import type { MirrorMetric } from "./behaviorMirror";

/**
 * 국내 주식 거래 미러 — BFF 뷰모델 계약 (F011 `BFF-REQ-040` FR-24 · 서버 `SRV-REQ-040` FR-47).
 * 정의는 `bff/src/services/kr-behavior-mirror.viewmodel.ts` 가 소유한다 — 여기는 그 모양을 그대로 옮긴다.
 */

export interface MirrorSource {
  source: string;
  url: string;
  period: string;
}

export interface KrBehaviorMirrorView {
  status: "ok";
  historyStatus: "ok" | "truncated";
  /** ① 최근 250거래일 일 회전율 — 기준선은 코인 미러와 같은 국내 일 회전율 */
  turnover: {
    dailyTurnover: MirrorMetric;
    tradeCount: number | null;
    windowTradingDays: number | null;
    baseline: (MirrorSource & { newRetailDailyTurnover: number; marketDailyTurnover: number }) | null;
  };
  /** ② PGR · PLR · 평균 보유 **거래일** */
  disposition: {
    pgr: MirrorMetric;
    plr: MirrorMetric;
    gainHoldingDays: MirrorMetric;
    lossHoldingDays: MirrorMetric;
  } | null;
  /** ② 매수 다음 거래일 매도율(이익 · 손실) */
  nextDaySell: {
    gainSellRate: MirrorMetric;
    lossSellRate: MirrorMetric;
    baseline: (MirrorSource & { gainSellRate: number; lossSellRate: number }) | null;
  };
  /** ③ 매수 직전 40거래일 상승률. `excluded` = 이력 부족 · 원천 끊김으로 못 잰 매수 */
  chase: {
    avgPriorReturn: MirrorMetric;
    medianPriorReturn: MirrorMetric;
    windowTradingDays: number | null;
    excluded: number;
    baseline: (MirrorSource & { priorReturn: number }) | null;
  };
  /** ④ 최근 1년 매수 대금 중 복권형 몫 · 같은 단면의 복권형 종목 비율 */
  lottery: {
    buyShare: MirrorMetric;
    marketShare: number | null;
    unknownBuys: number;
    lookbackMonths: number | null;
    evidence: (MirrorSource & { excessReturn: number }) | null;
  };
  /** 읽은 국내 거래 수(잘리면 0) — 0 이면 화면은 빈 상태 */
  tradeCount: number;
  minSample: number;
  asOf: string | null;
}

export type KrBehaviorMirrorResult = KrBehaviorMirrorView | { status: "unavailable" };
