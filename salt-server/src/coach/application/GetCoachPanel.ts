import { logger } from "../../shared/config/logger";
import {
  COMPANY_PENDING_REASON,
  PANEL_HORIZON_MODE,
  causeTier,
  explanationTier,
  panelMine,
  panelStatus,
  trackTier,
  verdictTier,
  type CoachMode,
  type CoachProfileStore,
  type MoveCauseReader,
  type PanelCellKey,
  type PanelCellState,
  type PanelHorizon,
  type PanelMineView,
  type PanelMoveCause,
  type PanelStatus,
  type PanelTier,
  type PortfolioProbe,
  type ScenarioCellView,
  type ScenarioMarket,
  type TradePlanStore,
} from "../domain";
import type { CheckTradeOdds, TradeCheckView } from "./CheckTradeOdds";
import type { GetSymbolCoach, SymbolModeView } from "./GetSymbolCoach";
import type { GetSymbolExplanation, SymbolExplanationView } from "./GetSymbolExplanation";
import type { GetSymbolScenario } from "./GetSymbolScenario";

interface CellBase {
  tier: PanelTier;
  status: PanelStatus;
}

export interface PanelScenarioCell extends ScenarioCellView {
  status: PanelStatus;
}

export interface PanelModeView {
  mode: CoachMode;
  /** 판단 한 줄 — 판단 블록과 같은 값. 판단 읽기가 실패하면 null(성적 칸도 같이 degraded) */
  judgment: {
    action: SymbolModeView["judgment"]["action"];
    label: string;
    headline: string;
    caveats: SymbolModeView["caveats"];
    grade: SymbolModeView["tier"];
    gradeBasis: SymbolModeView["tierBasis"];
  } | null;
  /** 성적 — 적중률 · 표본 · 기준 · 틀렸던 때. 판단 블록 · 해설 3종 문장과 같은 값(`attachJudgmentTrack`) */
  track: CellBase & {
    trackRecord: SymbolModeView["trackRecord"] | null;
    failureCases: SymbolModeView["failureCases"];
  };
  /** 해설 저장본(4단). 저장값 읽기 — 이전 AI 단이면 `asOf` 가 그 시각 */
  explanation: CellBase & { asOf: string | null; view: SymbolExplanationView | null };
}

export interface CoachPanelView {
  symbol: string;
  market: ScenarioMarket;
  generatedAt: string;
  /** 기간 탭 → 판단 모드(성적 · 해설 칸을 고르는 표) */
  horizonMode: Readonly<Record<PanelHorizon, CoachMode>>;
  /** 지평 넷 — 칸마다 `tier` · `status`. 비지 않는다 */
  scenario: { horizons: PanelScenarioCell[]; disclaimer: string };
  /** 점검 한 줄(사기 전) — 서버 문장 그대로 */
  verdict: CellBase & { check: TradeCheckView | null };
  cause: CellBase & { cause: PanelMoveCause | null };
  /** 회사 사정(FR-12) — 재료가 순서 2. 지금은 늘 결함 단 + 이유 */
  company: CellBase & { reason: typeof COMPANY_PENDING_REASON };
  modes: { scalp: PanelModeView; longTerm: PanelModeView };
  /**
   * 내 기준(FR-15) — 보유가 없으면 null. 나만 보인다(토큰의 사용자). 보유 · 계획을 못 읽었으면 `degraded` + `view: null` —
   * "보유 없음"으로 접지 않는다
   */
  mine: { status: PanelStatus; view: PanelMineView | null } | null;
  /** 상태 점검(`OPS-004`)이 세는 칸 표 — 위 칸들의 단을 한 줄씩 */
  cells: PanelCellState[];
}

