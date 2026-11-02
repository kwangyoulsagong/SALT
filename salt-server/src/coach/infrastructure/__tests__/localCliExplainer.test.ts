import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import type { CoachExplainer, CoachExplanation, CoachExplanationInput, LlmCallRecord, LlmUsageStore } from "../../domain";
import { createLineParser } from "../explanationPrompt";
import { detectLocalCli, LocalCliCoachExplainer } from "../LocalCliCoachExplainer";
import { childEnv, runCli } from "../localCliProcess";
import { RoutingCoachExplainer } from "../RoutingCoachExplainer";

/**
 * 로컬 CLI 해설 (`SRV-REQ-050` FR-2 · 5 · 6 · 7 · 9 · 13). 진짜 CLI 대신 **같은 인자를 받는 가짜 실행 파일**을 띄운다 —
 * 자식 프로세스 · 그룹 종료 · env · stdin 은 실제 그대로 검사된다.
 */

const root = mkdtempSync(join(tmpdir(), "salt-fake-cli-"));
after(() => rmSync(root, { recursive: true, force: true }));

/** `name` 이라는 실행 파일 — 본문은 node 스크립트 */
const fakeBin = (name: string, body: string): string => {
  const dir = mkdtempSync(join(root, "bin-"));
  const file = join(dir, name);
  writeFileSync(file, `#!/usr/bin/env node\n${body}`);
  chmodSync(file, 0o755);
  return file;
};

/** 가짜 Claude — stdin 을 다 읽고 `lines` 를 stream-json 토큰 조각으로 흘린다. 받은 것 · 환경을 `report` 파일에 남긴다 */
const fakeClaude = (lines: string[], report: string, opts: { delayMs?: number; error?: boolean } = {}) =>
  fakeBin(
    "claude",
    `
const fs = require("fs");
let stdin = "";
process.stdin.on("data", (c) => (stdin += c));
process.stdin.on("end", async () => {
  fs.writeFileSync(${JSON.stringify(report)}, JSON.stringify({ argv: process.argv.slice(2), env: process.env, cwd: process.cwd(), stdin }));
  const out = (o) => process.stdout.write(JSON.stringify(o) + "\\n");
  out({ type: "system", subtype: "init", model: "claude-test" });
  const text = ${JSON.stringify(lines.join("\n"))};
  for (let i = 0; i < text.length; i += 7) {
    out({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: text.slice(i, i + 7) } } });
    await new Promise((r) => setTimeout(r, ${opts.delayMs ?? 0}));
  }
  out({ type: "result", subtype: "success", is_error: ${opts.error ? "true" : "false"} });
});
`
  );

const input: CoachExplanationInput = {
  symbol: "BTC",
  koreanName: "비트코인",
  mode: "long_term",
  currentPrice: 100_000_000,
  change24h: -1.5,
  tradeValue24h: 5e11,
  evidence: [{ label: "RSI(14)", value: "30" }],
  stance: "candidate",
  news: [{ title: "기사 하나" }],
};

const ledger = () => {
  const rows: LlmCallRecord[] = [];
  const store: LlmUsageStore = {
    record: async (row) => void rows.push(row),
    markDropped: async () => undefined,
    usageSince: async () => ({ user: { calls: 0, tokens: 0 }, total: { calls: 0, tokens: 0 } }),
  };
  return { rows, store };
};

describe("줄 형식 파서", () => {
  it("조각이 줄 중간에서 끊겨도 줄 단위로 · 라벨 없는 줄 · 넘는 뉴스 번호는 버린다", () => {
    const got: Array<[string, string]> = [];
    const parser = createLineParser(1, (l) => got.push([l.section, l.text]));
    for (const chunk of ["판단: 첫 문", "장이에요.\n머리말\n근거: 둘", "째예요.\n뉴스1: 기사예요.\n뉴스2: 지어낸 줄\n주의: 끝"]) parser.push(chunk);
    parser.end();
    assert.deepEqual(got, [
      ["modeReasoning", "첫 문장이에요."],
      ["keyDrivers", "둘째예요."],
      ["newsSummary", "기사예요."],
      ["risks", "끝"],
    ]);
  });
});

