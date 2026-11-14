import { logger } from "../../../shared/config/logger";

import {
  EXPLANATION_PROMPT_VERSION,
  EXPLANATION_SNAPSHOT_KEEP,
  EXPLANATION_VERIFIER_VERSION,
  citeSentence,
  createLineGate,
  explanationFactCatalog,
  explanationFactsHash,
  explanationSentences,
  isStorableExplanation,
  llmBudgetVerdict,
  llmSentenceCount,
  LLM_BUDGET_WINDOW_MS,
  reservedCallsBehind,
  resolveLlmLimits,
  verifyExplanation,
  type CoachExplainer,
  type CoachExplanationInput,
  type ExplanationSentence,
  type ExplanationSnapshotStore,
  type LlmBudgetLimits,
  type LlmUsageStore,
  type MoveCauseReader,
} from "../../domain";
import type { PreparedExplanation } from "./explanationMaterials";

/**
 * 원인 → 근거 → 결과를 해설 재료에 붙인다(F017 v4 1f · `SRV-REQ-053` FR-16). 생성할 때만 — 읽기 · 지문은 원인을 모른다.
 * 가장 강한 원인 하나와 결과 한 줄. 못 읽으면 원인 없이(해설은 근거 데이터로 쓴다)
 */
export const withCause = async (
  causes: MoveCauseReader | undefined,
  prepared: PreparedExplanation,
  input: CoachExplanationInput
): Promise<CoachExplanationInput> => {
  if (!causes) return input;
  const asset = prepared.view.assetClass === "kr_stock" ? "kr" : "crypto";
  const view = await causes.cause(asset, prepared.symbol).catch((error: unknown) => {
    logger.warn(`해설 원인 재료 실패 — 원인 없이: ${prepared.symbol} ${(error as Error).message}`);
    return null;
  });
  const first = view?.causes[0];
  if (!view || !first) return input;
  return {
    ...input,
    cause: {
      strength: first.strength,
      headline: first.headline,
      note: first.note,
      evidence: first.evidence.map((e) => ({ value: e.value, compare: e.compare, source: e.source })),
      result: view.result.text,
    },
  };
};

/** 이번 시도에 LLM 을 불러도 되나 — 서버 전체 24시간 상한(배치 · 스트림 같은 원장). 원장을 못 읽으면 막는다 */
export const llmBudget = async (
  usage: LlmUsageStore | undefined,
  limits: Partial<LlmBudgetLimits> | undefined,
  now: Date
): Promise<{ allowed: boolean; geminiAllowed: boolean }> => {
  if (!usage) return { allowed: true, geminiAllowed: true };
  try {
    const verdict = llmBudgetVerdict(
      await usage.usageSince(new Date(now.getTime() - LLM_BUDGET_WINDOW_MS)),
      resolveLlmLimits(limits),
      // 같은 워커 뒤에 도는 오늘 등락 한 줄 · 사실 추출 몫을 남긴다(F016 단계 D — 해설이 상한을 다 써 한 줄이 굶었다)
      reservedCallsBehind("explanation")
    );
    if (verdict.exceeded === "total_tokens") return { allowed: true, geminiAllowed: false };
    return { allowed: verdict.allowed, geminiAllowed: verdict.allowed };
  } catch (error) {
    logger.warn(`해설 — LLM 사용량 조회 실패, 이번엔 쉼: ${(error as Error).message}`);
    return { allowed: false, geminiAllowed: false };
  }
};

export interface GenerationDeps {
  explainer: CoachExplainer;
  store: ExplanationSnapshotStore;
  usage?: LlmUsageStore;
  now: () => Date;
}

/**
 * 해설 한 벌 생성 — LLM(로컬 → 대체 공급자) → 줄마다 문지기(사실 · 극성 · 칸 상한 · 되풀이) → 통과한 줄은 바로 `onSentence`(스트림) →
 * 전체 검증 → 저장. **트랜잭션 밖**(LLM 수 초~수십 초). 저장했으면 true · 검사가 전부 버렸거나 실패면 false(이전 성공본 유지)
 */
