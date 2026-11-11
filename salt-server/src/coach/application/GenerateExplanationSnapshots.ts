import { logger } from "../../shared/config/logger";

import {
  EXPLANATION_BATCH_MAX_PER_RUN,
  EXPLANATION_PROMPT_VERSION,
  EXPLANATION_SNAPSHOT_KEEP,
  EXPLANATION_VERIFIER_VERSION,
  explanationFactCatalog,
  explanationFactsHash,
  explanationSentences,
  isStorableExplanation,
  llmSentenceCount,
  LLM_BUDGET_WINDOW_MS,
  llmBudgetVerdict,
  resolveLlmLimits,
  verifyExplanation,
  type CoachExplainer,
  type CoachMode,
  type ExplanationSnapshotStore,
  type LlmBudgetLimits,
  type LlmUsageStore,
  type TrackedAssetProbe,
} from "../domain";
import type { ExplanationDemand } from "./lib/explanationDemand";
import { prepareExplanation, type ExplanationMaterialsDeps } from "./lib/explanationMaterials";

/** 두 모드 다 — 국내 단타도 판단이 열려 있다(`ADR-010` v2) */
const MODES: readonly CoachMode[] = ["scalp", "long_term"];

export interface GenerateExplanationSnapshotsDeps extends ExplanationMaterialsDeps {
  explainer: CoachExplainer;
  store: ExplanationSnapshotStore;
  tracked: TrackedAssetProbe;
  demand: ExplanationDemand;
  /** 없으면 상한 없이(테스트) */
  usage?: LlmUsageStore;
  limits?: Partial<LlmBudgetLimits>;
  /** `COACH_EXPLAIN_LLM=off` 면 배치가 아무것도 만들지 않는다 — 화면은 사실표 문장(템플릿 단) */
  llmEnabled: boolean;
  now?: () => Date;
}

export interface ExplanationBatchResult {
  candidates: number;
  /** 지문이 같아 건너뜀 */
  unchanged: number;
  generated: number;
  /** LLM 실패 · 검사가 전부 버림 — 저장 0, 이전 성공본 유지 */
  failed: number;
  /** 현재가가 없어 사실표를 못 만듦 */
  noFacts: number;
  /** 회차 상한 · LLM 상한으로 다음 회차에 */
  deferred: number;
}

/**
 * 해설 스냅샷 배치 (F017 v2 단계 3 · `SRV-REQ-053` FR-3 ②).
 *
 * 후보 = 최근 본 종목(새것 먼저) ∪ 추적 종목 × 두 모드. 지문이 저장본과 같으면 건너뛰고, 바뀐 것만
 * 사실표 → LLM(로컬 → 대체 공급자) → 검증기 → 저장. **실패한 생성은 쓰지 않는다** — 이전 성공본이 남아 화면은 이전 단을 보인다.
 * LLM 은 하나씩 순서대로(회차 상한 `EXPLANATION_BATCH_MAX_PER_RUN`). 트랜잭션을 열지 않는다(LLM 수 초~수십 초).
 * 워커는 이 배치를 DB 만 훑는 회차와 다른 스케줄로 돈다(`performance-server.md` §6)
 */
