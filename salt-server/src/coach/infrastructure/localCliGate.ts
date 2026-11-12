import { logger } from "../../shared/config/logger";
import { LOCAL_LLM_FAILURE_LIMIT, LOCAL_LLM_PAUSE_MS, pickExplainProvider, type ExplainProvider } from "../domain";

/** 서버 전체 동시 CLI 상한(`SRV-REQ-050` FR-6) — 넘으면 그 요청은 Gemini */
export const LOCAL_CLI_MAX_CONCURRENT = 2;

export interface LocalCliGateOptions {
  maxConcurrent?: number;
  now?: () => number;
}

/**
 * 로컬 CLI 상태 하나 — 동시 실행 수 · 연속 실패 · 쉬는 시각(`SRV-REQ-050` FR-6 · FR-7). 고르는 규칙은 도메인(`pickExplainProvider`).
 *
 * **해설 라우터와 오늘 등락 한 줄 작성기가 같은 인스턴스를 쓴다**(F016 단계 D, 2026-11-12) — 로컬 CLI 로그인이 풀리면 둘이 같이 쉬고,
 * 동시 상한도 둘을 합쳐 센다. 각자 상태를 들면 한쪽이 연속 실패로 쉬는 동안 다른 쪽이 같은 실패를 다시 세 번 겪는다
 */
export class LocalCliGate {
  private inFlight = 0;
  private failures = 0;
  private pausedUntil = 0;

  constructor(private readonly options: LocalCliGateOptions = {}) {}

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  pick(local: Exclude<ExplainProvider, "gemini"> | null): ExplainProvider {
    return pickExplainProvider({
      local,
      localPaused: this.now() < this.pausedUntil,
      localBusy: this.inFlight >= (this.options.maxConcurrent ?? LOCAL_CLI_MAX_CONCURRENT),
    });
  }

  /**
   * 로컬 CLI 한 번 — 성공이면 연속 실패를 지우고, 실패면 세다가 상한에서 10분 쉰다. 끊긴 요청(`aborted`)은 세지 않는다. 실패는 그대로 던진다
   */
  async run<T>(provider: string, call: () => Promise<T>, aborted: () => boolean = () => false): Promise<T> {
    this.inFlight += 1;
    try {
      const result = await call();
      this.failures = 0;
      return result;
    } catch (error) {
      if (!aborted()) {
        this.failures += 1;
        if (this.failures >= LOCAL_LLM_FAILURE_LIMIT) {
          this.pausedUntil = this.now() + LOCAL_LLM_PAUSE_MS;
          this.failures = 0;
          logger.warn(`로컬 CLI(${provider}) 연속 ${LOCAL_LLM_FAILURE_LIMIT}회 실패 — 10분 동안 Gemini 로`);
        }
      }
      throw error;
    } finally {
      this.inFlight -= 1;
    }
  }
}
