import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { logger } from "../../shared/config/logger";
import type {
  CoachExplainer,
  CoachExplanation,
  CoachExplanationInput,
  ExplainCaller,
  ExplainHooks,
  ExplainProvider,
  ExplanationLineSection,
  LlmCallRecord,
  LlmUsageStore,
} from "../domain";
import {
  buildLineExplanationPrompt,
  createLineParser,
  LOCAL_SYSTEM_INSTRUCTION,
  NEWS_SUMMARY_MAX,
} from "./explanationPrompt";
import { findOnPath, runCli, safeStderr, type CliOutcome } from "./localCliProcess";

/**
 * 로컬 CLI 해설 — Claude Code(`claude`) · Codex(`codex`) (`SRV-REQ-050`).
 *
 * 소유자 맥에 구독 CLI 가 있으면 추가 비용 없이 더 큰 모델로 다듬는다. 하는 일은 Gemini 와 같다 — **문장만**,
 * 숫자는 프롬프트에 주입, 검증기는 유스케이스가 건다.
 *
 * ## 줄 형식 · 토큰 스트림 (FR-13)
 *
 * JSON 은 다 받아야 열린다. 로컬 CLI 는 "라벨: 한 문장" 줄로 쓰고, Claude 는 토큰 스트림(`stream-json`)이라 줄이
 * 끝날 때마다 `hooks.onLine` 으로 알린다 — 유스케이스가 그 줄을 검사해 통과하면 바로 화면으로 흘린다.
 * Codex 는 `exec` 가 토큰 스트림을 주지 않는다(2026-11-02 실측 — 끝에 한 번) → 끝나고 줄을 한꺼번에 낸다.
 *
 * ## 격리 (FR-5)
 *
 * 도구 0(Claude `--tools ""` · Codex `--sandbox read-only`), 사용자 설정 · MCP · 규칙 안 읽음, 작업 폴더는 요청마다 만든
 * 빈 임시 폴더(끝나면 지운다), env 허용 목록(`childEnv`), 프롬프트는 stdin(시스템 지시는 상수라 argv 여도 된다).
 * 재시도하지 않는다 — 실패하면 라우터가 같은 요청을 Gemini 로 한 번 보낸다(FR-7).
 */

export type LocalProvider = Exclude<ExplainProvider, "gemini">;

const BIN: Record<LocalProvider, string> = { local_claude: "claude", local_codex: "codex" };

/** 한 번 45초(FR-6) */
export const LOCAL_CLI_TIMEOUT_MS = 45_000;

export class LocalCliFailed extends Error {
  constructor(readonly code: string) {
    super(`로컬 CLI 해설 실패(${code})`);
  }
}

export interface LocalCliOptions {
  timeoutMs?: number;
  /** CLI 기본 모델을 덮는다(`COACH_LLM_LOCAL_MODEL`). 없으면 CLI 기본 */
  model?: string;
  /** 테스트가 가짜 실행기를 꽂는다 */
  run?: typeof runCli;
}

/** Claude `stream-json` 한 줄 — 쓰는 칸만 */
interface ClaudeStreamLine {
  type?: string;
  subtype?: string;
  model?: string;
  is_error?: boolean;
  event?: { type?: string; delta?: { type?: string; text?: string } };
}

export class LocalCliCoachExplainer implements CoachExplainer {
  /** 쓰는 동안 줄이 오나 — Claude 만(FR-13) */
  readonly streams: boolean;

  constructor(
    readonly provider: LocalProvider,
    private readonly bin: string,
    private readonly usage: LlmUsageStore | null = null,
    private readonly options: LocalCliOptions = {}
  ) {
    this.streams = provider === "local_claude";
  }

  private async remember(entry: LlmCallRecord): Promise<void> {
    if (!this.usage) return;
    await this.usage.record(entry).catch((error: unknown) =>
      logger.warn(`LLM 사용량 기록 실패: ${(error as Error).message}`)
    );
  }

  private args(dir: string): string[] {
    const model = this.options.model;
    if (this.provider === "local_claude") {
      return [
        "-p",
        "--output-format",
        "stream-json",
        "--include-partial-messages",
        "--verbose",
        "--system-prompt",
        LOCAL_SYSTEM_INSTRUCTION,
        "--tools",
        "",
        "--setting-sources",
        "",
        "--strict-mcp-config",
        "--no-session-persistence",
        ...(model ? ["--model", model] : []),
      ];
    }
    return [
      "exec",
      "--sandbox",
      "read-only",
      "--skip-git-repo-check",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "-o",
      join(dir, "last.txt"),
      "-C",
      dir,
      ...(model ? ["-m", model] : []),
      "-",
    ];
  }

