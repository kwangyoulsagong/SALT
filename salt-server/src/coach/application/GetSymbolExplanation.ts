import {
  explanationFactCatalog,
  explanationSentences,
  judgmentOnlySentences,
  selectExplanationTier,
  templateExplanation,
  type CoachMode,
  type ExplainProvider,
  type ExplanationSentence,
  type ExplanationSnapshotStore,
  type ExplanationTier,
} from "../domain";
import type { ExplanationDemand } from "./lib/explanationDemand";
import { prepareExplanation, type ExplanationMaterialsDeps } from "./lib/explanationMaterials";
import { JUDGMENT_DISCLAIMER } from "./lib/judgmentTrack";

export interface SymbolExplanationView {
  symbol: string;
  mode: CoachMode;
  /** 4단 중 어느 단 — `latest` 최신 AI · `previous` 이전 AI · `template` 사실표 문장 · `none` 특이 소식 없음 + 판단 근거 */
  tier: ExplanationTier;
  /** AI 가 쓴 문장인가(`latest` · `previous`). 화면은 이것으로만 AI 표시를 단다 */
  aiGenerated: boolean;
  provider: ExplainProvider | null;
  /** 문장을 만든 시각(ISO) — AI 단은 저장 시각, 나머지는 지금 */
  generatedAt: string;
  /** 늘 하나 이상 — 칸이 비지 않는다 */
  sentences: ExplanationSentence[];
  disclaimer: string;
}

export interface GetSymbolExplanationDeps extends ExplanationMaterialsDeps {
  store: ExplanationSnapshotStore;
  demand: ExplanationDemand;
  now?: () => Date;
}

/**
 * 해설 읽기 — 4단 (F017 v2 단계 3 · `SRV-REQ-053` FR-3 ③).
 *
 * **저장값만 읽는다** — 이 유스케이스는 `CoachExplainer` 를 받지 않는다(받을 자리가 없으니 요청 경로 LLM 0, 불변식 1).
 * 저장본이 없거나 낡으면 사실표 문장(템플릿)이 그 자리를 채우고, 본 종목 · 모드를 배치에 알려 다음 회차가 AI 해설을 만든다
 */
export class GetSymbolExplanation {
  constructor(private readonly deps: GetSymbolExplanationDeps) {}

  async execute(symbol: string, mode: CoachMode): Promise<SymbolExplanationView> {
    const now = this.deps.now?.() ?? new Date();
    const prepared = await prepareExplanation(this.deps, symbol, mode, now);
    const stored = await this.deps.store.find(prepared.symbol, mode, prepared.fingerprint);
    const tier = selectExplanationTier({
      mode,
      fingerprint: prepared.fingerprint,
      action: prepared.view.judgment.action,
      stored,
      factsAvailable: prepared.input !== null,
      now,
    });
    if (tier !== "latest") this.deps.demand.want(prepared.symbol, mode, now);

    const base = { symbol: prepared.symbol, mode, tier, disclaimer: JUDGMENT_DISCLAIMER };
    if ((tier === "latest" || tier === "previous") && stored) {
      return {
        ...base,
        aiGenerated: true,
        provider: stored.provider,
        generatedAt: stored.generatedAt.toISOString(),
        sentences: stored.sentences,
      };
    }
    if (tier === "template" && prepared.input) {
      return {
        ...base,
        aiGenerated: false,
        provider: null,
        generatedAt: now.toISOString(),
        sentences: explanationSentences(
          templateExplanation(prepared.input, now),
          explanationFactCatalog(prepared.input, now)
        ),
      };
    }
    return {
      ...base,
      tier: "none",
      aiGenerated: false,
      provider: null,
      generatedAt: now.toISOString(),
      sentences: judgmentOnlySentences(prepared.view.judgment, now),
    };
  }
}
