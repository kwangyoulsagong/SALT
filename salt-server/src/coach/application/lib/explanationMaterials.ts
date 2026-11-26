import {
  assembleExplanationFacts,
  EXPLANATION_NEWS_MAX,
  explanationFingerprint,
  explanationTradeDay,
  recentFlow,
  recentFlowText,
  RECENT_FLOW_HIGH_BARS,
  type CoachExplanationInput,
  type ForecastReader,
  type CoachMode,
  type MarketProbe,
  type NewsProbe,
  type SymbolJudgmentStore,
} from "../../domain";
import { collectJudgmentMaterials, indicatorFor, judgeSymbol, materialGuards, type SymbolJudgmentMaterials } from "./judgeSymbols";
import { attachJudgmentTrack, type ModeCoachView } from "./judgmentTrack";

export interface ExplanationMaterialsDeps {
  market: MarketProbe;
  news: NewsProbe;
  judgments: SymbolJudgmentStore;
  backtestJudgments: SymbolJudgmentStore | null;
  /** 닫힌 일봉 — 최근 흐름 재료(`SRV-REQ-063` FR-2). 없으면(테스트 · 예측 뷰 없음) 흐름 없이 */
  closes?: Pick<ForecastReader, "dailyCloses"> | null;
}

/** 최근 흐름에 읽는 일봉 창 — 20거래일 + 연휴 여유(달력 일) */
const RECENT_FLOW_LOOKBACK_DAYS = RECENT_FLOW_HIGH_BARS * 2;

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
): Promise<PreparedExplanation> => prepareExplanationMode(deps, await loadExplanationBase(deps, rawSymbol), mode, now);

/** 모드와 무관한 재료(시세 · 지표 · 심리 · 고래 · 소식) — 두 모드 해설이 한 번만 읽게(한 장 패널, F017 v4 1d) */
export interface ExplanationBase {
  symbol: string;
  materials: SymbolJudgmentMaterials;
  judged: ReturnType<typeof judgeSymbol>;
  news: Awaited<ReturnType<NewsProbe["recentForSymbol"]>>;
  /** 닫힌 일봉 종가(오래된 → 최근) — 읽기 실패 · 포트 없음이면 빈 배열(흐름 없이 간다) */
  closes: { openTime: Date; close: number }[];
}

export const loadExplanationBase = async (deps: ExplanationMaterialsDeps, rawSymbol: string): Promise<ExplanationBase> => {
  const symbol = rawSymbol.toUpperCase();
  const from = new Date(Date.now() - RECENT_FLOW_LOOKBACK_DAYS * 86_400_000);
  const [materialsBySymbol, news, closes] = await Promise.all([
    collectJudgmentMaterials(deps.market, [symbol]),
    deps.news.recentForSymbol(symbol, EXPLANATION_NEWS_MAX).catch(() => []),
    // 흐름은 문장 재료지 판단 재료가 아니다 — 못 읽으면 흐름 없이(뉴스와 같다)
    deps.closes
      ? deps.closes
          .dailyCloses([symbol], from)
          .then((bars) => (bars.get(symbol) ?? []).map((b) => ({ openTime: b.openTime, close: Number(b.close) })))
          .catch(() => [])
      : Promise.resolve([]),
  ]);
  const materials = materialsBySymbol.get(symbol)!;
  return { symbol, materials, judged: judgeSymbol(symbol, materials, false), news, closes };
};

export const prepareExplanationMode = async (
  deps: ExplanationMaterialsDeps,
  base: ExplanationBase,
  mode: CoachMode,
  now: Date
): Promise<PreparedExplanation> => {
  const { symbol, materials, judged, news, closes } = base;
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
    recentFlow: (() => {
      const flow = recentFlow({ closes, currentPrice: materials.quote?.currentPrice ?? 0, now });
      return flow ? recentFlowText(flow) : null;
    })(),
  });

  const fingerprint = explanationFingerprint({
    mode,
    action: view.judgment.action,
    observations: view.observations,
    caveatReasons: view.caveats.map((c) => c.reason),
    newsTitles: (input?.news ?? []).map((n) => n.title),
    tradeDay: explanationTradeDay(now),
  });

  return { symbol, mode, view, input, fingerprint };
};
