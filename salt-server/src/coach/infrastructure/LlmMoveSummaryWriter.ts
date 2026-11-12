import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { env } from "../../shared/config/env";
import { logger } from "../../shared/config/logger";
import {
  LOCAL_LLM_FAILURE_LIMIT,
  LOCAL_LLM_PAUSE_MS,
  type ExplainProvider,
  type LlmCallRecord,
  type LlmUsageStore,
  type MoveSummaryPrompt,
  type MoveSummaryWriter,
} from "../domain";
import { errorCodeOf } from "./GeminiCoachExplainer";
import { LOCAL_CLI_TIMEOUT_MS } from "./LocalCliCoachExplainer";
import { localCliArgs, runCli, safeStderr } from "./localCliProcess";
import { buildMoveSummaryPrompt, cleanMoveSummaryOutput, MOVE_SUMMARY_SYSTEM_INSTRUCTION } from "./moveSummaryPrompt";

type LocalProvider = Exclude<ExplainProvider, "gemini">;

/** 문장 하나 — 짧게. 재시도 없음(배치가 다음 지문 · 다음 회차에 다시 본다) */
const GEMINI_TIMEOUT_MS = 20_000;

export class MoveSummaryWriteFailed extends Error {
  constructor(readonly code: string) {
    super(`오늘 등락 한 줄 생성 실패(${code})`);
  }
}

export class MoveSummaryGeminiBlocked extends Error {
  constructor() {
    super("Gemini 토큰 상한 — 로컬 CLI 도 없음");
  }
}

/**
 * 오늘 등락 한 줄(③) LLM — F016 단계 D · `SRV-REQ-052` FR-3 · FR-6.
 *
 * 해설(`RoutingCoachExplainer`)과 같은 길: 로컬 CLI(구독 · 비용 0) 먼저, 실패 · 없음이면 Gemini 한 번. 격리 인자는 해설과 같은 것
 * (`localCliArgs`). 시도마다 LLM 사용량 원장에 `purpose: move_summary` 로 남긴다 — 24시간 상한을 해설과 나눠 쓴다.
 * 원문(프롬프트 · 응답)은 로그 · 원장에 0. 배치 하나만 부르므로 동시 실행은 1
 */
export class LlmMoveSummaryWriter implements MoveSummaryWriter {
  private failures = 0;
  private pausedUntil = 0;
  private local: { provider: LocalProvider; bin: string } | null = null;
  private readonly gemini: GoogleGenerativeAI;

  constructor(
    private readonly usage: LlmUsageStore | null,
    private readonly options: { localModel?: string; run?: typeof runCli; now?: () => number } = {}
  ) {
    this.gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  /** 부팅 감지는 비동기 — 해설 라우터와 같은 결과를 꽂는다 */
  useLocal(local: { provider: LocalProvider; bin: string } | null): void {
    this.local = local;
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  private async remember(entry: LlmCallRecord): Promise<void> {
    await this.usage?.record(entry).catch((error: unknown) => logger.warn(`LLM 사용량 기록 실패: ${(error as Error).message}`));
  }

  async write(prompt: MoveSummaryPrompt, options: { geminiAllowed: boolean }) {
    const text = buildMoveSummaryPrompt(prompt);
    if (this.local && this.now() >= this.pausedUntil) {
      try {
        const out = await this.writeLocal(this.local, text);
        this.failures = 0;
        return out;
      } catch {
        this.failures += 1;
        if (this.failures >= LOCAL_LLM_FAILURE_LIMIT) {
          this.pausedUntil = this.now() + LOCAL_LLM_PAUSE_MS;
          this.failures = 0;
          logger.warn(`오늘 등락 한 줄 — 로컬 CLI 연속 ${LOCAL_LLM_FAILURE_LIMIT}회 실패, 10분 동안 Gemini 로`);
        }
      }
    }
    if (!options.geminiAllowed) throw new MoveSummaryGeminiBlocked();
    return this.writeGemini(text);
  }

  private async writeLocal(local: { provider: LocalProvider; bin: string }, prompt: string) {
    const id = randomUUID();
    const requestedAt = new Date();
    const dir = await mkdtemp(join(tmpdir(), "salt-move-"));
    let errorCode: string | null = null;
    const model = this.options.localModel ?? `${local.provider === "local_claude" ? "claude" : "codex"}-cli`;
    try {
      const outcome = await (this.options.run ?? runCli)({
        bin: local.bin,
        args: localCliArgs({ provider: local.provider, dir, system: MOVE_SUMMARY_SYSTEM_INSTRUCTION, model: this.options.localModel, stream: false }),
        stdin: (local.provider === "local_codex" ? `${MOVE_SUMMARY_SYSTEM_INSTRUCTION}\n\n` : "") + prompt,
        cwd: dir,
        timeoutMs: LOCAL_CLI_TIMEOUT_MS,
      });
      if (!outcome.ok) {
        errorCode = outcome.reason;
        logger.warn(`오늘 등락 한 줄 로컬 CLI 실패 ${local.provider} ${outcome.reason} ${safeStderr(outcome.stderr)}`);
        throw new MoveSummaryWriteFailed(errorCode);
      }
      const raw = local.provider === "local_codex" ? await readFile(join(dir, "last.txt"), "utf8").catch(() => "") : outcome.stdout;
      const text = cleanMoveSummaryOutput(raw);
      if (!text) {
        errorCode = "empty";
        throw new MoveSummaryWriteFailed(errorCode);
      }
      return { text, provider: local.provider as ExplainProvider, model };
    } catch (error) {
      if (!errorCode) errorCode = "error";
      throw error instanceof MoveSummaryWriteFailed ? error : new MoveSummaryWriteFailed(errorCode);
    } finally {
      await this.remember({
        id,
        userId: null,
        provider: local.provider,
        purpose: "move_summary",
        model,
        requestedAt,
        durationMs: Date.now() - requestedAt.getTime(),
        ok: errorCode === null,
        errorCode,
        promptTokens: null,
        outputTokens: null,
        totalTokens: null,
      });
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async writeGemini(prompt: string) {
    const requestedAt = new Date();
    const model = this.gemini.getGenerativeModel(
      {
        model: env.GEMINI_MODEL,
        systemInstruction: MOVE_SUMMARY_SYSTEM_INSTRUCTION,
        generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
      },
      { timeout: GEMINI_TIMEOUT_MS }
    );
    let usage: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined;
    let errorCode: string | null = null;
    try {
      const response = await model.generateContent(prompt);
      usage = response.response.usageMetadata;
      const text = cleanMoveSummaryOutput(response.response.text());
      if (!text) {
        errorCode = "empty";
        throw new MoveSummaryWriteFailed(errorCode);
      }
      return { text, provider: "gemini" as const, model: env.GEMINI_MODEL };
    } catch (error) {
      if (!errorCode) errorCode = errorCodeOf(error);
      throw error instanceof MoveSummaryWriteFailed ? error : new MoveSummaryWriteFailed(errorCode);
    } finally {
      await this.remember({
        userId: null,
        provider: "gemini",
        purpose: "move_summary",
        model: env.GEMINI_MODEL,
        requestedAt,
        durationMs: Date.now() - requestedAt.getTime(),
        ok: errorCode === null,
        errorCode,
        promptTokens: usage?.promptTokenCount ?? null,
        outputTokens: usage?.candidatesTokenCount ?? null,
        totalTokens: usage?.totalTokenCount ?? null,
      });
    }
  }
}