describe("runCli — 격리 · 상한 (FR-5 · FR-6)", () => {
  it("자식 env 는 허용 목록뿐 — 서버 비밀 0", () => {
    const env = childEnv({ PATH: "/bin", HOME: "/h", DATABASE_URL: "x", JWT_SECRET: "y", GEMINI_API_KEY: "z", USER: "u" });
    assert.deepEqual(Object.keys(env).sort(), ["HOME", "LANG", "PATH", "USER"]);
  });

  it("시간 초과면 그룹째 끈다 — 손자까지 고아 0", async () => {
    const pidFile = join(root, "grandchild.pid");
    const bin = fakeBin(
      "hang",
      `
const { spawn } = require("child_process");
const g = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
require("fs").writeFileSync(${JSON.stringify(pidFile)}, String(g.pid));
setInterval(() => {}, 1000);
`
    );
    const outcome = await runCli({ bin, args: [], stdin: "", cwd: root, timeoutMs: 1_500 });
    assert.deepEqual(outcome.ok ? "ok" : outcome.reason, "timeout");
    const pid = Number(readFileSync(pidFile, "utf8"));
    await new Promise((r) => setTimeout(r, 200));
    assert.throws(() => process.kill(pid, 0), "손자 프로세스가 남아 있다");
  });

  it("요청 중단 → 3초 안에 끝난다", async () => {
    const bin = fakeBin("slow", `setInterval(() => {}, 1000);`);
    const controller = new AbortController();
    const started = Date.now();
    setTimeout(() => controller.abort(), 100);
    const outcome = await runCli({ bin, args: [], stdin: "", cwd: root, timeoutMs: 60_000, signal: controller.signal });
    assert.equal(outcome.ok ? "ok" : outcome.reason, "aborted");
    assert.ok(Date.now() - started < 3_000);
  });

  it("SIGTERM 을 무시해도 3초 뒤 SIGKILL", async () => {
    const bin = fakeBin("stubborn", `process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);`);
    const started = Date.now();
    const outcome = await runCli({ bin, args: [], stdin: "", cwd: root, timeoutMs: 200 });
    assert.equal(outcome.ok ? "ok" : outcome.reason, "timeout");
    assert.ok(Date.now() - started < 5_000);
  });
});

describe("LocalCliCoachExplainer (가짜 Claude)", () => {
  it("줄을 쓰는 동안 알리고 · 프롬프트는 stdin 에만 · 작업 폴더는 끝나면 없다 · 원장에 local_claude 토큰 0", async () => {
    const report = join(root, "claude-report.json");
    const bin = fakeClaude(["판단: RSI(14)가 30이에요.", "근거: 과열은 아니에요.", "주의: 변동이 커요.", "뉴스1: 기사 요약이에요."], report);
    const { rows, store } = ledger();
    const lines: string[] = [];
    const providers: Array<[string, boolean]> = [];
    const explainer = new LocalCliCoachExplainer("local_claude", bin, store);
    const result = await explainer.explain(input, undefined, { userId: "u1" }, {
      onLine: (l) => lines.push(`${l.section}:${l.text}`),
      onProvider: (p, s) => providers.push([p, s]),
    });

    assert.deepEqual(lines, [
      "modeReasoning:RSI(14)가 30이에요.",
      "keyDrivers:과열은 아니에요.",
      "risks:변동이 커요.",
      "newsSummary:기사 요약이에요.",
    ]);
    assert.equal(result.provider, "local_claude");
    assert.equal(result.modeReasoning, "RSI(14)가 30이에요.");

    const seen = JSON.parse(readFileSync(report, "utf8")) as { argv: string[]; env: Record<string, string>; cwd: string; stdin: string };
    assert.ok(seen.stdin.includes("비트코인"), "프롬프트는 stdin 으로");
    assert.ok(!seen.argv.some((a) => a.includes("비트코인")), "프롬프트가 argv 에 있다");
    assert.ok(seen.argv.includes("--tools") && seen.argv[seen.argv.indexOf("--tools") + 1] === "", "도구 0");
    for (const secret of ["DATABASE_URL", "JWT_SECRET", "GEMINI_API_KEY"]) assert.equal(seen.env[secret], undefined);
    assert.ok(!existsSync(seen.cwd), "작업 폴더가 남았다");

    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.provider, "local_claude");
    assert.equal(rows[0]!.model, "claude-test");
    assert.equal(rows[0]!.ok, true);
    assert.equal(rows[0]!.totalTokens, null);
  });

  it("판단 줄이 없으면 모양 불일치 · CLI 가 is_error 면 실패(로그인 풀림)", async () => {
    const { rows, store } = ledger();
    const noJudgment = new LocalCliCoachExplainer("local_claude", fakeClaude(["근거: 하나"], join(root, "r1.json")), store);
    await assert.rejects(noJudgment.explain(input), /schema_mismatch/);
    const loggedOut = new LocalCliCoachExplainer("local_claude", fakeClaude(["판단: 문장."], join(root, "r2.json"), { error: true }), store);
    await assert.rejects(loggedOut.explain(input), /cli_error/);
    assert.deepEqual(rows.map((r) => r.errorCode), ["schema_mismatch", "cli_error"]);
  });

  it("부팅 감지 — PATH 에 없으면 null · off 면 찾지 않는다", async () => {
    assert.equal(await detectLocalCli("auto", runCli, "/nonexistent"), null);
    const bin = fakeBin("codex", `console.log("codex-cli 9.9.9")`);
    const found = await detectLocalCli("auto", runCli, join(bin, ".."));
    assert.deepEqual(found && { provider: found.provider, version: found.version }, { provider: "local_codex", version: "codex-cli 9.9.9" });
    assert.equal(await detectLocalCli("off", runCli, join(bin, "..")), null);
  });
});

