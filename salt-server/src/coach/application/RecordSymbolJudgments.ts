import {
  isJudgmentSnapshotDue,
  judgeOutcome,
  judgmentMaturesAt,
  judgmentReturnRate,
  judgmentSignalType,
  JUDGMENT_HORIZON_MS,
  type Clock,
  type CoachMode,
  type JudgmentEvaluation,
  type JudgmentSnapshotDraft,
  type MarketProbe,
  type ModeDecision,
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
    if (symbols.length === 0) return { tracked: 0, written: 0, skippedNoPrice: [] };

    const now = this.now();
    const last = await this.judgments.lastJudgedAt(symbols);

    const due = symbols.filter((symbol) =>
      MODES.some((mode) =>
        isJudgmentSnapshotDue(mode, last.get(judgmentKey(symbol, mode)) ?? null, now)
      )
    );
    if (due.length === 0) return { tracked: symbols.length, written: 0, skippedNoPrice: [] };

    const materials = await collectJudgmentMaterials(this.market, due);
    const drafts: JudgmentSnapshotDraft[] = [];
    const skippedNoPrice: string[] = [];

    for (const symbol of due) {
      const material = materials.get(symbol);
      const entryPrice = material?.quote?.currentPrice;
      if (!material || !entryPrice) {
        skippedNoPrice.push(symbol);
        continue;
      }

      // 스냅샷에는 보유 여부가 없다 — 판단 점수가 보유 여부를 쓰지 않는다(`makeModeDecision`)
      const judgment = judgeSymbol(symbol, material, false);
      const byMode: Record<CoachMode, ModeDecision> = {
        scalp: judgment.scalp,
        long_term: judgment.longTerm,
      };

      for (const mode of MODES) {
        const lastAt = last.get(judgmentKey(symbol, mode)) ?? null;
        if (!isJudgmentSnapshotDue(mode, lastAt, now)) continue;

        const decision = byMode[mode];
        drafts.push({
          symbol,
          mode,
          action: decision.action,
          signalType: judgmentSignalType(mode, decision.action),
          score: decision.score,
          reasons: decision.reasons,
          entryPrice,
          judgedAt: now,
        });
      }
    }

    const written = await this.judgments.saveSnapshots(drafts);
    return { tracked: symbols.length, written, skippedNoPrice };
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
 */
export class EvaluateSymbolJudgments {
  constructor(
    private readonly market: MarketProbe,
    private readonly judgments: SymbolJudgmentStore,
    private readonly now: Clock = () => new Date()
  ) {}

  async execute(): Promise<EvaluationResult> {
    const now = this.now();
    const judgedBefore = {
      scalp: new Date(now.getTime() - JUDGMENT_HORIZON_MS.scalp),
      long_term: new Date(now.getTime() - JUDGMENT_HORIZON_MS.long_term),
    };
    const matured = await this.judgments.listPending(judgedBefore, EVALUATION_BATCH);

    const exits = await Promise.all(
      matured.map((item) =>
        this.market.closeAtOrAfter(item.symbol, judgmentMaturesAt(item.mode, item.judgedAt))
      )
    );

    const evaluations: JudgmentEvaluation[] = [];
    matured.forEach((item, index) => {
      const exitPrice = exits[index];
      if (!exitPrice || item.entryPrice <= 0) return;

      const returnRate = judgmentReturnRate(item.entryPrice, exitPrice);
      evaluations.push({
        id: item.id,
        exitPrice,
        returnRate,
        outcome: judgeOutcome(item.mode, item.action, returnRate),
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
