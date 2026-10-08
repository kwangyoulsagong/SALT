import {
  DEFAULT_ROUND_TRIP_COSTS,
  isJudgmentSnapshotDue,
  isKrExitSettled,
  judgmentAssetClassOf,
  JUDGMENT_MODES,
  krJudgmentExitWindow,
  staleKrJudgmentInputs,
  judgeOutcome,
  judgmentMaturesAt,
  judgmentReturnRate,
  judgmentSignalType,
  JUDGMENT_HORIZON_MS,
  JUDGMENT_PRICE_TIMEFRAME,
  MODE_DECISION_RULE_VERSION,
  type Clock,
  type CoachMode,
  type JudgmentEvaluation,
  type JudgmentSnapshotDraft,
  type MarketProbe,
  type ModeDecision,
  type PendingJudgment,
  type RoundTripCosts,
  type SymbolJudgmentStore,
  type TrackedAssetProbe,
} from "../domain";
import { collectJudgmentMaterials, judgeSymbol } from "./lib/judgeSymbols";

const MODES: CoachMode[] = ["scalp", "long_term"];

const judgmentKey = (symbol: string, mode: CoachMode) => `${symbol}:${mode}`;

export interface SnapshotResult {
  tracked: number;
  written: number;
  /** 현재가가 없어 남기지 못한 심볼. 진입가 없는 표본은 판정할 수 없다. */
  skippedNoPrice: string[];
  /**
   * 국내 주식 중 판단 대상이 아직 아니라 남기지 않은 종목(F011 FR-62 · 66) — 이력(일봉 120 · 일봉 지표)이 모자라거나
   * 재료가 1 거래일 넘게 밀렸다. 화면이 막는 판단을 표본으로 세면 성적이 화면과 다른 조건에서 쌓인다
   */
  skippedNotReady: string[];
}

/**
 * 추적 자산의 두 모드 판단을 스냅샷으로 남긴다 (F004 · D11 · `SRV-REQ-024` FR-107).
 *
 * 워커가 자주 불러도 된다 — **관찰 기간이 지난 조합만** 새로 쓴다(B39 표본 독립성).
 * 단타는 종목당 하루 1건, 장기는 30일에 1건이다. 그래서 행 하나가 곧 표본 하나다.
 */
export class SnapshotSymbolJudgments {
  constructor(
    private readonly tracked: TrackedAssetProbe,
    private readonly market: MarketProbe,
    private readonly judgments: SymbolJudgmentStore,
    private readonly now: Clock = () => new Date()
  ) {}

  async execute(): Promise<SnapshotResult> {
    const symbols = await this.tracked.listTrackedSymbols();
    if (symbols.length === 0) return { tracked: 0, written: 0, skippedNoPrice: [], skippedNotReady: [] };

    const now = this.now();
    const last = await this.judgments.lastJudgedAt(symbols);

    const due = symbols.filter((symbol) =>
      MODES.some((mode) =>
        isJudgmentSnapshotDue(mode, last.get(judgmentKey(symbol, mode)) ?? null, now)
      )
    );
    if (due.length === 0) return { tracked: symbols.length, written: 0, skippedNoPrice: [], skippedNotReady: [] };

    const materials = await collectJudgmentMaterials(this.market, due);
    const drafts: JudgmentSnapshotDraft[] = [];
    const skippedNoPrice: string[] = [];
    const skippedNotReady: string[] = [];

    for (const symbol of due) {
      const material = materials.get(symbol);
      const entryPrice = material?.quote?.currentPrice;
      if (!material || !entryPrice) {
        skippedNoPrice.push(symbol);
        continue;
      }
      if (
        material.assetClass === "kr_stock" &&
        (!material.krHistory?.ready ||
          staleKrJudgmentInputs({
            priceUpdatedAt: material.quote?.priceUpdatedAt ?? null,
            dailyIndicatorAt: material.indicators.long_term?.timestamp ?? null,
            now,
          }).length > 0)
      ) {
        skippedNotReady.push(symbol);
        continue;
      }

      // 스냅샷에는 보유 여부가 없다 — 판단 점수가 보유 여부를 쓰지 않는다(`makeModeDecision`)
      const judgment = judgeSymbol(symbol, material, false);
      const byMode: Record<CoachMode, ModeDecision> = {
        scalp: judgment.scalp,
        long_term: judgment.longTerm,
      };

      // 국내 주식은 장기만 남긴다(F011 FR-63)
      for (const mode of JUDGMENT_MODES[material.assetClass]) {
        const lastAt = last.get(judgmentKey(symbol, mode)) ?? null;
        if (!isJudgmentSnapshotDue(mode, lastAt, now)) continue;

        const decision = byMode[mode];
        drafts.push({
          symbol,
          mode,
          action: decision.action,
          signalType: judgmentSignalType(mode, decision.action, material.assetClass),
          score: decision.score,
          reasons: decision.reasons,
          entryPrice,
          judgedAt: now,
          ruleVersion: MODE_DECISION_RULE_VERSION,
        });
      }
    }

    const written = await this.judgments.saveSnapshots(drafts);
    return { tracked: symbols.length, written, skippedNoPrice, skippedNotReady };
  }
}

