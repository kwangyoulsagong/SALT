/**
 * 한 장 패널 뷰모델 — **순수 함수**(F017 v4 순서 1d · `BFF-REQ-052` FR-6 · FR-8 · 서버 `SRV-REQ-053` FR-13).
 *
 * 서버 `GET /api/coach/panel` 한 콜을 화면 한 장으로. 칸마다 **이미 있는 칸별 뷰모델을 그대로** 쓴다 — 시나리오(`toScenarioViewModel`) ·
 * 점검(`toTradeCheckViewModel`) · 원인(`toMoveCauseVM`) · 해설(`toExplanationViewModel`) · 꼬리표(`toCaveats`). 그래서 칸별 경로와
 * 막는 규칙이 하나다(모델 칸은 열 수 없고 막을 수만 · 원인 단계가 근거와 안 맞으면 버림 · 해설 모양이 틀리면 그 칸만).
 *
 * BFF 가 하는 일:
 * 1. **칸 하나가 깨지면 그 칸만 `defect` · `degraded`** — 패널을 502 로 버리지 않는다. 칸 표(`cells`)는 늘 11줄이고
 *    마지막 칸 단으로 다시 만든다(BFF 가 칸을 내리면 상태 점검도 내린 단을 센다 — 화면이 보는 것과 같게)
 * 2. 화면 숫자 모양만 — 성적 "100번 중 n번"(적중률 × 100 반올림) · 기준(적중률 − 초과분). 계산 · 문구 0
 *
 * 하지 않는 것: 확률 · 가격 · 원화 계산(공통 수용 기준 3) · 단 판정(서버 `coachPanel.ts`) · 문장.
 */

import { toExplanationViewModel, ExplanationContractError, safeUrl, type ExplanationViewModel } from "./explanation.viewmodel";
import { toPerformanceClaim, type PerformanceClaim } from "./performance-claim.viewmodel";
import { SCENARIO_HORIZONS, toScenarioViewModel, type ScenarioHorizon, type ScenarioHorizonView } from "./scenario.viewmodel";
import { toCaveats, toTier, type CoachMode, type FailureCase, type JudgmentCaveat, type JudgmentTier, type JudgmentTierBasis } from "./symbol-coach.viewmodel";
import { TradeCheckContractError, toTradeCheckViewModel, type TradeCheckViewModel } from "./trade-check.viewmodel";
import { toMoveCauseVM, type MoveCauseViewVM } from "./why-moved.viewmodel";

export type PanelTier = "now" | "usual" | "longer" | "defect";
export type PanelStatus = "ok" | "fallback" | "degraded";

export const PANEL_CELL_KEYS = [
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
] as const;
export type PanelCellKey = (typeof PANEL_CELL_KEYS)[number];

export interface PanelCell {
  tier: PanelTier;
  status: PanelStatus;
}

export interface PanelScenarioCell extends ScenarioHorizonView {
  status: PanelStatus;
}

export interface PanelTrackView extends PanelCell {
  /** 판단 유형 표본 — 0 이면 비율 null(0% 가 아니다) */
  sample: number;
  sampleOrigin: "live" | "backtest";
  /** 100번 중 맞힌 번 · 늘 같은 쪽을 말했으면 맞혔을 번(기준). 표본 0 · 관망(기준 없음)이면 null */
  hitOutOf100: number | null;
  baselineOutOf100: number | null;
  horizonHours: number;
  claim: PerformanceClaim | null;
  /** 틀렸던 때 — 빗나간 사례만, 서버 순서 그대로 */
  misses: FailureCase[];
}

export interface PanelModeView {
  mode: CoachMode;
  judgment: {
    action: string;
    label: string;
    headline: string;
    caveats: JudgmentCaveat[];
    grade: JudgmentTier;
    gradeBasis: JudgmentTierBasis;
  } | null;
  track: PanelTrackView;
  explanation: PanelCell & { asOf: string | null; view: ExplanationViewModel | null };
}

export interface PanelMineView {
  line: { kind: "stop" | "target"; price: number } | null;
  gapToLinePct: number | null;
  averageBuyPrice: number | null;
  unrealizedProfit: number | null;
  unrealizedProfitRate: number | null;
}

export interface CompanyFactVM {
  /** 서버가 만든 한 줄(사실 나열 — 숫자 · 단위 원문 그대로) */
  text: string;
  kind: string;
  whenText: string | null;
  source: { kind: "article" | "disclosure"; name: string; url: string; at: string };
}