export interface GetCoachPanelDeps {
  scenario: Pick<GetSymbolScenario, "execute">;
  check: Pick<CheckTradeOdds, "execute">;
  judgment: Pick<GetSymbolCoach, "execute">;
  explanation: Pick<GetSymbolExplanation, "executeModes">;
  causes: MoveCauseReader;
  profiles: Pick<CoachProfileStore, "findByUser">;
  portfolio: Pick<PortfolioProbe, "getHolding">;
  tradePlans: Pick<TradePlanStore, "listOwned">;
  now?: () => Date;
}

/** 시세를 못 읽어 시장을 모를 때 — 6자리 숫자는 국내 종목 코드(검색 · 라벨과 같은 규칙) */
const guessMarket = (symbol: string): ScenarioMarket => (/^\d{6}$/.test(symbol) ? "kr" : "crypto");

const settle = async <T>(what: string, symbol: string, run: () => Promise<T>): Promise<T | null> => {
  try {
    return await run();
  } catch (error) {
    logger.warn(`패널 ${what} 읽기 실패 — 그 칸만 결함`, { symbol, error: String(error) });
    return null;
  }
};

const cell = (tier: PanelTier): CellBase => ({ tier, status: panelStatus(tier) });

/**
 * 한 장 패널 한 번 응답(F017 v4 순서 1d · `SRV-REQ-053` FR-13).
 *
 * 화면이 칸마다 따로 부르던 다섯 경로(시나리오 · 점검 · 판단 · 해설 · 왜 움직였나)를 **같은 유스케이스 그대로** 한 번에 조립한다 —
 * 새 계산 0, 칸마다 어느 단을 썼는지(`coachPanel.ts`)만 더한다. 저장값만 읽는다(LLM · 외부 호출 0).
 *
 * - 한 칸 실패가 패널을 비우지 않는다 — 그 칸만 `defect` · `degraded`, 응답은 200
 * - 시장(코인 · 국내)은 시나리오가 시세로 정한다. 원인 · 내 기준은 그 뒤에 이어 읽고, 나머지는 같이 읽는다
 * - 해설은 두 모드 모두(기간 탭이 모드를 바꾼다 — 탭마다 다시 부르지 않게)
 */
export class GetCoachPanel {
  constructor(private readonly deps: GetCoachPanelDeps) {}

  async execute(user: { userId: string; email?: string }, rawSymbol: string): Promise<CoachPanelView> {
    const symbol = rawSymbol.trim().toUpperCase();
    const now = this.deps.now?.() ?? new Date();

    const scenarioP = settle("시나리오", symbol, () => this.deps.scenario.execute(user, symbol));
    const marketP = scenarioP.then((s) => s?.market ?? guessMarket(symbol));
    const [scenario, check, judgment, explanations, cause, mine] = await Promise.all([
      scenarioP,
      settle("점검", symbol, () => this.deps.check.execute(user.userId, { symbol, side: "buy" })),
      settle("판단", symbol, () => this.deps.judgment.execute(user.userId, { symbol, viewerEmail: user.email })),
      settle("해설", symbol, () => this.deps.explanation.executeModes(symbol, ["scalp", "long_term"])),
      marketP.then((market) => settle("원인", symbol, () => this.deps.causes.cause(market, symbol))),
      marketP.then((market) => settle("내 기준", symbol, () => this.mine(user.userId, symbol, market))),
    ]);
    const market = await marketP;
    const [scalpExplain, longExplain] = explanations ?? [null, null];

    const horizons: PanelScenarioCell[] = scenario
      ? scenario.horizons.map((h) => ({ ...h, status: panelStatus(h.tier) }))
      : [];
    const verdict = { ...cell(check ? verdictTier(check.status) : "defect"), check };
    const causeCell = { ...cell(causeTier(cause ? (cause.causes[0]?.strength ?? "none") : null)), cause };
    const company = { ...cell("defect"), reason: COMPANY_PENDING_REASON };
    const modes = {
      scalp: this.modeView("scalp", judgment?.modes.scalp ?? null, scalpExplain),
      longTerm: this.modeView("long_term", judgment?.modes.longTerm ?? null, longExplain),
    };

    // 시나리오를 못 읽었으면 지평 넷 모두 결함으로 센다(칸 표가 줄지 않게)
    const scenarioTiers: Record<PanelHorizon, PanelTier> = { "1h": "defect", "4h": "defect", "1d": "defect", "5d": "defect" };
    for (const h of horizons) scenarioTiers[h.horizon] = h.tier;
    const entries: Array<[PanelCellKey, PanelTier]> = [
      ["scenario.1h", scenarioTiers["1h"]],
      ["scenario.4h", scenarioTiers["4h"]],
      ["scenario.1d", scenarioTiers["1d"]],
      ["scenario.5d", scenarioTiers["5d"]],
      ["verdict", verdict.tier],
      ["cause", causeCell.tier],
      ["company", company.tier],
      ["track.scalp", modes.scalp.track.tier],
      ["track.long_term", modes.longTerm.track.tier],
      ["explanation.scalp", modes.scalp.explanation.tier],
      ["explanation.long_term", modes.longTerm.explanation.tier],
    ];

    return {
      symbol,
      market,
      generatedAt: now.toISOString(),
      horizonMode: PANEL_HORIZON_MODE,
      scenario: { horizons, disclaimer: scenario?.disclaimer ?? "" },
      verdict,
      cause: causeCell,
      company,
      modes,
      mine: mine === "none" ? null : mine === null ? { status: "degraded", view: null } : { status: "ok", view: mine },
      cells: entries.map(([key, tier]) => ({ key, tier, status: panelStatus(tier) })),
    };
  }

