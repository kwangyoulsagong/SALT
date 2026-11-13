import type {
  CoachExplainer,
  CoachMode,
  ExplanationSentence,
  ExplanationSnapshotStore,
  LlmBudgetLimits,
  LlmUsageStore,
  MoveCauseReader,
} from "../domain";
import type { GetSymbolExplanation, SymbolExplanationView } from "./GetSymbolExplanation";
import { ExplanationGenerations, generateExplanation, llmBudget, withCause } from "./lib/explanationGeneration";
import { loadExplanationBase, prepareExplanationMode, type ExplanationMaterialsDeps } from "./lib/explanationMaterials";

/** 스트림 이벤트를 받는 쪽 — 컨트롤러가 SSE 로 옮긴다 */
export interface ExplanationStreamSink {
  /** 지금 지문의 저장본(최신 AI) — 한 번 보내고 끝 */
  snapshot(view: SymbolExplanationView): void;
  /** 검사를 지난 문장 하나 */
  sentence(sentence: ExplanationSentence): void;
  /** 저장 끝 — 최종 한 벌(3종 문장 포함) */
  done(view: SymbolExplanationView): void;
  /** 만들 수 없었다(상한 · 꺼짐 · 실패) — 서버 문장(이전 AI · 사실표 · 판단만) */
  fallback(view: SymbolExplanationView): void;
}

export interface StreamSymbolExplanationDeps extends ExplanationMaterialsDeps {
  read: Pick<GetSymbolExplanation, "execute">;
  explainer: CoachExplainer;
  store: ExplanationSnapshotStore;
  generations: ExplanationGenerations;
  causes?: MoveCauseReader;
  usage?: LlmUsageStore;
  limits?: Partial<LlmBudgetLimits>;
  llmEnabled: boolean;
  now?: () => Date;
}

/**
 * 해설 스트림(F017 v4 1f · `SRV-REQ-053` FR-9).
 *
 * - 지금 지문의 저장본이 있으면 `snapshot` 한 번
 * - 없으면 생성하며 검사를 지난 문장부터 `sentence` → 저장 → `done`(3종 문장까지 붙은 최종 한 벌). 실패 · 상한 · 꺼짐이면 `fallback`
 * - **같은 종목 · 모드 · 지문은 생성 하나**(배치와 같은 등록부) — 늦게 붙으면 이미 나온 문장부터 받는다
 * - `signal` 이 끊겨도(화면이 떠남) 생성은 끝까지 가서 저장한다 — 다음 사람 몫. 이 구독만 뗀다
 * - 모두 같은 문장(사람마다 다르지 않다 — 시장 층) · 하루 상한 · 로컬 CLI 게이트 · 검사기는 배치와 같다
 */
export class StreamSymbolExplanation {
  constructor(private readonly deps: StreamSymbolExplanationDeps) {}

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }

  async execute(symbol: string, mode: CoachMode, sink: ExplanationStreamSink, signal?: AbortSignal): Promise<void> {
    const current = await this.deps.read.execute(symbol, mode);
    if (current.tier === "latest") {
      sink.snapshot(current);
      return;
    }
    if (!this.deps.llmEnabled) {
      sink.fallback(current);
      return;
    }
    const now = this.now();
    const prepared = await prepareExplanationMode(this.deps, await loadExplanationBase(this.deps, symbol), mode, now);
    if (!prepared.input) {
      sink.fallback(current);
      return;
    }
    const budget = await llmBudget(this.deps.usage, this.deps.limits, now);
    if (!budget.allowed) {
      sink.fallback(current);
      return;
    }
    const input = await withCause(this.deps.causes, prepared, prepared.input);
    const { done, leave } = this.deps.generations.join(
      ExplanationGenerations.key(prepared),
      (emit) =>
        generateExplanation(
          { explainer: this.deps.explainer, store: this.deps.store, usage: this.deps.usage, now: () => this.now() },
          prepared,
          input,
          budget.geminiAllowed,
          emit
        ),
      // 화면이 떠나면 `leave` 가 이 구독을 뗀다(아래) — 그 뒤 문장은 오지 않는다
      (sentence) => sink.sentence(sentence)
    );
    signal?.addEventListener("abort", leave, { once: true });
    const saved = await done;
    leave();
    if (signal?.aborted) return;
    const final = await this.deps.read.execute(symbol, mode);
    if (saved && final.tier === "latest") sink.done(final);
    else sink.fallback(final);
  }
}
