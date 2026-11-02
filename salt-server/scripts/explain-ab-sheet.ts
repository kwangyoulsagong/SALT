/**
 * 해설 블라인드 A/B 평가지 — FEATURE-008 FR-49 · `SRV-REQ-037` FR-15.
 *
 * 템플릿 해설과 LLM 해설(검증기를 지난 것 — 사용자가 실제로 보는 문장)을 같은 입력 20건에 만들고, 어느 쪽이 A 인지
 * 입력마다 섞어 평가지 하나 · 키 하나로 나눠 쓴다. 사람이 평가지만 보고 고른 뒤 `--score` 로 키와 맞춰 센다.
 *
 * ```bash
 * npm run explain:ab                                   # 평가지 · 키 만들기(LLM 20회 호출)
 * npm run explain:ab -- --score <평가지>               # 채운 평가지를 키와 맞춰 집계
 * npm run explain:ab -- --reuse <앞 평가지>             # LLM 을 다시 부르지 않고 앞 평가지의 LLM 문장을 지금 검증기 · 템플릿으로 다시 짠다
 * npm run explain:ab -- --provider local_claude         # 공급자별 평가지(`SRV-REQ-050` FR-11) — gemini(기본) · local_claude · local_codex
 * ```
 *
 * - 입력은 품질 테스트와 같은 픽스처(`explanationFixtures`) 앞 20건 — 판단 문장은 규칙이 만든 것, 가격 · 기사는 지어낸 값
 * - A/B 배정은 `sha256(번호)` 의 홀짝 — 결정적이라 다시 만들어도 같은 자리에 같은 쪽이 온다
 * - LLM 호출은 하나씩(무료 등급 분당 상한). 실패한 입력은 평가지에서 빼고 키에 사유를 남긴다 — 템플릿끼리 비교하지 않는다
 * - 사용량 원장에 남기지 않는다(`GeminiCoachExplainer(null)`) — 사용자 요청이 아니라 측정이다
 * - `--reuse` — 무료 할당량이 바닥난 날(2026-11-02 두 번째 평가지, 429 quota) · 검증기를 바꾼 뒤. 앞 평가지의 LLM 칸(키로 찾음)은
 *   이미 그때 검증기를 지난 문장이라, 지금 검증기에 다시 넣으면 **지금 파이프라인이 내보낼 문장**이 된다(LLM 이 매번 달리 쓰는 차이만 빼고)
 *
 * 출력: `requirements/reports/explain-ab/explain-ab-<날짜>.md`(평가지) · `explain-ab-<날짜>.key.json`(키 — 평가 뒤 연다)
 * 레이어: `scripts/**` 는 `composition.ts` 처럼 레이어 밖이다 — 운영 검증기 · 템플릿을 그대로 부른다.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CoachExplanation, CoachExplanationInput } from "../src/coach/domain";
import { templateExplanation, verifyExplanation } from "../src/coach/domain/policy/explanationTemplate";
import { explanationFixtures } from "../src/coach/domain/__tests__/fixtures/explanationFixtures";
import { GeminiCoachExplainer } from "../src/coach/infrastructure/GeminiCoachExplainer";
import { detectLocalCli, LocalCliCoachExplainer } from "../src/coach/infrastructure/LocalCliCoachExplainer";

type Provider = "gemini" | "local_claude" | "local_codex";

/** 공급자 — 운영과 같은 구현을 원장 없이(null) 부른다. 로컬 CLI 는 부팅 감지와 같은 함수로 찾는다 */
const explainerFor = async (provider: Provider) => {
  if (provider === "gemini") return new GeminiCoachExplainer(null);
  const found = await detectLocalCli(provider === "local_claude" ? "claude" : "codex");
  if (!found) throw new Error(`${provider} CLI 를 PATH 에서 찾지 못했다`);
  return new LocalCliCoachExplainer(found.provider, found.bin, null);
};

const COUNT = 20;
const OUT_DIR = join(__dirname, "..", "requirements", "reports", "explain-ab");
// 무료 등급 분당 한도 — 4.5초 간격은 다른 호출(실서버)과 겹치면 연달아 실패했다(2026-11-02 두 번째 평가지 15/20). 기본 8초
const PACE_MS = Number(process.env.EXPLAIN_AB_PACE_MS ?? 8_000);

type Side = "template" | "llm";
interface KeyRow {
  no: number;
  symbol: string;
  mode: string;
  A: Side;
  B: Side;
  llmSource?: string;
  llmDropped?: number;
  skipped?: string;
  /** 어느 공급자의 문장인가(`SRV-REQ-050` FR-11). 옛 키는 없다 — Gemini */
  provider?: Provider;
}

