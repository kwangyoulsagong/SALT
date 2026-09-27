import type { CoachMode } from "../model";
import { COACH_HORIZON } from "./horizon";

/**
 * 모드별 판단 — `ai-investment-coach.service.makeModeDecision` 에서 옮겨온 **순수 계산**.
 *
 * 단타(`scalp`)와 장기(`long_term`)가 **같은 입력에 다른 가중치**를 준다. 그래서 두
 * 판단을 늘 함께 만들어 내려보낸다(`dualDecision`) — 사용자가 모드를 바꿀 때마다
 * 서버를 다시 부르지 않게 한다.
 *
 * ## 신뢰도가 없다 (감사 문서 D3 · `SRV-REQ-024` FR-102)
 *
 * 원문은 `confidence = 0.45 + score/200` 을 실었다. 점수를 다시 쓴 값이라 정보가 없고
 * "82% 확신"으로 읽힌다(공통 수용 기준 4). 점수 + 근거 · 적중률 · 실패사례 3종이 대신한다.
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

/**
 * 규칙 버전 — 원장(`judgment_ledger`) 행마다 남는다. **가중 · 문턱 · 항목을 바꾸면 올린다.**
 * 예측 서비스의 재현(`salt-forecast/domain/rule_items.py`)과 사전등록(`rule-ic@1`)이 이 버전을 잰다.
 */
export const MODE_DECISION_RULE_VERSION = "mode-decision@1";

/** 점수 항목 — IC 를 재는 단위(사전등록 rule-ic@1 의 item 이름과 같다). */
export type ModeDecisionItem =
  | "change24h"
  | "sentiment"
  | "rsi"
  | "whale_flow"
  | "missing_data";

/**
 * 항목 하나의 기여 — 발동하지 않았으면 `points` 0. `value` 는 그 항목이 본 재료 값이고 없으면 `null`
 * (기여 0 과 재료 없음을 가른다 — 슬라이스 0 회고: "지표 없이 낸 판단"을 나중에 걸러야 한다).
 */
export interface ModeDecisionComponent {
  item: ModeDecisionItem;
  points: number;
  value: number | null;
}

export interface ModeDecision {
  mode: CoachMode;
  symbol: string;
  label: string;
  action: ModeDecisionAction;
  riskLevel: "medium" | "high";
  timeframe: string;
  headline: string;
  reasons: string[];
  risks: string[];
  score: number;
}

/**
 * 판단 + 항목별 기여. 기여는 **응답에 싣지 않는다**(화면 계약이 아니다) — 원장(`judgment_ledger`)만 쓴다.
 * 합이 `score − 50`(0~100 자르기 전)이다.
 */
export interface ScoredModeDecision {
  decision: ModeDecision;
  components: ModeDecisionComponent[];
}

export const makeModeDecision = (input: ModeDecisionInput): ModeDecision =>
  scoreModeDecision(input).decision;

export const scoreModeDecision = (input: ModeDecisionInput): ScoredModeDecision => {
  const reasons: string[] = [];
  const risks: string[] = [];
  const scalp = input.mode === "scalp";

  let change = 0;
  if (input.change24h > 3) {
    change += scalp ? 12 : -6;
    reasons.push("24시간 가격 흐름이 강합니다.");
  }
  if (input.change24h < -3) {
    change += scalp ? -10 : 6;
    risks.push("단기 변동성이 커졌습니다.");
  }
  let sentiment = 0;
  if (input.sentimentScore !== undefined && input.sentimentScore >= 70) {
    sentiment += scalp ? 5 : -8;
    risks.push("시장 심리가 과열권입니다.");
  }
  if (input.sentimentScore !== undefined && input.sentimentScore <= 35) {
    sentiment += scalp ? -4 : 10;
    reasons.push("공포 구간이라 장기 분할 관찰 가치가 있습니다.");
  }
  let rsi = 0;
  if (input.rsi !== undefined && input.rsi >= 70) {
    rsi -= scalp ? 6 : 12;
    risks.push("기술 지표가 과열권에 가깝습니다.");
  }
  if (input.rsi !== undefined && input.rsi <= 35) {
    rsi += scalp ? 4 : 8;
    reasons.push("단기 침체 신호가 일부 있습니다.");
  }
  let whale = 0;
  if (input.whaleBuy > input.whaleSell * 1.2) {
    whale += 8;
    reasons.push("최근 대형 매수 흐름이 매도보다 우세합니다.");
  }
  if (input.whaleSell > input.whaleBuy * 1.2) {
    whale -= 8;
    risks.push("최근 대형 매도 흐름이 우세합니다.");
  }
  let missing = 0;
  if (input.missingData.length >= 3) {
    missing -= 12;
    risks.push("판단 데이터가 부족합니다.");
  }

  const whaleTotal = input.whaleBuy + input.whaleSell;
  const components: ModeDecisionComponent[] = [
    { item: "change24h", points: change, value: input.change24h },
    { item: "sentiment", points: sentiment, value: input.sentimentScore ?? null },
    { item: "rsi", points: rsi, value: input.rsi ?? null },
    {
      item: "whale_flow",
      points: whale,
      // (매수 − 매도) ÷ 합. 대형 체결이 없으면 null — 균형(0)과 다르다
      value: whaleTotal > 0 ? (input.whaleBuy - input.whaleSell) / whaleTotal : null,
    },
    { item: "missing_data", points: missing, value: input.missingData.length },
  ];
  const score = 50 + change + sentiment + rsi + whale + missing;

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

  const decision: ModeDecision = {
    mode: input.mode,
    symbol: input.symbol,
    label,
    action,
    // 원문 그대로다 — 50 이상은 어느 쪽이든 `medium` 이라 분기 둘이 같은 값을 준다.
    // 고치면 응답의 `riskLevel` 이 바뀌므로 이관에서 건드리지 않았다.
    riskLevel: normalized >= 50 ? "medium" : "high",
    timeframe: COACH_HORIZON[input.mode].timeframe,
    headline:
      input.mode === "scalp"
        ? `${input.symbol} 단타 관점은 ${label}입니다. 손절 기준 없이 진입하지 마세요.`
        : `${input.symbol} 장기 관점은 ${label}입니다. 한 번에 진입하기보다 분할 기준을 먼저 잡으세요.`,
    reasons: reasons.slice(0, 3),
    risks: risks.slice(0, 3),
    score: normalized,
  };
  return { decision, components };
};
