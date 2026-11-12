import {
  type CoachExplainer,
  type CoachExplanation,
  type CoachExplanationInput,
  type ExplainCaller,
  type ExplainHooks,
  type ExplainProvider,
} from "../domain";
import { LocalCliGate } from "./localCliGate";

/** Gemini 토큰 상한에 닿았는데 로컬 CLI 도 못 쓴다 — 유스케이스가 템플릿으로 간다 */
export class GeminiBudgetReached extends Error {
  constructor() {
    super("Gemini 토큰 상한 — 로컬 CLI 도 없음");
  }
}

type LocalExplainer = CoachExplainer & { provider: Exclude<ExplainProvider, "gemini">; streams: boolean };

export { LOCAL_CLI_MAX_CONCURRENT } from "./localCliGate";

export interface RoutingOptions {
  maxConcurrent?: number;
  now?: () => number;
  /** 로컬 CLI 상태를 다른 LLM 배치(오늘 등락 한 줄)와 나눠 쓴다. 없으면 이 라우터 혼자 */
  gate?: LocalCliGate;
}

/**
 * 다듬기 공급자 라우터 (`SRV-REQ-050` FR-1 · FR-3 · FR-6 · FR-7).
 *
 * 해설 배치(`GenerateExplanationSnapshots`)는 이것 하나만 본다 — 어느 공급자인지 모른다. 고르는 규칙은 도메인(`pickExplainProvider`),
 * 상태(동시 실행 수 · 연속 실패 · 쉬는 시각)는 `LocalCliGate` — 오늘 등락 한 줄 작성기와 같은 인스턴스(F016 단계 D).
 *
 * 로컬 CLI 실패 · 시간 초과 · 모양 불일치 → 같은 요청을 Gemini 로 한 번. 그것도 실패면 유스케이스가 템플릿으로 간다.
 * 요청이 끊겼으면 내려가지 않는다 — 읽을 사람이 없다.
 */
export class RoutingCoachExplainer implements CoachExplainer {
  private readonly gate: LocalCliGate;

  constructor(
    private local: LocalExplainer | null,
    private readonly gemini: CoachExplainer,
    options: RoutingOptions = {}
  ) {
    this.gate = options.gate ?? new LocalCliGate({ maxConcurrent: options.maxConcurrent, now: options.now });
  }

  /** 부팅 감지(FR-2)는 비동기라 조립 뒤에 꽂는다 — 그 전 요청은 Gemini */
  useLocal(local: LocalExplainer | null): void {
    this.local = local;
  }

  async explain(
    input: CoachExplanationInput,
    signal?: AbortSignal,
    caller?: ExplainCaller,
    hooks?: ExplainHooks
  ): Promise<CoachExplanation> {
    const local = this.local;
    if (local && this.gate.pick(local.provider) !== "gemini") {
      try {
        return await this.gate.run(
          local.provider,
          () => {
            hooks?.onProvider?.(local.provider, local.streams);
            return local.explain(input, signal, caller, hooks);
          },
          () => Boolean(signal?.aborted)
        );
      } catch (error) {
        if (signal?.aborted) throw error;
      }
    }

    if (caller?.geminiAllowed === false) throw new GeminiBudgetReached();
    hooks?.onProvider?.("gemini", false);
    return this.gemini.explain(input, signal, caller, hooks);
  }
}