const sideA = (no: number): Side =>
  parseInt(createHash("sha256").update(String(no)).digest("hex").slice(-1), 16) % 2 === 0 ? "template" : "llm";

const block = (label: string, e: Pick<CoachExplanation, "modeReasoning" | "keyDrivers" | "risks" | "newsSummary">) =>
  [
    `**${label}**`,
    "",
    e.modeReasoning,
    "",
    ...(e.keyDrivers.length ? ["근거", ...e.keyDrivers.map((s) => `- ${s}`), ""] : []),
    ...(e.risks.length ? ["주의", ...e.risks.map((s) => `- ${s}`), ""] : []),
    ...(e.newsSummary.length ? ["뉴스", ...e.newsSummary.map((s) => `- ${s}`), ""] : []),
  ].join("\n");

/**
 * 평가자가 보는 입력 사실 — **해설이 받은 것 전부**. 2026-11-02 첫 평가지는 거래대금 · 기사 요약을 빠뜨려 평가자가
 * 템플릿의 "거래대금 약 3,100억 원"과 LLM 의 "거래량 10% 증가"(기사 요약의 숫자)를 지어낸 것으로 판정했다
 */
const facts = (input: CoachExplanationInput) =>
  [
    `- 종목 ${input.koreanName}(${input.symbol}) · ${input.mode === "scalp" ? "단타" : "장기"} · 현재가 ${input.currentPrice.toLocaleString("ko-KR")}원 · 24시간 변동 ${input.change24h}% · 24시간 거래대금 ${input.tradeValue24h.toLocaleString("ko-KR")}원`,
    ...input.evidence.map((e) => `- ${e.label}: ${e.value}`),
    ...(input.news ?? []).map(
      (n) => `- 기사: ${n.title}${n.source ? ` (${n.source})` : ""}${n.summary ? ` — 요약: ${n.summary}` : ""}${n.sentiment ? ` [${n.sentiment}]` : ""}`
    ),
  ].join("\n");

/** 앞 평가지의 한 쪽 칸을 해설 모양으로 되읽는다(`block` 의 역) */
const parseSide = (section: string, label: "A" | "B"): Pick<CoachExplanation, "modeReasoning" | "keyDrivers" | "risks" | "newsSummary"> => {
  const start = section.indexOf(`**${label}**`);
  const end = label === "A" ? section.indexOf("**B**") : section.indexOf("선택:");
  const lines = section.slice(start + label.length + 4, end).split("\n").map((l) => l.trim());
  const out = { modeReasoning: "", keyDrivers: [] as string[], risks: [] as string[], newsSummary: [] as string[] };
  let list: "keyDrivers" | "risks" | "newsSummary" | null = null;
  for (const line of lines) {
    if (!line) continue;
    if (line === "근거") list = "keyDrivers";
    else if (line === "주의") list = "risks";
    else if (line === "뉴스") list = "newsSummary";
    else if (line.startsWith("- ") && list) out[list].push(line.slice(2));
    else if (!list) out.modeReasoning = out.modeReasoning ? `${out.modeReasoning} ${line}` : line;
  }
  return out;
};

