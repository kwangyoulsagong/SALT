/**
 * 한 장 패널 — 칸마다 어느 단을 썼나(F017 v4 순서 1d · `SRV-REQ-053` FR-13 · `OPS-004`).
 *
 * 패널 응답은 칸(시나리오 넷 · 점검 한 줄 · 원인 · 회사 사정 · 성적 · 해설)을 한 번에 싣는다. 칸마다 둘이 붙는다:
 *
 * - `tier` — `now`(지금 조건 · 제 값) → `usual`(평소 · 이전 값) → `longer`(대신 채운 값 — 긴 지평 · 과거 검산 · 사실표 문장)
 *   → `defect`(아직 말할 수 없다 — "아직 n번뿐" · 재료 없음 · 읽기 실패). 상태 점검이 이 값으로 종목 × 칸을 센다
 * - `status` — 화면이 쓰는 세 값. `ok`(now) · `fallback`(usual · longer) · `degraded`(defect)
 *
 * ## 불변식 — 한 칸 실패가 패널을 비우지 않는다
 *
 * 칸 하나의 읽기가 실패하면 그 칸만 `defect` + `degraded` 이고 나머지는 그대로다. 그래서 단을 정하는 규칙이 여기 한 곳이다 —
 * 유스케이스 · BFF · 상태 점검이 같은 표를 쓴다(허용 · 거절 경계 표 테스트 `coachPanel.test.ts`).
 */

import type { ExplanationTier } from "./explanationSnapshot";
import type { PanelHorizon, ScenarioTier } from "./scenarioBaseRate";
import { MIN_JUDGMENT_SAMPLE, type JudgmentTrackOrigin } from "./symbolJudgment";
import type { TradeCheckStatus } from "./tradeCheck";
import type { CoachMode } from "../model";

export type PanelTier = ScenarioTier;
export type PanelStatus = "ok" | "fallback" | "degraded";

/** 상태 점검이 세는 칸 이름 — 시장마다 같은 줄 */
export type PanelCellKey =
  | "scenario.1h"
  | "scenario.4h"
  | "scenario.1d"
  | "scenario.5d"
  | "verdict"
  | "cause"
  | "company"
  | "track.scalp"
  | "track.long_term"
  | "explanation.scalp"
  | "explanation.long_term";

/** 칸 표의 줄 전부 — 상태 점검이 세는 순서(`GetCoachPanel` 칸 표와 같다) */
export const PANEL_CELL_KEYS_ALL: readonly PanelCellKey[] = [
  "scenario.1h",
  "scenario.4h",
  "scenario.1d",
  "scenario.5d",
  "verdict",
  "cause",
  "company",
  "track.scalp",
  "track.long_term",
  "explanation.scalp",
  "explanation.long_term",
];

export interface PanelCellState {
  key: PanelCellKey;
  tier: PanelTier;
  status: PanelStatus;
}

export const panelStatus = (tier: PanelTier): PanelStatus =>
  tier === "now" ? "ok" : tier === "defect" ? "degraded" : "fallback";

/**
 * 기간 탭 → 판단 모드. 1시간 · 4시간은 단타 판단(1시간봉 · 판단 기간 몇 시간), 1일 · 5일은 장기 판단(일봉).
 * 화면은 탭을 고르면 이 표대로 성적 · 해설 칸을 바꾼다 — 화면이 정하지 않는다
 */
export const PANEL_HORIZON_MODE: Readonly<Record<PanelHorizon, CoachMode>> = {
  "1h": "scalp",
  "4h": "scalp",
  "1d": "long_term",
  "5d": "long_term",
};

/** 점검 한 줄 — 지금 조건이 섰으면 now, 조건이 없어 평소 값이면 usual, 표본 모자람은 defect */
export const verdictTier = (status: TradeCheckStatus): PanelTier =>
  status === "ok" ? "now" : status === "no_condition" ? "usual" : "defect";

/**
 * 성적(3종의 적중률 · 틀렸던 때) — 라이브 표본이 문턱(20)을 넘으면 now, 과거 검산으로 채운 것이면 longer,
 * 문턱 밑이면 defect("아직 n번뿐" — 판단 블록 꼬리표와 같은 결함)
 */