export interface CompanyBriefVM {
  headline: CompanyFactVM | null;
  earnings: CompanyFactVM[];
  today: CompanyFactVM[];
  /** 오늘이 아닌 창 안 사실 — 서버가 다른 칸과 겹치지 않게 골랐다 */
  recent: CompanyFactVM[];
  sector: Array<{ text: string; source: string; at: string | null }>;
  concern: CompanyFactVM[];
  windowDays: 7 | 90 | 365 | null;
  factCount: number;
}

export interface CoachPanelViewModel {
  symbol: string;
  market: "crypto" | "kr";
  generatedAt: string;
  horizonMode: Record<ScenarioHorizon, CoachMode>;
  scenario: { horizons: PanelScenarioCell[]; disclaimer: string };
  verdict: PanelCell & { check: TradeCheckViewModel | null };
  cause: PanelCell & { cause: MoveCauseViewVM | null };
  /** 회사 사정(F017 v4 2d · `SRV-REQ-053` FR-12) — 서버 문구 그대로. 사실 칸이 틀리면 그 사실만 버린다 · 칸 모양이 틀리면 `brief: null` */
  company: PanelCell & { brief: CompanyBriefVM | null };
  modes: { scalp: PanelModeView; longTerm: PanelModeView };
  mine: { status: "ok" | "degraded"; view: PanelMineView | null } | null;
  cells: Array<{ key: PanelCellKey; tier: PanelTier; status: PanelStatus }>;
  /** 칸이 깨져 BFF 가 내린 칸(서버는 다른 단을 줬다) — 계약 감시용 · 화면은 안 읽는다 */
  degradedBlocks: PanelCellKey[];
}

