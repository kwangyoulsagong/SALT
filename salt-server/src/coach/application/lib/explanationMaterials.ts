import {
  assembleExplanationFacts,
  EXPLANATION_NEWS_MAX,
  explanationFingerprint,
  type CoachExplanationInput,
  type CoachMode,
  type MarketProbe,
  type NewsProbe,
  type SymbolJudgmentStore,
} from "../../domain";
import { collectJudgmentMaterials, indicatorFor, judgeSymbol, materialGuards } from "./judgeSymbols";
import { attachJudgmentTrack, type ModeCoachView } from "./judgmentTrack";

export interface ExplanationMaterialsDeps {
  market: MarketProbe;
  news: NewsProbe;
  judgments: SymbolJudgmentStore;
  backtestJudgments: SymbolJudgmentStore | null;
}

export interface PreparedExplanation {
  symbol: string;
  mode: CoachMode;
  view: ModeCoachView;
  /** 사실표 — 현재가가 없으면 `null`(가격 없는 해설은 만들지 않는다) */
  input: CoachExplanationInput | null;
  fingerprint: string;
}

/**
 * 해설 재료 — 배치(`GenerateExplanationSnapshots`)와 읽기(`GetSymbolExplanation`)가 **같은 함수**로 판단 · 사실 · 지문을 만든다.
 * 판단은 종목 경로(`GetSymbolCoach`)와 같은 함수(`judgeSymbol` · `attachJudgmentTrack`)다.
 *
 * **시장 층이다** — 보유 · 사용자를 받지 않는다(`SRV-REQ-053` 불변식 2). 판단 규칙은 보유를 읽지 않는다(`hasHolding` 은 쓰는 곳 0).
 * 뉴스가 실패하면 뉴스 없이 간다 — 뉴스는 해설의 재료지 판단의 재료가 아니다. 모두 저장값 읽기(외부 호출 · LLM 0)
 */
export const prepareExplanation = async (
  deps: ExplanationMaterialsDeps,
  rawSymbol: string,
  mode: CoachMode,
  now: Date
): Promise<PreparedExplanation> => {
  const symbol = rawSymbol.toUpperCase();
  const [materialsBySymbol, news] = await Promise.all([
    collectJudgmentMaterials(deps.market, [symbol]),
    deps.news.recentForSymbol(symbol, EXPLANATION_NEWS_MAX).catch(() => []),
  ]);
  const materials = materialsBySymbol.get(symbol)!;
  const judged = judgeSymbol(symbol, materials, false);
  const decision = mode === "scalp" ? judged.scalp : judged.longTerm;
  const view = await attachJudgmentTrack(
    deps.judgments,
    decision,
    materialGuards(materials, mode, now),
    materials.assetClass,
    {
      backtest: deps.backtestJudgments,
      market: deps.market,
      scored: { components: judged.components[mode], missingInputs: judged.missingByMode[mode] },
    }
  );

  const input = assembleExplanationFacts({
    symbol,
    mode,
    quote: materials.quote,
    judgment: view.judgment,
    indicator: indicatorFor(materials, mode),
    sentiment: materials.sentiment,
    whale: { buyAmountKRW: judged.whaleBuy, sellAmountKRW: judged.whaleSell, count: materials.whales.length },
    news,
  });

  const fingerprint = explanationFingerprint({
    mode,
    action: view.judgment.action,
    observations: view.observations,
    caveatReasons: view.caveats.map((c) => c.reason),
    newsTitles: (input?.news ?? []).map((n) => n.title),
  });

  return { symbol, mode, view, input, fingerprint };
};
