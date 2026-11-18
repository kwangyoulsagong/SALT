import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { env } from "../../shared/config/env";
import { logger } from "../../shared/config/logger";
import type { ExplainProvider, LlmCallRecord, LlmUsageStore } from "../domain";
import { errorCodeOf } from "./GeminiCoachExplainer";
import { LOCAL_CLI_TIMEOUT_MS } from "./LocalCliCoachExplainer";
import { LocalCliGate } from "./localCliGate";
import { localCliArgs, runCli, safeStderr } from "./localCliProcess";

type LocalProvider = Exclude<ExplainProvider, "gemini">;

const GEMINI_TIMEOUT_MS = 30_000;

export class OneShotLlmFailed extends Error {
  constructor(readonly code: string) {
    super(`LLM 한 번 부르기 실패(${code})`);
  }
}

export interface OneShotLlmSpec {
  /** 사용량 원장의 용도 — 24시간 상한을 나눠 쓴다 */
  purpose: LlmCallRecord["purpose"];
  system: string;
  /** 임시 폴더 접두 */
  dirPrefix: string;
  maxOutputTokens: number;
}

/**
 * 문장 스트림이 아닌 **한 번 부르고 원문을 받는** LLM(사실 추출 F017 v4 2c · 에이전트 고르기 O3 `SRV-REQ-059`) —
 * 로컬 CLI(구독 · 비용 0) 먼저, 실패 · 없음이면 Gemini 한 번. 같은 `LocalCliGate`(연속 실패 · 쉬기 · 동시 상한) · 같은 격리 인자(도구 0).
 * 시도마다 원장에 `spec.purpose`. 입력 원문 · 출력 원문은 로그 · 원장에 0. 답 검사는 부르는 쪽(도메인)
 */
export class OneShotLlm {
  private local: { provider: LocalProvider; bin: string } | null = null;
  private readonly gemini: GoogleGenerativeAI;

  constructor(
    private readonly spec: OneShotLlmSpec,
    private readonly usage: LlmUsageStore | null,
    private readonly options: { localModel?: string; run?: typeof runCli; gate?: LocalCliGate } = {},
    private readonly gate: LocalCliGate = options.gate ?? new LocalCliGate()
  ) {
    this.gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  useLocal(local: { provider: LocalProvider; bin: string } | null): void {
    this.local = local;
  }

  private async remember(entry: LlmCallRecord): Promise<void> {
    await this.usage?.record(entry).catch((error: unknown) => logger.warn(`LLM 사용량 기록 실패: ${(error as Error).message}`));
  }

  async call(prompt: string, options: { geminiAllowed: boolean }): Promise<{ output: string; provider: ExplainProvider; model: string }> {
    const local = this.local;
    if (local && this.gate.pick(local.provider) !== "gemini") {
      try {
        return await this.gate.run(local.provider, () => this.callLocal(local, prompt));
      } catch {
        // 실패는 게이트가 셌다 — 같은 입력을 Gemini 로 한 번
      }
    }
    if (!options.geminiAllowed) throw new OneShotLlmFailed("gemini_blocked");
    return this.callGemini(prompt);
  }

  private async callLocal(local: { provider: LocalProvider; bin: string }, prompt: string) {
    const id = randomUUID();
    const requestedAt = new Date();
    const dir = await mkdtemp(join(tmpdir(), this.spec.dirPrefix));
    let errorCode: string | null = null;
    const model = this.options.localModel ?? `${local.provider === "local_claude" ? "claude" : "codex"}-cli`;
    try {
      const outcome = await (this.options.run ?? runCli)({
        bin: local.bin,
        args: localCliArgs({ provider: local.provider, dir, system: this.spec.system, model: this.options.localModel, stream: false }),
        stdin: (local.provider === "local_codex" ? `${this.spec.system}\n\n` : "") + prompt,
        cwd: dir,
        timeoutMs: LOCAL_CLI_TIMEOUT_MS,
      });
      if (!outcome.ok) {
        errorCode = outcome.reason;
        logger.warn(`${this.spec.purpose} 로컬 CLI 실패 ${local.provider} ${outcome.reason} ${safeStderr(outcome.stderr)}`);
        throw new OneShotLlmFailed(errorCode);
      }
      const output = local.provider === "local_codex" ? await readFile(join(dir, "last.txt"), "utf8").catch(() => "") : outcome.stdout;
      if (!output.trim()) {
        errorCode = "empty";
        throw new OneShotLlmFailed(errorCode);
      }
      return { output, provider: local.provider as ExplainProvider, model };
    } catch (error) {
      if (!errorCode) errorCode = "error";
      throw error instanceof OneShotLlmFailed ? error : new OneShotLlmFailed(errorCode);
    } finally {
      await this.remember({
        id, userId: null, provider: local.provider, purpose: this.spec.purpose, model, requestedAt,
        durationMs: Date.now() - requestedAt.getTime(), ok: errorCode === null, errorCode,
        promptTokens: null, outputTokens: null, totalTokens: null,
      });
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async callGemini(prompt: string) {
    const requestedAt = new Date();
    const model = this.gemini.getGenerativeModel(
      {
        model: env.GEMINI_MODEL,
        systemInstruction: this.spec.system,
        generationConfig: { temperature: 0, maxOutputTokens: this.spec.maxOutputTokens, responseMimeType: "application/json" },
      },
      { timeout: GEMINI_TIMEOUT_MS }
    );
    let usage: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined;
    let errorCode: string | null = null;
    try {
      const response = await model.generateContent(prompt);
      usage = response.response.usageMetadata;
      const output = response.response.text();
      if (!output.trim()) {
        errorCode = "empty";
        throw new OneShotLlmFailed(errorCode);
      }
      return { output, provider: "gemini" as const, model: env.GEMINI_MODEL };
    } catch (error) {
      if (!errorCode) errorCode = errorCodeOf(error);
      throw error instanceof OneShotLlmFailed ? error : new OneShotLlmFailed(errorCode);
    } finally {
      await this.remember({
        userId: null, provider: "gemini", purpose: this.spec.purpose, model: env.GEMINI_MODEL, requestedAt,
        durationMs: Date.now() - requestedAt.getTime(), ok: errorCode === null, errorCode,
        promptTokens: usage?.promptTokenCount ?? null, outputTokens: usage?.candidatesTokenCount ?? null, totalTokens: usage?.totalTokenCount ?? null,
      });
    }
  }
}
