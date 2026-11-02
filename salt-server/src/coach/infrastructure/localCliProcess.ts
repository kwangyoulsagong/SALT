import { spawn } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";

/**
 * 로컬 CLI 프로세스 실행 (`SRV-REQ-050` FR-5 · FR-6).
 *
 * - 프롬프트는 **stdin** 으로만 — argv 는 `ps` 로 누구나 본다
 * - env 는 허용 목록만 — 서버 비밀(`DATABASE_URL` · `JWT_SECRET` · `GEMINI_API_KEY`)이 자식에게 가지 않는다.
 *   `USER` · `LOGNAME` · `TMPDIR` 은 맥 키체인에서 CLI 로그인을 찾는 데 필요하다(2026-11-02 실측 — 없으면 "Not logged in")
 * - 자식은 **새 프로세스 그룹**으로 띄운다 — CLI 가 낳은 손자까지 그룹째 끈다. 고아 0(FR-6)
 */

/** 자식에게 넘기는 env 이름 — 이것 말고는 없다 */
export const CHILD_ENV_KEYS = ["PATH", "HOME", "LANG", "USER", "LOGNAME", "TMPDIR"] as const;

export const childEnv = (source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {};
  for (const key of CHILD_ENV_KEYS) if (source[key]) env[key] = source[key];
  if (!env.LANG) env.LANG = "ko_KR.UTF-8";
  return env;
};

/** SIGTERM 뒤 이만큼 기다렸다 SIGKILL(FR-6) */
export const KILL_GRACE_MS = 3_000;

export interface CliRun {
  bin: string;
  args: string[];
  stdin: string;
  cwd: string;
  timeoutMs: number;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  /** stdout 조각이 올 때마다 — 토큰 스트림을 끝까지 기다리지 않고 읽는다 */
  onStdout?: (chunk: string) => void;
}

export type CliOutcome =
  | { ok: true; stdout: string; stderr: string }
  | { ok: false; reason: "timeout" | "aborted" | "spawn_error" | `exit_${number}`; stderr: string };

/** stdout · stderr 상한 — CLI 가 폭주해도 서버 메모리를 먹지 않게 */
const OUTPUT_MAX = 1_000_000;

export const runCli = (run: CliRun): Promise<CliOutcome> =>
  new Promise((resolve) => {
    if (run.signal?.aborted) return resolve({ ok: false, reason: "aborted", stderr: "" });

    const child = spawn(run.bin, run.args, {
      cwd: run.cwd,
      env: run.env ?? childEnv(),
      stdio: ["pipe", "pipe", "pipe"],
      detached: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let killTimer: NodeJS.Timeout | undefined;
    let stopReason: "timeout" | "aborted" | null = null;

    /** 그룹째 끈다 — 이미 끝났으면 조용히 넘어간다 */
    const killGroup = (sig: NodeJS.Signals) => {
      if (child.pid === undefined) return;
      try {
        process.kill(-child.pid, sig);
      } catch {
        /* 이미 없다 */
      }
    };
    const stop = (reason: "timeout" | "aborted") => {
      if (stopReason) return;
      stopReason = reason;
      killGroup("SIGTERM");
      killTimer = setTimeout(() => killGroup("SIGKILL"), KILL_GRACE_MS);
      killTimer.unref();
    };

    const timer = setTimeout(() => stop("timeout"), run.timeoutMs);
    const onAbort = () => stop("aborted");
    run.signal?.addEventListener("abort", onAbort, { once: true });

    const finish = (outcome: CliOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      run.signal?.removeEventListener("abort", onAbort);
      resolve(outcome);
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      if (stdout.length < OUTPUT_MAX) stdout += chunk;
      if (!stopReason) run.onStdout?.(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < OUTPUT_MAX) stderr += chunk.toString("utf8");
    });
    child.on("error", () => finish({ ok: false, reason: "spawn_error", stderr }));
    child.on("close", (code) => {
      // 그룹 안에 남은 손자가 있으면 같이 끈다(정상 종료여도)
      killGroup("SIGKILL");
      if (killTimer) clearTimeout(killTimer);
      if (stopReason) return finish({ ok: false, reason: stopReason, stderr });
      if (code === 0) return finish({ ok: true, stdout, stderr });
      finish({ ok: false, reason: `exit_${code ?? -1}`, stderr });
    });

    // stdin 이 닫히기 전에 자식이 죽으면 EPIPE — 오류는 `close` 가 판정한다
    child.stdin.on("error", () => undefined);
    child.stdin.end(run.stdin, "utf8");
  });

/** PATH 에서 실행 파일을 찾는다(셸 없이 — `which` 를 부르지 않는다) */
export const findOnPath = (bin: string, path = process.env.PATH ?? ""): string | null => {
  for (const dir of path.split(delimiter)) {
    if (!dir) continue;
    const full = join(dir, bin);
    try {
      accessSync(full, constants.X_OK);
      return full;
    } catch {
      /* 다음 */
    }
  }
  return null;
};

/**
 * 로그에 실을 stderr — 첫 200자 · 토큰처럼 보이는 것 가림(FR-12). Codex 는 stderr 에 프롬프트를 되풀이한다
 * (`user` 줄 뒤) — 그 앞에서 자른다
 */
export const safeStderr = (stderr: string): string =>
  stderr
    .split(/\nuser\n/)[0]!
    .slice(0, 200)
    .replace(/(sk-[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{10,}|[A-Za-z0-9_-]{32,})/g, "***")
    .replace(/\s+/g, " ")
    .trim();