  private modeView(mode: CoachMode, view: SymbolModeView | null, explanation: SymbolExplanationView | null): PanelModeView {
    const explainTier = explanation ? explanationTier(explanation.tier) : "defect";
    return {
      mode,
      judgment: view
        ? {
            action: view.judgment.action,
            label: view.judgment.label,
            headline: view.judgment.headline,
            caveats: view.caveats,
            grade: view.tier,
            gradeBasis: view.tierBasis,
          }
        : null,
      track: {
        ...cell(view ? trackTier(view.trackRecord) : "defect"),
        trackRecord: view?.trackRecord ?? null,
        failureCases: view?.failureCases ?? [],
      },
      explanation: {
        ...cell(explainTier),
        // 이전 AI 단만 멈춘 값 — 그 시각을 화면이 말한다
        asOf: explanation && explanation.tier === "previous" ? explanation.generatedAt : null,
        view: explanation,
      },
    };
  }

  /** 내 기준 — 보유 · 최근 매수 계획 · 매입가 숨김. 셋 다 이 사용자 것만(userId 조건) */
  private async mine(userId: string, symbol: string, market: ScenarioMarket): Promise<PanelMineView | "none"> {
    const holding = await this.deps.portfolio.getHolding(userId, symbol, market === "kr" ? "kr_stock" : "crypto");
    if (!holding || !(holding.totalQuantity > 0)) return "none";
    const [profile, plans] = await Promise.all([
      this.deps.profiles.findByUser(userId),
      this.deps.tradePlans.listOwned(userId, { symbol, limit: 5 }),
    ]);
    // 최신 매수 계획 — 손절 · 목표가를 적은 것만(빈 계획은 선이 아니다)
    const plan = plans.find((p) => p.side === "buy" && (p.stopPrice !== null || p.targetPrice !== null)) ?? null;
    return (
      panelMine({
      holding: {
        quantity: holding.totalQuantity,
        averageBuyPrice: holding.averageBuyPrice,
        unrealizedProfit: holding.unrealizedProfit,
        unrealizedProfitRate: holding.unrealizedProfitRate,
      },
      price: holding.currentPrice > 0 ? holding.currentPrice : null,
      plan: plan ? { stopPrice: plan.stopPrice?.toNumber() ?? null, targetPrice: plan.targetPrice?.toNumber() ?? null } : null,
      hidePurchasePrice: profile?.hidePurchasePrice === true,
      }) ?? "none"
    );
  }
}
