import { logger } from "../../shared/config/logger";

import {
  EXPLANATION_BATCH_MAX_PER_RUN,
  type CoachExplainer,
  type CoachMode,
  type ExplanationSnapshotStore,
  type LlmBudgetLimits,
  type LlmUsageStore,
  type CompanyFactReader,
  type CompanyFilingReader,
  type MoveCauseReader,
  type TrackedAssetProbe,
} from "../domain";
import type { ExplanationDemand } from "./lib/explanationDemand";
import { ExplanationGenerations, generateExplanation, llmBudget, withCause, withCompany } from "./lib/explanationGeneration";
import { loadExplanationBase, prepareExplanationMode, type ExplanationMaterialsDeps } from "./lib/explanationMaterials";

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
  /** 원인 → 근거 → 결과 재료(F017 v4 1f) — 없으면 원인 없이 */
  causes?: MoveCauseReader;
  /** 회사 사정 재료(F017 v4 2b+ FR-16) — 생성할 때만 */
  company?: { facts: CompanyFactReader; filings: CompanyFilingReader };
  /** 스트림과 같은 등록부 — 같은 지문은 생성 하나(F017 v4 1f) */
  generations: ExplanationGenerations;
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

    // 같은 종목의 두 모드는 모드와 무관한 재료(시세 · 지표 · 소식)를 한 번만 읽는다(F017 v4 1d 와 같은 이유)
    const bases = new Map<string, ReturnType<typeof loadExplanationBase>>();
    for (const { symbol, mode } of candidates) {
      if (!bases.has(symbol)) bases.set(symbol, loadExplanationBase(this.deps, symbol));
      const prepared = await bases
        .get(symbol)!
        .then((base) => prepareExplanationMode(this.deps, base, mode, now))
        .catch((error: unknown) => {
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
      const budget = await llmBudget(this.deps.usage, this.deps.limits, this.now());
      if (!budget.allowed) {
        result.deferred += 1;
        continue;
      }

      attempts += 1;
      const withCauseInput = await withCause(this.deps.causes, prepared, prepared.input);
      const input = await withCompany(this.deps.company, prepared, withCauseInput, new Date());
      // 화면 스트림이 같은 지문을 이미 만들고 있으면 거기 붙는다 — LLM 두 번 0
      const { done } = this.deps.generations.join(ExplanationGenerations.key(prepared), (emit) =>
        generateExplanation(
          { explainer: this.deps.explainer, store: this.deps.store, usage: this.deps.usage, now: () => this.now() },
          prepared,
          input,
          budget.geminiAllowed,
          emit
        )
      );
      if (await done) result.generated += 1;
      else result.failed += 1;
    }
    return result;
  }
}
