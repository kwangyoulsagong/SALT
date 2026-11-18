import {
  explanationFactCatalog,
  explanationSentences,
  templateExplanation,
  verifyExplanation,
  type CoachExplainer,
  type CoachExplanation,
  type CoachExplanationInput,
  type CoachMode,
  type CompanyFactReader,
  type CompanyFilingReader,
  type ExplanationSentence,
  type LlmBudgetLimits,
  type LlmUsageStore,
  type MoveCauseReader,
  type VerifiedExplanation,
} from "../domain";
import { gatherAgentFacts, type AgentGatherDeps, type AgentTrace } from "./lib/agentGather";
import { llmBudget, withCause, withCompany } from "./lib/explanationGeneration";
import { prepareExplanation, type ExplanationMaterialsDeps } from "./lib/explanationMaterials";

export interface CompareAgentExplanationDeps extends ExplanationMaterialsDeps {
  explainer: CoachExplainer;
  agent: AgentGatherDeps;
  causes?: MoveCauseReader;
  company?: { facts: CompanyFactReader; filings: CompanyFilingReader };
  usage?: LlmUsageStore;
  limits?: Partial<LlmBudgetLimits>;
  now?: () => Date;
}

export interface AgentComparison {
  symbol: string;
  mode: CoachMode;
  /** 템플릿 · 에이전트가 같이 받은 재료(에이전트 쪽은 + 도구 사실) */
  input: CoachExplanationInput;
  template: CoachExplanation;
  agent: VerifiedExplanation;
  /** 에이전트 작성기 원문(검증 전) — 측정 리포트가 검사가 버린 문장을 보려고. 화면 · 저장 0 */
  agentRaw: CoachExplanation;
  /** 지금 운영 해설(도구 없이 같은 작성기 · 검증기) — `plain` 을 켰을 때만. 에이전트가 지금 화면보다 나은지 보는 두 번째 기준 */
  plain: VerifiedExplanation | null;
  /** 에이전트 해설의 인용 붙은 문장 — 도구 사실 인용(`tool-n`)을 센다 */
  sentences: ExplanationSentence[];
  trace: AgentTrace;
  provider: string | null;
}

/**
 * 템플릿 vs 에이전트 한 쌍(O3 · `SRV-REQ-059` FR-6 · `FC-REQ-023` FR-6) — 블라인드 A/B 평가지 재료. **측정용**이다: 화면 경로 0 · 저장 0.
 * 재료는 배치와 같은 함수(`prepareExplanation` · 원인 · 회사 사정), 문장은 운영 작성기(`explainer`), 거르기는 운영 검증기.
 * 에이전트 쪽만 다르다 — 고르기 → 도구 사실 → 같은 작성기 · 같은 검증기. LLM 상한은 운영 원장 그대로(넘으면 Gemini 막힘)
 */
export class CompareAgentExplanation {
  constructor(private readonly deps: CompareAgentExplanationDeps) {}

  async execute(symbol: string, mode: CoachMode, options: { plain?: boolean } = {}): Promise<AgentComparison | null> {
    const now = this.deps.now?.() ?? new Date();
    const prepared = await prepareExplanation(this.deps, symbol, mode, now);
    if (!prepared.input) return null;
    const base = await withCompany(this.deps.company, prepared, await withCause(this.deps.causes, prepared, prepared.input), now);
    const budget = await llmBudget(this.deps.usage, this.deps.limits, now);
    const asset = prepared.view.assetClass === "kr_stock" ? "kr" : "crypto";
    const agent = await gatherAgentFacts(this.deps.agent, base, asset, now, { geminiAllowed: budget.geminiAllowed });
    const llm = await this.deps.explainer.explain(agent.input, undefined, { userId: null, geminiAllowed: budget.geminiAllowed });
    const verified = verifyExplanation(llm, agent.input, now);
    const plain = options.plain
      ? verifyExplanation(await this.deps.explainer.explain(base, undefined, { userId: null, geminiAllowed: budget.geminiAllowed }), base, now)
      : null;
    return {
      symbol: prepared.symbol,
      mode,
      input: agent.input,
      template: templateExplanation(base, now),
      agent: verified,
      agentRaw: llm,
      plain,
      sentences: explanationSentences(verified.explanation, explanationFactCatalog(agent.input, now)),
      trace: agent.trace,
      provider: llm.provider ?? null,
    };
  }
}
