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
 * 규칙 버전 — 스냅샷 · 원장 행마다 남고, 성적표는 **현재 버전만** 센다. **가중 · 문턱 · 항목을 바꾸면 올린다.**
 *
 * | 버전 | 무엇 |
 * |---|---|
 * | `@1` | 원문 이관 그대로 — 손으로 정한 가중 |
 * | `@2` | 사전등록 `rule-ic@1` 판정 반영(2026-09-29, `salt-forecast/reports/rule-ic-rule-ic-1-2026-09-27.md`): 단타 24시간 변화 · 심리 **부호 반전**, 장기 심리 · 대형 체결(두 모드) **가중 0**. 장기 24시간 · 일봉 RSI 유지. 단타 1시간 RSI 는 과거로 못 재 그대로 |
 *
 * `@2` 의 성적은 그 백테스트로 주장하지 않는다 — 같은 데이터로 고른 규칙이다. 원장이 표본 밖으로 잰다.
 */
export const MODE_DECISION_RULE_VERSION = "mode-decision@2";

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

  // 24시간 변화 — 단타는 @1 에서 부호가 거꾸로였다(IC −0.038, 급등 다음 날 되돌림이 더 잦다). 장기는 그대로(+0.017)
  let change = 0;
  if (input.change24h > 3) {
    change += scalp ? -12 : -6;
    risks.push(
      scalp
        ? "하루 3% 넘게 오른 뒤에는 다음 날 되돌림이 더 잦았습니다."
        : "단기 급등 구간이라 장기 분할 기준으로는 서두를 이유가 적습니다."
    );
  }
  if (input.change24h < -3) {
    change += scalp ? 10 : 6;
    reasons.push(
      scalp
        ? "하루 3% 넘게 내린 뒤에는 다음 날 반등이 더 잦았습니다."
        : "단기 하락 구간이라 장기 분할 관찰 가치가 있습니다."
    );
  }
  // 심리 — 단타는 부호 반전(IC −0.009). 장기는 0 과 구별되지 않아 **점수에서 뺀다**(근거 문장도 싣지 않는다)
  let sentiment = 0;
  if (scalp && input.sentimentScore !== undefined && input.sentimentScore >= 70) {
    sentiment -= 5;
    risks.push("시장 심리가 과열권입니다.");
  }
  if (scalp && input.sentimentScore !== undefined && input.sentimentScore <= 35) {
    sentiment += 4;
    reasons.push("공포 구간 뒤에는 단기 되돌림이 더 잦았습니다.");
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
  // 대형 체결 — 두 모드 다 0 과 구별되지 않았다(1년 · 30종목, 점추정은 음수). **점수에서 뺀다.**
  // 값은 기여(`value`)로 계속 남겨 라이브 원장이 업비트 원문으로 다시 잰다(사전등록 rule-ic@1 [live])
  const whale = 0;
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
