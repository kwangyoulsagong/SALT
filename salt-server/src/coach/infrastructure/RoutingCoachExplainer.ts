import { logger } from "../../shared/config/logger";
import {
  LOCAL_LLM_FAILURE_LIMIT,
  LOCAL_LLM_PAUSE_MS,
  pickExplainProvider,
  type CoachExplainer,
  type CoachExplanation,
  type CoachExplanationInput,
  type ExplainCaller,
  type ExplainHooks,
  type ExplainProvider,
} from "../domain";

/** Gemini 토큰 상한에 닿았는데 로컬 CLI 도 못 쓴다 — 유스케이스가 템플릿으로 간다 */
export class GeminiBudgetReached extends Error {
  constructor() {
    super("Gemini 토큰 상한 — 로컬 CLI 도 없음");
  }
}

type LocalExplainer = CoachExplainer & { provider: Exclude<ExplainProvider, "gemini">; streams: boolean };

/** 서버 전체 동시 CLI 상한(FR-6) — 넘으면 그 요청은 Gemini */
export const LOCAL_CLI_MAX_CONCURRENT = 2;

export interface RoutingOptions {
  maxConcurrent?: number;
  now?: () => number;
}

/**
 * 다듬기 공급자 라우터 (`SRV-REQ-050` FR-1 · FR-3 · FR-6 · FR-7).
 *
 * 해설 배치(`GenerateExplanationSnapshots`)는 이것 하나만 본다 — 어느 공급자인지 모른다. 고르는 규칙은 도메인(`pickExplainProvider`),
 * 여기는 상태(동시 실행 수 · 연속 실패 · 쉬는 시각)만 든다.
 *
 * 로컬 CLI 실패 · 시간 초과 · 모양 불일치 → 같은 요청을 Gemini 로 한 번. 그것도 실패면 유스케이스가 템플릿으로 간다.
 * 요청이 끊겼으면 내려가지 않는다 — 읽을 사람이 없다.
 */
export class RoutingCoachExplainer implements CoachExplainer {
  private inFlight = 0;
  private failures = 0;
  private pausedUntil = 0;

  constructor(
    private local: LocalExplainer | null,
    private readonly gemini: CoachExplainer,
    private readonly options: RoutingOptions = {}
  ) {}

  /** 부팅 감지(FR-2)는 비동기라 조립 뒤에 꽂는다 — 그 전 요청은 Gemini */
  useLocal(local: LocalExplainer | null): void {
    this.local = local;
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  async explain(
    input: CoachExplanationInput,
    signal?: AbortSignal,
    caller?: ExplainCaller,
    hooks?: ExplainHooks
  ): Promise<CoachExplanation> {
    const choice = pickExplainProvider({
      local: this.local?.provider ?? null,
      localPaused: this.now() < this.pausedUntil,
      localBusy: this.inFlight >= (this.options.maxConcurrent ?? LOCAL_CLI_MAX_CONCURRENT),
    });

    if (choice !== "gemini" && this.local) {
      this.inFlight += 1;
      try {
        hooks?.onProvider?.(this.local.provider, this.local.streams);
        const result = await this.local.explain(input, signal, caller, hooks);
        this.failures = 0;
        return result;
      } catch (error) {
        if (signal?.aborted) throw error;
        this.failures += 1;
        if (this.failures >= LOCAL_LLM_FAILURE_LIMIT) {
          this.pausedUntil = this.now() + LOCAL_LLM_PAUSE_MS;
          this.failures = 0;
          logger.warn(`로컬 CLI(${this.local.provider}) 연속 ${LOCAL_LLM_FAILURE_LIMIT}회 실패 — 10분 동안 Gemini 로`);
        }
      } finally {
        this.inFlight -= 1;
      }
    }

    if (caller?.geminiAllowed === false) throw new GeminiBudgetReached();
    hooks?.onProvider?.("gemini", false);
    return this.gemini.explain(input, signal, caller, hooks);
  }
}
