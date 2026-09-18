import type { CoachMode } from "../model";

/**
 * 모드별 판단 — `ai-investment-coach.service.makeModeDecision` 에서 옮겨온 **순수 계산**.
 *
 * 단타(`scalp`)와 장기(`long_term`)가 **같은 입력에 다른 가중치**를 준다. 그래서 두
 * 판단을 늘 함께 만들어 내려보낸다(`dualDecision`) — 사용자가 모드를 바꿀 때마다
 * 서버를 다시 부르지 않게 한다.
 *
 * ## 주문 동작이 없다
 *
 * `action` 은 `review_short_opportunity` · `review_accumulation` · `wait` · `avoid`
 * 넷이고 전부 **검토 대상 서술**이다. 주문을 실행하는 경로가 없다(공통 수용 기준 2).
 */

export type ModeDecisionAction =
  | "review_short_opportunity"
  | "review_accumulation"
  | "wait"
  | "avoid";

export interface ModeDecisionInput {
  mode: CoachMode;
  symbol: string;
  change24h: number;
  sentimentScore?: number;
  rsi?: number;
  whaleBuy: number;
  whaleSell: number;
  hasHolding: boolean;
  /** 빠진 재료 목록. 3종 이상이면 점수를 깎는다. */
  missingData: string[];
}

export interface ModeDecision {
  mode: CoachMode;
  symbol: string;
  label: string;
  action: ModeDecisionAction;
  confidence: number;
  riskLevel: "medium" | "high";
  timeframe: string;
  headline: string;
  reasons: string[];
  risks: string[];
  score: number;
}

export const makeModeDecision = (input: ModeDecisionInput): ModeDecision => {
  let score = 50;
  const reasons: string[] = [];
  const risks: string[] = [];

  if (input.change24h > 3) {
    score += input.mode === "scalp" ? 12 : -6;
    reasons.push("24시간 가격 흐름이 강합니다.");
  }
  if (input.change24h < -3) {
    score += input.mode === "long_term" ? 6 : -10;
    risks.push("단기 변동성이 커졌습니다.");
  }
  if (input.sentimentScore !== undefined && input.sentimentScore >= 70) {
    score += input.mode === "scalp" ? 5 : -8;
    risks.push("시장 심리가 과열권입니다.");
  }
  if (input.sentimentScore !== undefined && input.sentimentScore <= 35) {
    score += input.mode === "long_term" ? 10 : -4;
    reasons.push("공포 구간이라 장기 분할 관찰 가치가 있습니다.");
  }
  if (input.rsi !== undefined && input.rsi >= 70) {
    score -= input.mode === "long_term" ? 12 : 6;
    risks.push("기술 지표가 과열권에 가깝습니다.");
  }
  if (input.rsi !== undefined && input.rsi <= 35) {
    score += input.mode === "long_term" ? 8 : 4;
    reasons.push("단기 침체 신호가 일부 있습니다.");
  }
  if (input.whaleBuy > input.whaleSell * 1.2) {
    score += 8;
    reasons.push("최근 대형 매수 흐름이 매도보다 우세합니다.");
  }
  if (input.whaleSell > input.whaleBuy * 1.2) {
    score -= 8;
    risks.push("최근 대형 매도 흐름이 우세합니다.");
  }
  if (input.missingData.length >= 3) {
    score -= 12;
    risks.push("판단 데이터가 부족합니다.");
  }

  const normalized = Math.max(0, Math.min(100, Math.round(score)));

  const action: ModeDecisionAction =
    normalized >= 70
      ? input.mode === "scalp"
        ? "review_short_opportunity"
        : "review_accumulation"
      : normalized >= 50
        ? "wait"
        : "avoid";

  const label =
    action === "review_short_opportunity"
      ? "단타 기회 후보"
      : action === "review_accumulation"
        ? "장기 모아가기 후보"
        : action === "wait"
          ? "관망"
          : "지금은 피하기";

  return {
    mode: input.mode,
    symbol: input.symbol,
    label,
    action,
    confidence: Number((0.45 + normalized / 200).toFixed(2)),
    // 원문 그대로다 — 50 이상은 어느 쪽이든 `medium` 이라 분기 둘이 같은 값을 준다.
    // 고치면 응답의 `riskLevel` 이 바뀌므로 이관에서 건드리지 않았다.
    riskLevel: normalized >= 50 ? "medium" : "high",
    timeframe: input.mode === "scalp" ? "5m-24h" : "1w-1y",
    headline:
      input.mode === "scalp"
        ? `${input.symbol} 단타 관점은 ${label}입니다. 손절 기준 없이 진입하지 마세요.`
        : `${input.symbol} 장기 관점은 ${label}입니다. 한 번에 진입하기보다 분할 기준을 먼저 잡으세요.`,
    reasons: reasons.slice(0, 3),
    risks: risks.slice(0, 3),
    score: normalized,
  };
};