export const generateExplanation = async (
  deps: GenerationDeps,
  prepared: PreparedExplanation,
  input: CoachExplanationInput,
  geminiAllowed: boolean,
  onSentence: (sentence: ExplanationSentence) => void
): Promise<boolean> => {
  const startedAt = deps.now();
  const catalog = explanationFactCatalog(input, startedAt);
  const gate = createLineGate(input);
  let streamed = 0;
  try {
    const llm = await deps.explainer.explain(
      input,
      undefined,
      { userId: null, geminiAllowed },
      {
        onLine: (line) => {
          if (!gate(line.section, line.text).ok) return;
          streamed += 1;
          onSentence({ section: line.section, text: line.text.trim(), citations: citeSentence(line.section, line.text, catalog) });
        },
      }
    );
    const generatedAt = deps.now();
    const verified = verifyExplanation(llm, input, generatedAt);
    if (llm.callId && deps.usage) {
      deps.usage
        .markDropped(llm.callId, verified.dropped.length)
        .catch((error: unknown) => logger.warn(`버린 문장 수 기록 실패: ${(error as Error).message}`));
    }
    const kept = llmSentenceCount(llm) - verified.dropped.length;
    if (!isStorableExplanation(verified.source, kept) || !llm.provider) return false;
    const sentences = explanationSentences(verified.explanation, explanationFactCatalog(input, generatedAt));
    // 줄 형식이 아닌 공급자(JSON 한 번에)면 흘린 줄이 없다 — 저장 문장을 그대로 흘려 화면 순서를 맞춘다
    if (streamed === 0) sentences.forEach(onSentence);
    await deps.store.save({
      symbol: prepared.symbol,
      mode: prepared.mode,
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
    await deps.store.prune(prepared.symbol, prepared.mode, EXPLANATION_SNAPSHOT_KEEP);
    return true;
  } catch (error) {
    // 원인 원문은 싣지 않는다 — 모델 응답이 섞일 수 있다(`ddd-infrastructure.md` §6)
    logger.warn(`해설 생성 실패(이전 성공본 유지) — ${prepared.symbol} ${prepared.mode}: ${(error as Error).name}`);
    return false;
  }
};

type Listener = (sentence: ExplanationSentence) => void;

interface Running {
  sentences: ExplanationSentence[];
  listeners: Set<Listener>;
  done: Promise<boolean>;
}

/**
 * 같은 종목 · 모드 · 지문의 생성은 하나(`SRV-REQ-053` FR-9 — 생성 1 · 구독 N). 배치와 스트림이 같은 등록부를 쓴다.
 * 늦게 붙은 구독자는 이미 나온 문장을 먼저 받는다. 구독자가 다 떠나도 생성은 끝까지 가서 저장한다(다음 사람 몫)
 */
export class ExplanationGenerations {
  private readonly running = new Map<string, Running>();

  static key(prepared: Pick<PreparedExplanation, "symbol" | "mode" | "fingerprint">): string {
    return `${prepared.symbol}:${prepared.mode}:${prepared.fingerprint}`;
  }

  /** 진행 중이면 붙고, 아니면 `start` 로 연다. 반환 = 저장 여부 + 떼기 */
  join(
    key: string,
    start: (emit: Listener) => Promise<boolean>,
    listener?: Listener
  ): { done: Promise<boolean>; leave: () => void } {
    let run = this.running.get(key);
    if (!run) {
      const created: Running = { sentences: [], listeners: new Set(), done: Promise.resolve(false) };
      const emit: Listener = (sentence) => {
        created.sentences.push(sentence);
        for (const l of created.listeners) l(sentence);
      };
      created.done = start(emit).finally(() => this.running.delete(key));
      this.running.set(key, created);
      run = created;
    }
    if (listener) {
      run.sentences.forEach(listener);
      run.listeners.add(listener);
    }
    const target = run;
    return { done: target.done, leave: () => listener && target.listeners.delete(listener) };
  }

  /** 지금 도는 생성 수(시험 · 상태) */
  get size(): number {
    return this.running.size;
  }
}
