import type { CoachMode } from "../model";
import type { ModeDecisionAction } from "./modeDecision";

/**
 * 종목 판단의 **사후 판정과 렌더 게이트** — F004 (감사 문서 D11 · B39).
 *
 * ## 왜 따로 쌓는가
 *
 * 종목 판단은 RSI · 심리 · 대량 체결로 점수를 매긴다. 밸류에이션 지표의 실패 이력
 * (`IndicatorTrackRecord`)을 여기 붙이면 **근거와 다른 신호의 실패**를 보여주게 된다.
 * 그래서 판단 자체를 스냅샷으로 남기고, 관찰 기간이 지난 뒤 결과를 매긴다(D11).
 *
 * ## 판정 규칙 (B39 — 2026-09-21 사용자 확정)
 *
 * | 판단 | 적중 |
 * |---|---|
 * | `review_*` (후보) | 기간 수익률 > 0 |
 * | `avoid` (피하기) | 기간 수익률 ≤ 0 |
 * | `wait` (관망) | 기간 수익률 절댓값이 단타 2% · 장기 10% 안 |
 *
 * 관찰 기간은 모드의 유효시간을 따른다: 단타 24시간 · 장기 30일.
 */

export type JudgmentOutcome = "hit" | "miss";

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

/** 모드별 관찰 기간. 스냅샷 간격(표본 독립성)도 이 값이다. */
export const JUDGMENT_HORIZON_MS: Record<CoachMode, number> = {
  scalp: DAY_MS,
  long_term: 30 * DAY_MS,
};

/** `wait` 가 적중인 수익률 폭(절댓값). */
export const WAIT_BAND: Record<CoachMode, number> = {
  scalp: 0.02,
  long_term: 0.1,
};

/** 이 표본 수 미만이면 판단을 렌더하지 않는다(D11 · `SRV-REQ-024` FR-137). */
export const MIN_JUDGMENT_SAMPLE = 20;

/** 응답에 싣는 적중 · 실패 사례 수 상한. 둘이 같다(B2 — 같은 비중). */
export const JUDGMENT_CASE_LIMIT = 3;

/** 성적표 그룹 키. `SRV-REQ-024` D절 매핑 표의 종목 판단 8행이다. */
export const judgmentSignalType = (
  mode: CoachMode,
  action: ModeDecisionAction
): string => `${mode}.${action}`;

/**
 * 새 스냅샷을 쓸 차례인가.
 *
 * **같은 종목 · 모드는 관찰 기간 안에 한 번만 쓴다**(B39 표본 독립성). 1시간마다
 * 쓰면 30일 관찰이 서로 겹쳐 같은 가격 움직임을 수백 번 세게 된다. 쓰는 시점에
 * 막으면 행 하나가 곧 표본 하나라서, 읽을 때 다시 걸러낼 필요가 없다.
 */
export const isJudgmentSnapshotDue = (
  mode: CoachMode,
  lastJudgedAt: Date | null,
  now: Date
): boolean =>
  lastJudgedAt === null ||
  now.getTime() - lastJudgedAt.getTime() >= JUDGMENT_HORIZON_MS[mode];

/** 관찰 기간이 끝나는 시각. 이 시각 이후 첫 종가가 판정 가격이다. */
export const judgmentMaturesAt = (mode: CoachMode, judgedAt: Date): Date =>
  new Date(judgedAt.getTime() + JUDGMENT_HORIZON_MS[mode]);

export const judgmentReturnRate = (
  entryPrice: number,
  exitPrice: number
): number => exitPrice / entryPrice - 1;

export const judgeOutcome = (
  mode: CoachMode,
  action: ModeDecisionAction,
  returnRate: number
): JudgmentOutcome => {
  switch (action) {
    case "review_short_opportunity":
    case "review_accumulation":
      return returnRate > 0 ? "hit" : "miss";
    case "avoid":
      return returnRate <= 0 ? "hit" : "miss";
    case "wait":
      return Math.abs(returnRate) <= WAIT_BAND[mode] ? "hit" : "miss";
  }
};

/** 저장소가 SQL 로 모아 준 값. 목록을 받아 세지 않는다. */
export interface JudgmentTrackStats {
  sample: number;
  hits: number;
  avgReturn: number | null;
  /** 가장 나빴던 기간 수익률. */
  worstReturn: number | null;
}

export interface JudgmentTrackRecord {
  signalType: string;
  sample: number;
  /** 표본 0 이면 `null` — 0% 가 아니다. */
  winRate: number | null;
  avgReturn: number | null;
  maxDrawdown: number | null;
  lowSample: boolean;
  horizonHours: number;
}

export const summarizeJudgmentTrack = (
  mode: CoachMode,
  signalType: string,
  stats: JudgmentTrackStats
): JudgmentTrackRecord => ({
  signalType,
  sample: stats.sample,
  winRate: stats.sample > 0 ? stats.hits / stats.sample : null,
  avgReturn: stats.avgReturn,
  maxDrawdown: stats.worstReturn,
  lowSample: stats.sample < MIN_JUDGMENT_SAMPLE,
  horizonHours: JUDGMENT_HORIZON_MS[mode] / HOUR_MS,
});

export interface JudgmentCase {
  symbol: string;
  judgedAt: Date;
  action: ModeDecisionAction;
  returnRate: number;
}

export type JudgmentBlockedReason =
  | "reasons_missing"
  | "insufficient_sample"
  | "failure_cases_missing";

export interface JudgmentGateInput {
  reasons: string[];
  trackRecord: JudgmentTrackRecord;
  failureCases: JudgmentCase[];
}

export type JudgmentGate =
  | { renderable: true; blockedReason: null }
  | { renderable: false; blockedReason: JudgmentBlockedReason };

/**
 * 3종 게이트 — 근거 · 과거 적중률 · 실패사례 (공통 수용 기준 1).
 *
 * 표본이 모자라면 적중률이 **없는 것과 같다.** 그리고 표본이 충분한데 빗나간 적이
 * 한 번도 없으면 그것도 막는다 — 실패 없는 성적은 표본이 치우쳤다는 신호다(FR-137).
 * 막혀도 **에러가 아니다.** 판단 블록만 비고 나머지 응답은 그대로 간다.
 */
export const judgmentGate = (input: JudgmentGateInput): JudgmentGate => {
  if (input.reasons.length === 0) {
    return { renderable: false, blockedReason: "reasons_missing" };
  }
  if (input.trackRecord.lowSample) {
    return { renderable: false, blockedReason: "insufficient_sample" };
  }
  if (input.failureCases.length === 0) {
    return { renderable: false, blockedReason: "failure_cases_missing" };
  }
  return { renderable: true, blockedReason: null };
};