describe("RoutingCoachExplainer (FR-3 · 6 · 7)", () => {
  const explanation = (provider: CoachExplanation["provider"]): CoachExplanation => ({
    modeReasoning: "문장.",
    timeframe: "",
    keyDrivers: [],
    risks: [],
    newsSummary: [],
    disclaimer: "",
    generatedAt: "",
    cached: false,
    provider,
  });
  const fake = (provider: "local_claude", fail = false) => {
    let calls = 0;
    const local = {
      provider,
      streams: true,
      get calls() {
        return calls;
      },
      explain: async () => {
        calls += 1;
        if (fail) throw new Error("cli down");
        return explanation(provider);
      },
    };
    return local;
  };
  const gemini = (): CoachExplainer & { calls: number } => {
    const g = { calls: 0, explain: async () => (g.calls++, explanation("gemini")) };
    return g;
  };
  const owner = { userId: "u", email: "owner@salt.test", client: "web" as const };

  it("허용 사용자 · 웹 → 로컬 · 같은 요청 모바일 → Gemini", async () => {
    const router = new RoutingCoachExplainer(fake("local_claude"), gemini(), { localUsers: ["owner@salt.test"] });
    assert.equal((await router.explain(input, undefined, owner)).provider, "local_claude");
    assert.equal((await router.explain(input, undefined, { ...owner, client: "mobile" })).provider, "gemini");
    assert.equal((await router.explain(input, undefined, { ...owner, email: "x@salt.test" })).provider, "gemini");
  });

  it("로컬 실패 → 같은 요청 Gemini 한 번 · 연속 3번이면 10분 쉼", async () => {
    let now = 0;
    const local = fake("local_claude", true);
    const g = gemini();
    const providers: string[] = [];
    const router = new RoutingCoachExplainer(local, g, { localUsers: ["owner@salt.test"], now: () => now });
    for (let i = 0; i < 4; i += 1) {
      const r = await router.explain(input, undefined, owner, { onProvider: (p) => providers.push(p) });
      assert.equal(r.provider, "gemini");
    }
    assert.equal(local.calls, 3, "넷째는 쉬는 중이라 로컬을 부르지 않는다");
    assert.deepEqual(providers.slice(0, 2), ["local_claude", "gemini"]);
    now = 10 * 60 * 1000 + 1;
    await router.explain(input, undefined, owner);
    assert.equal(local.calls, 4, "10분 뒤 다시 고른다");
  });

  it("동시 상한 2 — 셋째는 Gemini · Gemini 토큰 상한이면 로컬만", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow = { provider: "local_claude" as const, streams: true, explain: async () => (await gate, explanation("local_claude")) };
    const router = new RoutingCoachExplainer(slow, gemini(), { localUsers: ["owner@salt.test"] });
    const a = router.explain(input, undefined, owner);
    const b = router.explain(input, undefined, owner);
    assert.equal((await router.explain(input, undefined, owner)).provider, "gemini");
    release();
    await Promise.all([a, b]);

    const noGemini = new RoutingCoachExplainer(null, gemini(), { localUsers: [] });
    await assert.rejects(noGemini.explain(input, undefined, { ...owner, geminiAllowed: false }), /Gemini 토큰 상한/);
  });
});
