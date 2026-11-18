import type { ExplainProvider, FactExtractor, LlmUsageStore } from "../domain";
import { buildFactExtractPrompt, FACT_EXTRACT_SYSTEM_INSTRUCTION } from "./factExtractPrompt";
import type { LocalCliGate } from "./localCliGate";
import type { runCli } from "./localCliProcess";
import { OneShotLlm, OneShotLlmFailed } from "./oneShotLlm";

type LocalProvider = Exclude<ExplainProvider, "gemini">;

/** 실패 사유 코드(`timeout` · `gemini_blocked` …) — 한 번 부르기와 같은 오류 */
export { OneShotLlmFailed as FactExtractFailed };

/**
 * 사실 추출 LLM(F017 v4 2c) — 오늘 등락 한 줄과 같은 길: 로컬 CLI(구독 · 비용 0) 먼저, 실패 · 없음이면 Gemini 한 번.
 * 같은 `LocalCliGate`(연속 실패 · 쉬기 · 동시 상한) · 같은 격리 인자. 시도마다 원장에 `purpose: fact_extract` — 24시간 상한을 나눠 쓴다.
 * 기사 원문 · 출력 원문은 로그 · 원장에 0. 부르기는 `OneShotLlm`(에이전트 고르기와 같은 몸통, 2026-11-18 `SRV-REQ-059`)
 */
export class LlmFactExtractor implements FactExtractor {
  private readonly llm: OneShotLlm;

  constructor(
    usage: LlmUsageStore | null,
    options: { localModel?: string; run?: typeof runCli; gate?: LocalCliGate } = {}
  ) {
    this.llm = new OneShotLlm(
      { purpose: "fact_extract", system: FACT_EXTRACT_SYSTEM_INSTRUCTION, dirPrefix: "salt-fact-", maxOutputTokens: 1_200 },
      usage,
      options
    );
  }

  useLocal(local: { provider: LocalProvider; bin: string } | null): void {
    this.llm.useLocal(local);
  }

  async extract(input: { title: string; source: string }, options: { geminiAllowed: boolean }) {
    return this.llm.call(buildFactExtractPrompt(input.source), options);
  }
}