export interface EvaluationResult {
  evaluated: number;
  /** 관찰 기간은 지났는데 그 뒤 종가가 아직 없는 것. 다음 회차에 다시 본다. */
  waitingForPrice: number;
}

/** 한 회차에 판정하는 스냅샷 수 상한. 밀린 것은 다음 회차가 이어 간다. */
const EVALUATION_BATCH = 200;

/**
 * 관찰 기간이 끝난 스냅샷에 결과를 매긴다 (`SRV-REQ-024` FR-134 · FR-135).
 *
 * 판정 가격은 **관찰 기간이 끝난 시각 이후 첫 종가**다. 그 종가가 아직 없으면 건너뛰고
 * 다음 회차에 다시 본다 — 추정값으로 채우지 않는다.
 *
 * 국내 주식(`kr_stock.` 접두)은 **만기일 이전 마지막 거래일 종가**다(F011 FR-64 · `krJudgmentExitWindow`) —
 * 만기일 종가가 확정되기 전이거나, 평일 봉이 아직 안 왔으면 기다린다. 적중 경계는 그 자산군 왕복 비용이다.
 */
export class EvaluateSymbolJudgments {
  constructor(
    private readonly market: MarketProbe,
    private readonly judgments: SymbolJudgmentStore,
    private readonly now: Clock = () => new Date(),
    private readonly costs: RoundTripCosts = DEFAULT_ROUND_TRIP_COSTS
  ) {}

  /** 판정 가격. 아직 정할 수 없으면 `null` — 다음 회차에 다시 본다 */
  private async exitPrice(item: PendingJudgment, now: Date): Promise<number | null> {
    if (judgmentAssetClassOf(item.signalType) === "kr_stock") {
      const window = krJudgmentExitWindow(item.judgedAt);
      if (now < window.readyAt) return null;
      const bar = await this.market.closeAtOrBefore(item.symbol, window.exitBarAt, "d1", window.notBefore);
      return bar && isKrExitSettled(window, bar.timestamp, now) ? bar.close : null;
    }
    return this.market.closeAtOrAfter(
      item.symbol,
      judgmentMaturesAt(item.mode, item.judgedAt),
      JUDGMENT_PRICE_TIMEFRAME[item.mode]
    );
  }

  async execute(): Promise<EvaluationResult> {
    const now = this.now();
    const judgedBefore = {
      scalp: new Date(now.getTime() - JUDGMENT_HORIZON_MS.scalp),
      long_term: new Date(now.getTime() - JUDGMENT_HORIZON_MS.long_term),
    };
    const matured = await this.judgments.listPending(judgedBefore, EVALUATION_BATCH);

    const exits = await Promise.all(matured.map((item) => this.exitPrice(item, now)));

    const evaluations: JudgmentEvaluation[] = [];
    matured.forEach((item, index) => {
      const exitPrice = exits[index];
      if (!exitPrice || item.entryPrice <= 0) return;

      const returnRate = judgmentReturnRate(item.entryPrice, exitPrice);
      evaluations.push({
        id: item.id,
        exitPrice,
        returnRate,
        outcome: judgeOutcome(item.mode, item.action, returnRate, this.costs[judgmentAssetClassOf(item.signalType)]),
        evaluatedAt: now,
      });
    });

    await this.judgments.saveEvaluations(evaluations);
    return {
      evaluated: evaluations.length,
      waitingForPrice: matured.length - evaluations.length,
    };
  }
}