  async explain(
    input: CoachExplanationInput,
    signal?: AbortSignal,
    caller?: ExplainCaller,
    hooks?: ExplainHooks
  ): Promise<CoachExplanation> {
    const id = randomUUID();
    const requestedAt = new Date();
    const dir = await mkdtemp(join(tmpdir(), "salt-explain-"));
    let model = this.options.model ?? `${BIN[this.provider]}-cli`;
    let errorCode: string | null = null;

    const newsCount = Math.min(NEWS_SUMMARY_MAX, (input.news ?? []).length);
    const lines: Record<ExplanationLineSection, string[]> = {
      modeReasoning: [],
      keyDrivers: [],
      risks: [],
      newsSummary: [],
    };
    const parser = createLineParser(newsCount, (line) => {
      lines[line.section].push(line.text);
      if (!signal?.aborted) hooks?.onLine?.(line);
    });

    // Claude 토큰 스트림 — JSONL 을 줄로 끊어 글자 조각만 파서에 넣는다
    let jsonl = "";
    let claudeError = false;
    const onStdout =
      this.provider === "local_claude"
        ? (chunk: string) => {
            jsonl += chunk;
            let at = jsonl.indexOf("\n");
            while (at >= 0) {
              const raw = jsonl.slice(0, at);
              jsonl = jsonl.slice(at + 1);
              at = jsonl.indexOf("\n");
              let line: ClaudeStreamLine;
              try {
                line = JSON.parse(raw) as ClaudeStreamLine;
              } catch {
                continue;
              }
              if (line.type === "system" && line.subtype === "init" && line.model) model = line.model;
              else if (line.type === "result" && line.is_error) claudeError = true;
              else if (line.type === "stream_event" && line.event?.type === "content_block_delta") {
                const text = line.event.delta?.type === "text_delta" ? line.event.delta.text : undefined;
                if (text) parser.push(text);
              }
            }
          }
        : undefined;

    try {
      const outcome: CliOutcome = await (this.options.run ?? runCli)({
        bin: this.bin,
        args: this.args(dir),
        stdin:
          (this.provider === "local_codex" ? `${LOCAL_SYSTEM_INSTRUCTION}\n\n` : "") + buildLineExplanationPrompt(input),
        cwd: dir,
        timeoutMs: this.options.timeoutMs ?? LOCAL_CLI_TIMEOUT_MS,
        signal,
        onStdout,
      });
      if (!outcome.ok) {
        errorCode = outcome.reason;
        // 원문 로깅 0 — 사유 · stderr 앞 200자(가림)만(FR-12)
        if (outcome.reason !== "aborted") {
          logger.warn(`로컬 CLI 해설 실패 ${this.provider} ${outcome.reason} ${safeStderr(outcome.stderr)}`);
        }
        throw new LocalCliFailed(outcome.reason);
      }
      if (claudeError) {
        // 로그인 풀림 · 한도 — 본문은 싣지 않는다
        errorCode = "cli_error";
        throw new LocalCliFailed(errorCode);
      }
      if (this.provider === "local_codex") {
        parser.push(await readFile(join(dir, "last.txt"), "utf8").catch(() => ""));
      }
      parser.end();

      // 모양 — 판단 줄이 없으면 해설이 아니다(근거 · 주의는 빈 칸이면 유스케이스가 템플릿으로 채운다)
      if (lines.modeReasoning.length === 0) {
        errorCode = "schema_mismatch";
        throw new LocalCliFailed(errorCode);
      }

      return {
        modeReasoning: lines.modeReasoning.join(" "),
        timeframe: "",
        keyDrivers: lines.keyDrivers.slice(0, 5),
        risks: lines.risks.slice(0, 5),
        newsSummary: lines.newsSummary.slice(0, newsCount),
        disclaimer: "",
        generatedAt: new Date().toISOString(),
        cached: false,
        provider: this.provider,
        callId: id,
      };
    } catch (error) {
      if (!errorCode) errorCode = signal?.aborted ? "aborted" : "error";
      throw error instanceof LocalCliFailed ? error : new LocalCliFailed(errorCode);
    } finally {
      // 구독이라 토큰 비용 0 — 시도 · 지연 · 실패만(FR-9)
      await this.remember({
        id,
        userId: caller?.userId ?? null,
        provider: this.provider,
        purpose: "coach_explain",
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
}

export type LocalCliMode = "auto" | "claude" | "codex" | "off";

export interface DetectedLocalCli {
  provider: LocalProvider;
  bin: string;
  version: string;
}

/**
 * 부팅 때 한 번(FR-2) — `auto` 는 `claude` → `codex` 순. `--version` 이 5초 안에 0 으로 끝나야 쓴다.
 * 계정 · 토큰은 묻지 않는다 — 로그인이 풀렸으면 첫 요청이 실패하고 Gemini 로 내려간다(FR-7)
 */
export const detectLocalCli = async (
  mode: LocalCliMode,
  run: typeof runCli = runCli,
  path = process.env.PATH ?? ""
): Promise<DetectedLocalCli | null> => {
  if (mode === "off") return null;
  const order: LocalProvider[] =
    mode === "claude" ? ["local_claude"] : mode === "codex" ? ["local_codex"] : ["local_claude", "local_codex"];
  for (const provider of order) {
    const bin = findOnPath(BIN[provider], path);
    if (!bin) continue;
    const dir = await mkdtemp(join(tmpdir(), "salt-cli-probe-"));
    try {
      const outcome = await run({ bin, args: ["--version"], stdin: "", cwd: dir, timeoutMs: 5_000 });
      if (outcome.ok) return { provider, bin, version: outcome.stdout.trim().split("\n")[0]!.slice(0, 80) };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
  return null;
};