export const trackTier = (track: { sample: number; sampleOrigin: JudgmentTrackOrigin }): PanelTier => {
  if (track.sample < MIN_JUDGMENT_SAMPLE) return "defect";
  return track.sampleOrigin === "live" ? "now" : "longer";
};

/**
 * 해설 — 4단 그대로. 최신 AI = now · 이전 AI = usual(기준 시각과 함께) · 사실표 문장 · 특이 소식 없음 = longer.
 * 네 단 모두 문장이 늘 있다 — defect 는 읽기 실패뿐
 */
export const explanationTier = (tier: ExplanationTier): PanelTier =>
  tier === "latest" ? "now" : tier === "previous" ? "usual" : "longer";

/**
 * 원인 — 근거가 받친 원인(가장 유력 · 가능성)이 있으면 now, "확인된 소식이 없어요" · 평소 범위 안이면 usual(그것도 데이터 —
 * 모은 소식 수 · 평소 대비 크기), 재료를 못 읽었으면 defect
 */
export const causeTier = (topStrength: "likely" | "possible" | "none" | null): PanelTier =>
  topStrength === null ? "defect" : topStrength === "none" ? "usual" : "now";

/**
 * 회사 사정(FR-12) — 재료(공시 추출 사실 · 기사 추출 사실)가 아직 없다. 공시 수집과 기사 본문 원천이
 * 순서 2 다. 그 전엔 늘 defect 로 센다 — 상태 점검이 "아직 빈 칸"을 숨기지 않게
 */
export const COMPANY_PENDING_REASON = "source_not_collected" as const;

// ==================== 내 기준(FR-15) ====================

export interface PanelMineInput {
  /** 보유 — 없으면 칸 없음 */
  holding: { quantity: number; averageBuyPrice: number; unrealizedProfit: number; unrealizedProfitRate: number } | null;
  /** 지금 가격 — 시세가 없으면 거리를 말하지 않는다 */
  price: number | null;
  /** 최근 매수 계획의 손절가 · 목표가(사용자가 정한 값). 없으면 null */
  plan: { stopPrice: number | null; targetPrice: number | null } | null;
  hidePurchasePrice: boolean;
}

export interface PanelMineView {
  /** 내가 정한 선 — 손절가 먼저(지키는 쪽), 없으면 목표가. 둘 다 없으면 null */
  line: { kind: "stop" | "target"; price: number } | null;
  /** 지금 가격에서 그 선까지(%) — 선이 아래면 음수 */
  gapToLinePct: number | null;
  /** 매입가 숨김이면 null(평단 · 평가 손익 둘 다) */
  averageBuyPrice: number | null;
  unrealizedProfit: number | null;
  unrealizedProfitRate: number | null;
}

/**
 * 내 기준 한 줄 — 순서는 내 선까지 거리(앞) → 평단 대비(뒤). 평단도 기본으로 싣고(사용자 2026-11-13) 매입가 숨김이면 뺀다.
 * 보유가 없으면 칸이 없다(null). 계산은 여기 · LLM 입력 0
 */
export const panelMine = (input: PanelMineInput): PanelMineView | null => {
  const holding = input.holding;
  if (!holding || !(holding.quantity > 0)) return null;
  const stop = input.plan?.stopPrice ?? null;
  const target = input.plan?.targetPrice ?? null;
  const line =
    stop !== null && stop > 0
      ? { kind: "stop" as const, price: stop }
      : target !== null && target > 0
        ? { kind: "target" as const, price: target }
        : null;
  const gapToLinePct =
    line && input.price !== null && input.price > 0 ? ((line.price - input.price) / input.price) * 100 : null;
  const hide = input.hidePurchasePrice;
  return {
    line,
    gapToLinePct,
    averageBuyPrice: hide ? null : holding.averageBuyPrice,
    unrealizedProfit: hide ? null : holding.unrealizedProfit,
    unrealizedProfitRate: hide ? null : holding.unrealizedProfitRate,
  };
};