const reuseLlm = (prevSheet: string): Map<number, CoachExplanation> => {
  const text = readFileSync(prevSheet, "utf8");
  const key: KeyRow[] = JSON.parse(readFileSync(prevSheet.replace(/\.md$/, ".key.json"), "utf8"));
  const out = new Map<number, CoachExplanation>();
  for (const section of text.split(/^## /m).slice(1)) {
    const no = Number(section.match(/^(\d+)\./)?.[1]);
    const row = key.find((r) => r.no === no);
    if (!row || row.skipped) continue;
    const side = parseSide(section, row.A === "llm" ? "A" : "B");
    out.set(no, { ...side, timeframe: "", disclaimer: "", generatedAt: new Date().toISOString(), cached: true });
  }
  return out;
};

const generate = async (reuseFrom?: string, provider: Provider = "gemini") => {
  const today = new Date().toISOString().slice(0, 10);
  const explainer = await explainerFor(provider);
  const reused = reuseFrom ? reuseLlm(reuseFrom) : null;
  const inputs = explanationFixtures(COUNT);
  const sheet: string[] = [
    `# 해설 블라인드 A/B 평가지 — ${today}`,
    "",
    "FEATURE-008 FR-49 · `SRV-REQ-037` FR-15. 입력마다 A · B 중 **읽기 쉽고 사실과 맞는 쪽**을 고른다.",
    "어느 쪽이 템플릿 · LLM 인지는 키 파일에 있다 — **평가가 끝날 때까지 열지 않는다.**",
    "",
    "- `선택:` 뒤에 `A` · `B` · `같음` 중 하나",
    "- `사실과 다른 문장:` 뒤에 입력 사실과 다른 문장이 있으면 옮겨 적는다(없으면 비워 둔다)",
    "",
  ];
  const key: KeyRow[] = [];

  for (const [i, input] of inputs.entries()) {
    const no = i + 1;
    const A = sideA(no);
    const row: KeyRow = { no, symbol: input.symbol, mode: input.mode, A, B: A === "template" ? "llm" : "template", provider };
    const now = new Date();
    const template = templateExplanation(input, now);
    try {
      const llm = reused ? reused.get(no) : await explainer.explain(input);
      if (!llm) throw Object.assign(new Error("앞 평가지에 LLM 칸 없음"), { name: "NotInPrevious" });
      const verified = verifyExplanation(llm, input, now);
      row.llmSource = verified.source;
      row.llmDropped = verified.dropped.length;
      const bySide = { template, llm: verified.explanation };
      sheet.push(
        `## ${no}. ${input.symbol} ${input.mode === "scalp" ? "단타" : "장기"}`,
        "",
        "<details><summary>입력 사실</summary>",
        "",
        facts(input),
        "",
        "</details>",
        "",
        block("A", bySide[row.A]),
        block("B", bySide[row.B]),
        "선택: ",
        "",
        "사실과 다른 문장: ",
        "",
        "---",
        ""
      );
      console.log(`${no}/${COUNT} ${input.symbol} ${input.mode} — LLM ${verified.source} · 버린 문장 ${verified.dropped.length}`);
    } catch (error) {
      row.skipped = (error as Error).name || "error";
      console.log(`${no}/${COUNT} ${input.symbol} ${input.mode} — LLM 실패(${row.skipped}), 평가지에서 뺌`);
    }
    key.push(row);
    // 간격은 Gemini 무료 등급 분당 상한 때문 — 로컬 CLI 는 구독이라 기다리지 않는다
    if (!reused && provider === "gemini" && i < inputs.length - 1) await new Promise((r) => setTimeout(r, PACE_MS));
  }

  mkdirSync(OUT_DIR, { recursive: true });
  // 같은 날 두 번째부터는 `-2` · `-3` — 앞 평가지(평가가 끝났을 수 있다)를 덮지 않는다
  let base = provider === "gemini" ? `explain-ab-${today}` : `explain-ab-${today}-${provider}`;
  for (let n = 2; existsSync(join(OUT_DIR, `${base}.md`)); n += 1) base = `explain-ab-${today}-${n}`;
  const sheetPath = join(OUT_DIR, `${base}.md`);
  writeFileSync(sheetPath, sheet.join("\n"));
  writeFileSync(join(OUT_DIR, `${base}.key.json`), JSON.stringify(key, null, 2) + "\n");
  console.log(`평가지 ${sheetPath}`);
};

const score = (sheetPath: string) => {
  const text = readFileSync(sheetPath, "utf8");
  const key: KeyRow[] = JSON.parse(readFileSync(sheetPath.replace(/\.md$/, ".key.json"), "utf8"));
  const picks = new Map<number, string>();
  const factIssues = new Map<number, string>();
  for (const section of text.split(/^## /m).slice(1)) {
    const no = Number(section.match(/^(\d+)\./)?.[1]);
    // 줄 안에서만 본다 — `\s` 는 줄바꿈을 넘어 빈 칸 다음 줄(`---`)을 답으로 읽었다
    const pick = section.match(/^선택:[ \t]*(A|B|같음)[ \t]*$/m)?.[1];
    const issue = section.match(/^사실과 다른 문장:[ \t]*(\S.*)$/m)?.[1]?.trim();
    if (pick) picks.set(no, pick);
    if (issue) factIssues.set(no, issue);
  }
  const tally = { template: 0, llm: 0, same: 0, unrated: 0 };
  for (const row of key.filter((r) => !r.skipped)) {
    const p = picks.get(row.no);
    if (!p) tally.unrated += 1;
    else if (p === "같음") tally.same += 1;
    else tally[p === "A" ? row.A : row.B] += 1;
  }
  console.log(JSON.stringify({ ...tally, factIssues: Object.fromEntries(factIssues) }, null, 2));
};

const scoreAt = process.argv.indexOf("--score");
if (scoreAt >= 0) score(process.argv[scoreAt + 1]!);
else {
  const reuseAt = process.argv.indexOf("--reuse");
  const providerAt = process.argv.indexOf("--provider");
  const provider = (providerAt >= 0 ? process.argv[providerAt + 1] : "gemini") as Provider;
  if (!["gemini", "local_claude", "local_codex"].includes(provider)) throw new Error(`모르는 공급자: ${provider}`);
  void generate(reuseAt >= 0 ? process.argv[reuseAt + 1] : undefined, provider);
}
