import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { env } from "../../shared/config/env";
import { logger } from "../../shared/config/logger";
import type { ExplainProvider, FactExtractor, LlmCallRecord, LlmUsageStore } from "../domain";
import { buildFactExtractPrompt, FACT_EXTRACT_SYSTEM_INSTRUCTION } from "./factExtractPrompt";
import { errorCodeOf } from "./GeminiCoachExplainer";
import { LOCAL_CLI_TIMEOUT_MS } from "./LocalCliCoachExplainer";
import { LocalCliGate } from "./localCliGate";
import { localCliArgs, runCli, safeStderr } from "./localCliProcess";

type LocalProvider = Exclude<ExplainProvider, "gemini">;

const GEMINI_TIMEOUT_MS = 30_000;

export class FactExtractFailed extends Error {
  constructor(readonly code: string) {
    super(`사실 추출 실패(${code})`);
  }
}

/**
 * 사실 추출 LLM(F017 v4 2c) — 오늘 등락 한 줄과 같은 길: 로컬 CLI(구독 · 비용 0) 먼저, 실패 · 없음이면 Gemini 한 번.
 * 같은 `LocalCliGate`(연속 실패 · 쉬기 · 동시 상한) · 같은 격리 인자. 시도마다 원장에 `purpose: fact_extract` — 24시간 상한을 나눠 쓴다.
 * 기사 원문 · 출력 원문은 로그 · 원장에 0
 */
export class LlmFactExtractor implements FactExtractor {
  private local: { provider: LocalProvider; bin: string } | null = null;
  private readonly gemini: GoogleGenerativeAI;

  constructor(
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

  async extract(input: { title: string; source: string }, options: { geminiAllowed: boolean }) {
    const prompt = buildFactExtractPrompt(input.source);
    const local = this.local;
    if (local && this.gate.pick(local.provider) !== "gemini") {
      try {
        return await this.gate.run(local.provider, () => this.extractLocal(local, prompt));
      } catch {
        // 실패는 게이트가 셌다 — 같은 본문을 Gemini 로 한 번
      }
    }
    if (!options.geminiAllowed) throw new FactExtractFailed("gemini_blocked");
    return this.extractGemini(prompt);
  }

  private async extractLocal(local: { provider: LocalProvider; bin: string }, prompt: string) {
    const id = randomUUID();
    const requestedAt = new Date();
    const dir = await mkdtemp(join(tmpdir(), "salt-fact-"));
    let errorCode: string | null = null;
    const model = this.options.localModel ?? `${local.provider === "local_claude" ? "claude" : "codex"}-cli`;
    try {
      const outcome = await (this.options.run ?? runCli)({
        bin: local.bin,
        args: localCliArgs({ provider: local.provider, dir, system: FACT_EXTRACT_SYSTEM_INSTRUCTION, model: this.options.localModel, stream: false }),
        stdin: (local.provider === "local_codex" ? `${FACT_EXTRACT_SYSTEM_INSTRUCTION}\n\n` : "") + prompt,
        cwd: dir,
        timeoutMs: LOCAL_CLI_TIMEOUT_MS,
      });
      if (!outcome.ok) {
        errorCode = outcome.reason;
        logger.warn(`사실 추출 로컬 CLI 실패 ${local.provider} ${outcome.reason} ${safeStderr(outcome.stderr)}`);
        throw new FactExtractFailed(errorCode);
      }
      const output = local.provider === "local_codex" ? await readFile(join(dir, "last.txt"), "utf8").catch(() => "") : outcome.stdout;
      if (!output.trim()) {
        errorCode = "empty";
        throw new FactExtractFailed(errorCode);
      }
      return { output, provider: local.provider as ExplainProvider, model };
    } catch (error) {
      if (!errorCode) errorCode = "error";
      throw error instanceof FactExtractFailed ? error : new FactExtractFailed(errorCode);
    } finally {
      await this.remember({
        id, userId: null, provider: local.provider, purpose: "fact_extract", model, requestedAt,
        durationMs: Date.now() - requestedAt.getTime(), ok: errorCode === null, errorCode,
        promptTokens: null, outputTokens: null, totalTokens: null,
      });
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async extractGemini(prompt: string) {
    const requestedAt = new Date();
    const model = this.gemini.getGenerativeModel(
      {
        model: env.GEMINI_MODEL,
        systemInstruction: FACT_EXTRACT_SYSTEM_INSTRUCTION,
        generationConfig: { temperature: 0, maxOutputTokens: 1_200, responseMimeType: "application/json" },
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
        throw new FactExtractFailed(errorCode);
      }
      return { output, provider: "gemini" as const, model: env.GEMINI_MODEL };
    } catch (error) {
      if (!errorCode) errorCode = errorCodeOf(error);
      throw error instanceof FactExtractFailed ? error : new FactExtractFailed(errorCode);
    } finally {
      await this.remember({
        userId: null, provider: "gemini", purpose: "fact_extract", model: env.GEMINI_MODEL, requestedAt,
        durationMs: Date.now() - requestedAt.getTime(), ok: errorCode === null, errorCode,
        promptTokens: usage?.promptTokenCount ?? null, outputTokens: usage?.candidatesTokenCount ?? null, totalTokens: usage?.totalTokenCount ?? null,
      });
    }
  }
}