export class GenerateExplanationSnapshots {
  constructor(private readonly deps: GenerateExplanationSnapshotsDeps) {}

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }

  /** 이번 시도에 LLM 을 불러도 되나 — 배치 몫(사용자 null)과 전체를 같은 상한으로 본다. 원장을 못 읽으면 막는다 */
  private async budget(): Promise<{ allowed: boolean; geminiAllowed: boolean }> {
    const usage = this.deps.usage;
    if (!usage) return { allowed: true, geminiAllowed: true };
    try {
      const limits = resolveLlmLimits(this.deps.limits);
      const verdict = llmBudgetVerdict(
        await usage.usageSince(new Date(this.now().getTime() - LLM_BUDGET_WINDOW_MS), null),
        // 배치는 사람 한 명이 아니라 서버 전체 몫이다 — 사용자 상한 대신 전체 상한
        { ...limits, userCalls: limits.totalCalls }
      );
      if (verdict.exceeded === "total_tokens") return { allowed: true, geminiAllowed: false };
      return { allowed: verdict.allowed, geminiAllowed: verdict.allowed };
    } catch (error) {
      logger.warn(`해설 배치 — LLM 사용량 조회 실패, 이번 회차 쉼: ${(error as Error).message}`);
      return { allowed: false, geminiAllowed: false };
    }
  }

  private async candidates(now: Date): Promise<{ symbol: string; mode: CoachMode }[]> {
    const tracked = await this.deps.tracked.listTrackedSymbols();
    const seen = new Set<string>();
    const out: { symbol: string; mode: CoachMode }[] = [];
    const push = (symbol: string, mode: CoachMode) => {
      const key = `${symbol.toUpperCase()}:${mode}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ symbol: symbol.toUpperCase(), mode });
    };
    this.deps.demand.recent(now).forEach((d) => push(d.symbol, d.mode));
    tracked.forEach((symbol) => MODES.forEach((mode) => push(symbol, mode)));
    return out;
  }

  async execute(): Promise<ExplanationBatchResult> {
    const now = this.now();
    const result: ExplanationBatchResult = {
      candidates: 0,
      unchanged: 0,
      generated: 0,
      failed: 0,
      noFacts: 0,
      deferred: 0,
    };
    if (!this.deps.llmEnabled) return result;

    const candidates = await this.candidates(now);
    result.candidates = candidates.length;
    let attempts = 0;

    for (const { symbol, mode } of candidates) {
      const prepared = await prepareExplanation(this.deps, symbol, mode, now).catch((error: unknown) => {
        logger.warn(`해설 배치 — ${symbol} ${mode} 재료 실패: ${(error as Error).message}`);
        return null;
      });
      if (!prepared) {
        result.failed += 1;
        continue;
      }
      if (!prepared.input) {
        result.noFacts += 1;
        continue;
      }
      const stored = await this.deps.store.find(prepared.symbol, mode, prepared.fingerprint);
      if (stored?.fingerprint === prepared.fingerprint) {
        result.unchanged += 1;
        continue;
      }
      if (attempts >= EXPLANATION_BATCH_MAX_PER_RUN) {
        result.deferred += 1;
        continue;
      }
      const budget = await this.budget();
      if (!budget.allowed) {
        result.deferred += 1;
        continue;
      }

      attempts += 1;
      const input = prepared.input;
      try {
        const llm = await this.deps.explainer.explain(input, undefined, {
          userId: null,
          client: "web",
          geminiAllowed: budget.geminiAllowed,
          batch: true,
        });
        const generatedAt = this.now();
        const verified = verifyExplanation(llm, input, generatedAt);
        if (llm.callId && this.deps.usage) {
          this.deps.usage
            .markDropped(llm.callId, verified.dropped.length)
            .catch((error: unknown) => logger.warn(`버린 문장 수 기록 실패: ${(error as Error).message}`));
        }
        const kept = llmSentenceCount(llm) - verified.dropped.length;
        if (!isStorableExplanation(verified.source, kept) || !llm.provider) {
          result.failed += 1;
          continue;
        }
        const catalog = explanationFactCatalog(input, generatedAt);
        const sentences = explanationSentences(verified.explanation, catalog);
        await this.deps.store.save({
          symbol: prepared.symbol,
          mode,
          fingerprint: prepared.fingerprint,
          action: prepared.view.judgment.action,
          source: verified.source,
          provider: llm.provider,
          sentences,
          verifier: {
            sentences: sentences.length,
            // 검사가 버린 문장 수 — 버린 문장 원문은 남기지 않는다
            dropped: verified.dropped.length,
            promptVersion: EXPLANATION_PROMPT_VERSION,
            verifierVersion: EXPLANATION_VERIFIER_VERSION,
          },
          factsHash: explanationFactsHash(input),
          generatedAt,
        });
        await this.deps.store.prune(prepared.symbol, mode, EXPLANATION_SNAPSHOT_KEEP);
        result.generated += 1;
      } catch (error) {
        // 원인 원문은 싣지 않는다 — 모델 응답이 섞일 수 있다(`ddd-infrastructure.md` §6)
        logger.warn(`해설 배치 — ${symbol} ${mode} 생성 실패(이전 성공본 유지): ${(error as Error).name}`);
        result.failed += 1;
      }
    }
    return result;
  }
}
