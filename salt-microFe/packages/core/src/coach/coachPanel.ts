/**
 * 한 장 패널 — BFF `GET /api/app/ai-coach/panel` 뷰모델(F017 v4 순서 1d · `BFF-REQ-052` FR-6 · FR-8 · `FE-REQ-064` FR-8~11).
 * 정의 원본은 `bff/src/services/coach-panel.viewmodel.ts` — 모양을 바꾸면 둘을 같이 바꾼다.
 *
 * 칸마다 `tier`(어느 단을 썼나) · `status`(화면이 쓰는 셋). 칸 하나가 깨져도 나머지는 온다 — 화면은 칸마다 따로 그린다.
 * 숫자 · 문장은 전부 서버 · BFF 값이고 화면은 그리기 좌표만 계산한다.
 */

import type { MoveCauseView } from "../market/whyMoved";
import type { SymbolExplanation } from "./explanation";
import type { PerformanceClaim } from "./performanceClaim";
import type { ScenarioHorizonKey, ScenarioHorizonView } from "./shortScenario";
import type { FailureCase, JudgmentCaveat, JudgmentTier, JudgmentTierBasis } from "./symbolCoach";
import type { TradeCheckResult } from "./tradeCheck";

export type PanelTier = "now" | "usual" | "longer" | "defect";
export type PanelStatus = "ok" | "fallback" | "degraded";
export type PanelMode = "scalp" | "long_term";

export interface PanelCell {
  tier: PanelTier;
  status: PanelStatus;
}

export interface PanelScenarioCell extends ScenarioHorizonView {
  status: PanelStatus;
}

export interface PanelTrack extends PanelCell {
  sample: number;
  sampleOrigin: "live" | "backtest";
  /** 100번 중 맞힌 번 · 늘 같은 쪽을 말했으면 맞혔을 번. 표본 0 · 관망(기준 없음)이면 null */
  hitOutOf100: number | null;
  baselineOutOf100: number | null;
  horizonHours: number;
  claim: PerformanceClaim | null;
  /** 틀렸던 때 — 빗나간 사례만 */
  misses: FailureCase[];
}

export interface PanelModeView {
  mode: PanelMode;
  judgment: {
    action: string;
    label: string;
    headline: string;
    caveats: JudgmentCaveat[];
    grade: JudgmentTier;
    gradeBasis: JudgmentTierBasis;
  } | null;
  track: PanelTrack;
  explanation: PanelCell & { asOf: string | null; view: SymbolExplanation | null };
}

export interface PanelMine {
  line: { kind: "stop" | "target"; price: number } | null;
  gapToLinePct: number | null;
  averageBuyPrice: number | null;
  unrealizedProfit: number | null;
  unrealizedProfitRate: number | null;
}

/** 회사 사정 사실 한 줄 — 문구 · 숫자는 서버 것(원문 숫자 그대로) */
export interface CompanyFact {
  text: string;
  kind: string;
  whenText: string | null;
  source: { kind: "article" | "disclosure"; name: string; url: string; at: string };
}

export interface CompanyBrief {
  headline: CompanyFact | null;
  earnings: CompanyFact[];
  today: CompanyFact[];
  sector: Array<{ text: string; source: string; at: string | null }>;
  concern: CompanyFact[];
  /** 고른 창(일) — 7 · 90 · 365. 사실이 없으면 null */
  windowDays: 7 | 90 | 365 | null;
  factCount: number;
}

export interface CoachPanel {
  symbol: string;
  market: "crypto" | "kr";
  generatedAt: string;
  /** 기간 탭 → 판단 모드(성적 · 해설 칸을 고르는 표 — 서버가 정한다) */
  horizonMode: Record<ScenarioHorizonKey, PanelMode>;
  scenario: { horizons: PanelScenarioCell[]; disclaimer: string };
  verdict: PanelCell & { check: TradeCheckResult | null };
  cause: PanelCell & { cause: MoveCauseView | null };
  /** 회사 사정(F017 v4 2d) — 추출 사실 칸. 읽기 실패면 `brief: null` */
  company: PanelCell & { brief: CompanyBrief | null };
  modes: { scalp: PanelModeView; longTerm: PanelModeView };
  /** 보유가 없으면 null · 못 읽었으면 `degraded` + `view: null` */
  mine: { status: "ok" | "degraded"; view: PanelMine | null } | null;
  cells: Array<{ key: string; tier: PanelTier; status: PanelStatus }>;
  degradedBlocks: string[];
}