export class CoachPanelContractError extends Error {
  constructor(field: string) {
    super(`coach panel contract: ${field}`);
    this.name = "CoachPanelContractError";
  }
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const TIERS: readonly unknown[] = ["now", "usual", "longer", "defect"];
const toTierValue = (v: unknown): PanelTier | null => (TIERS.includes(v) ? (v as PanelTier) : null);

/** 서버 `coachPanel.ts` `panelStatus` 와 같은 표 */
export const panelStatus = (tier: PanelTier): PanelStatus =>
  tier === "now" ? "ok" : tier === "defect" ? "degraded" : "fallback";
const cell = (tier: PanelTier): PanelCell => ({ tier, status: panelStatus(tier) });

const DEFAULT_HORIZON_MODE: Record<ScenarioHorizon, CoachMode> = { "1h": "scalp", "4h": "scalp", "1d": "long_term", "5d": "long_term" };

const horizonMode = (raw: unknown): Record<ScenarioHorizon, CoachMode> => {
  if (!isObj(raw)) return DEFAULT_HORIZON_MODE;
  const out = { ...DEFAULT_HORIZON_MODE };
  for (const h of SCENARIO_HORIZONS) if (raw[h] === "scalp" || raw[h] === "long_term") out[h] = raw[h] as CoachMode;
  return out;
};

const rate100 = (v: number | null): number | null => (v === null || v < 0 || v > 1 ? null : Math.round(v * 100));

const trackView = (raw: Obj): PanelTrackView | null => {
  const tier = toTierValue(raw.tier);
  const tr = isObj(raw.trackRecord) ? raw.trackRecord : null;
  if (tier === null) return null;
  if (!tr) return tier === "defect" ? emptyTrack() : null;
  const sample = num(tr.sample);
  const horizonHours = num(tr.horizonHours);
  if (sample === null || sample < 0 || horizonHours === null) return null;
  const winRate = sample > 0 ? num(tr.winRate) : null;
  const excess = num(tr.excessWinRate);
  const misses = (Array.isArray(raw.failureCases) ? raw.failureCases : []).filter(
    (c): c is FailureCase =>
      isObj(c) && c.outcome === "miss" && typeof c.date === "string" && typeof c.symbol === "string" && num(c.returnRate) !== null,
  );
  return {
    ...cell(tier),
    sample,
    sampleOrigin: tr.sampleOrigin === "backtest" ? "backtest" : "live",
    hitOutOf100: rate100(winRate),
    baselineOutOf100: winRate !== null && excess !== null ? rate100(winRate - excess) : null,
    horizonHours,
    claim: toPerformanceClaim(tr.claim),
    misses,
  };
};

const emptyTrack = (): PanelTrackView => ({
  ...cell("defect"),
  sample: 0,
  sampleOrigin: "live",
  hitOutOf100: null,
  baselineOutOf100: null,
  horizonHours: 0,
  claim: null,
  misses: [],
});

const explanationView = (raw: Obj): PanelModeView["explanation"] | null => {
  const tier = toTierValue(raw.tier);
  if (tier === null) return null;
  if (raw.view === null || raw.view === undefined) return tier === "defect" ? { ...cell("defect"), asOf: null, view: null } : null;
  try {
    return { ...cell(tier), asOf: str(raw.asOf), view: toExplanationViewModel(raw.view) };
  } catch (error) {
    if (error instanceof ExplanationContractError) return null;
    throw error;
  }
};

const judgmentView = (raw: unknown): PanelModeView["judgment"] => {
  if (!isObj(raw)) return null;
  const action = str(raw.action);
  const label = str(raw.label);
  const headline = str(raw.headline);
  const caveats = toCaveats(raw.caveats);
  if (!action || !label || headline === null || !caveats) return null;
  const { tier, tierBasis } = toTier(raw.grade, raw.gradeBasis);
  return { action, label, headline, caveats, grade: tier, gradeBasis: tierBasis };
};

const mineView = (raw: unknown): CoachPanelViewModel["mine"] => {
  if (raw === null || raw === undefined) return null;
  if (!isObj(raw)) return { status: "degraded", view: null };
  if (raw.status !== "ok" || !isObj(raw.view)) return { status: "degraded", view: null };
  const v = raw.view;
  const line =
    isObj(v.line) && (v.line.kind === "stop" || v.line.kind === "target") && num(v.line.price) !== null
      ? { kind: v.line.kind as "stop" | "target", price: v.line.price as number }
      : null;
  return {
    status: "ok",
    view: {
      line,
      gapToLinePct: line ? num(v.gapToLinePct) : null,
      averageBuyPrice: num(v.averageBuyPrice),
      unrealizedProfit: num(v.unrealizedProfit),
      unrealizedProfitRate: num(v.unrealizedProfitRate),
    },
  };
};

const companyFact = (v: unknown): CompanyFactVM | null => {
  if (!isObj(v) || !isObj(v.source)) return null;
  const text = str(v.text);
  const url = safeUrl(v.source.url);
  const name = str(v.source.name);
  const at = str(v.source.at);
  if (!text || !url || !name || !at) return null;
  return {
    text,
    kind: str(v.kind) ?? "other",
    whenText: str(v.whenText),
    source: { kind: v.source.kind === "disclosure" ? "disclosure" : "article", name, url, at },
  };
};

const companyFacts = (v: unknown): CompanyFactVM[] =>
  (Array.isArray(v) ? v : []).map(companyFact).filter((f): f is CompanyFactVM => f !== null);

/** 회사 사정 칸 — 모양(배열 넷 · 수)이 틀리면 null. 사실 하나가 틀리면 그 사실만 버린다(링크가 http(s) 가 아니면 버림) */
const companyBrief = (v: unknown): CompanyBriefVM | null => {
  if (!isObj(v)) return null;
  if (!["earnings", "today", "sector", "concern"].every((k) => Array.isArray(v[k]))) return null;
  const factCount = num(v.factCount);
  if (factCount === null) return null;
  const w = v.windowDays;
  return {
    headline: v.headline === null ? null : companyFact(v.headline),
    earnings: companyFacts(v.earnings),
    today: companyFacts(v.today),
    // 옛 서버(칸 없음)는 빈 칸 — 모양 검사는 넷만 본다
    recent: companyFacts(v.recent),
    sector: (v.sector as unknown[]).filter(isObj).flatMap((x) => {
      const text = str(x.text);
      const source = str(x.source);
      return text && source ? [{ text, source, at: str(x.at) }] : [];
    }),
    concern: companyFacts(v.concern),
    windowDays: w === 7 || w === 90 || w === 365 ? w : null,
    factCount,
  };
};

/**
 * 서버 `data` → 화면 한 장. 머리(심볼 · 시장 · 칸 묶음 모양)가 틀리면 `CoachPanelContractError`(502) — 칸 안이 틀린 것은 그 칸만 내린다
 */
export const toCoachPanelViewModel = (raw: unknown): CoachPanelViewModel => {
  if (!isObj(raw)) throw new CoachPanelContractError("data");
  const symbol = str(raw.symbol);
  if (!symbol) throw new CoachPanelContractError("symbol");
  if (raw.market !== "crypto" && raw.market !== "kr") throw new CoachPanelContractError("market");
  const market = raw.market;
  for (const k of ["scenario", "verdict", "cause", "company", "modes"]) if (!isObj(raw[k])) throw new CoachPanelContractError(k);
  const lowered: PanelCellKey[] = [];

  // 시나리오 — 칸별 경로와 같은 뷰모델. 서버 단이 결함이 아닌데 뷰모델이 결함으로 내렸으면 내린 칸으로 센다
  const s = raw.scenario as Obj;
  const scenario = toScenarioViewModel({ symbol, market, horizons: s.horizons, disclaimer: s.disclaimer });
  const serverTier = new Map<string, unknown>(
    (Array.isArray(s.horizons) ? s.horizons : []).filter(isObj).map((h) => [String(h.horizon), h.tier]),
  );
  const horizons: PanelScenarioCell[] =
    scenario.status === "ok"
      ? scenario.horizons.map((h) => {
          if (h.tier === "defect" && serverTier.get(h.horizon) !== "defect") lowered.push(`scenario.${h.horizon}` as PanelCellKey);
          return { ...h, status: panelStatus(h.tier) };
        })
      : [];

  // 점검 한 줄
  const vr = raw.verdict as Obj;
  let check: TradeCheckViewModel | null = null;
  if (vr.check !== null && vr.check !== undefined) {
    try {
      check = toTradeCheckViewModel(vr.check);
    } catch (error) {
      if (!(error instanceof TradeCheckContractError)) throw error;
    }
  }
  const verdictTier = check ? (toTierValue(vr.tier) ?? "defect") : "defect";
  if (!check && vr.check) lowered.push("verdict");

  // 원인 — 단계가 근거와 안 맞으면 뷰모델이 버린다
  const cr = raw.cause as Obj;
  const cause = toMoveCauseVM(cr.cause);
  const causeTier = cause ? (toTierValue(cr.tier) ?? "defect") : "defect";
  if (!cause && cr.cause) lowered.push("cause");

  const co = raw.company as Obj;
  const brief = companyBrief(co.brief);
  const companyServerTier = toTierValue(co.tier) ?? "defect";
  // 칸 모양이 틀렸으면 결함으로 내린다(서버가 결함이 아닌 단을 줬을 때만 내린 칸으로 센다). 사실이 0 이어도 brief 는 있다
  if (!brief && co.brief !== null && co.brief !== undefined && companyServerTier !== "defect") lowered.push("company");
  const company = brief
    ? { ...cell(companyServerTier), brief }
    : { tier: "defect" as const, status: "degraded" as const, brief: null };

  const modesRaw = raw.modes as Obj;
  const mode = (key: "scalp" | "longTerm", m: CoachMode, cellKey: "scalp" | "long_term"): PanelModeView => {
    const mr = isObj(modesRaw[key]) ? (modesRaw[key] as Obj) : {};
    const track = isObj(mr.track) ? trackView(mr.track) : null;
    if (!track && isObj(mr.track) && mr.track.tier !== "defect") lowered.push(`track.${cellKey}`);
    const explanation = isObj(mr.explanation) ? explanationView(mr.explanation) : null;
    if (!explanation && isObj(mr.explanation) && mr.explanation.tier !== "defect") lowered.push(`explanation.${cellKey}`);
    return {
      mode: m,
      judgment: judgmentView(mr.judgment),
      track: track ?? emptyTrack(),
      explanation: explanation ?? { ...cell("defect"), asOf: null, view: null },
    };
  };
  const modes = { scalp: mode("scalp", "scalp", "scalp"), longTerm: mode("longTerm", "long_term", "long_term") };

  const scenarioTier = (h: ScenarioHorizon): PanelTier => horizons.find((x) => x.horizon === h)?.tier ?? "defect";
  const tiers: Record<PanelCellKey, PanelTier> = {
    "scenario.1h": scenarioTier("1h"),
    "scenario.4h": scenarioTier("4h"),
    "scenario.1d": scenarioTier("1d"),
    "scenario.5d": scenarioTier("5d"),
    verdict: verdictTier,
    cause: causeTier,
    company: company.tier,
    "track.scalp": modes.scalp.track.tier,
    "track.long_term": modes.longTerm.track.tier,
    "explanation.scalp": modes.scalp.explanation.tier,
    "explanation.long_term": modes.longTerm.explanation.tier,
  };

  return {
    symbol,
    market,
    generatedAt: str(raw.generatedAt) ?? "",
    horizonMode: horizonMode(raw.horizonMode),
    scenario: { horizons, disclaimer: scenario.status === "ok" ? scenario.disclaimer : str(s.disclaimer) ?? "" },
    verdict: { ...cell(verdictTier), check },
    cause: { ...cell(causeTier), cause },
    company,
    modes,
    mine: mineView(raw.mine),
    cells: PANEL_CELL_KEYS.map((key) => ({ key, tier: tiers[key], status: panelStatus(tiers[key]) })),
    degradedBlocks: lowered,
  };
};
