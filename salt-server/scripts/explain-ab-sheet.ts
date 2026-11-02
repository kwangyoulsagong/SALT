/**
 * 해설 블라인드 A/B 평가지 — FEATURE-008 FR-49 · `SRV-REQ-037` FR-15.
 *
 * 템플릿 해설과 LLM 해설(검증기를 지난 것 — 사용자가 실제로 보는 문장)을 같은 입력 20건에 만들고, 어느 쪽이 A 인지
 * 입력마다 섞어 평가지 하나 · 키 하나로 나눠 쓴다. 사람이 평가지만 보고 고른 뒤 `--score` 로 키와 맞춰 센다.
 *
 * ```bash
 * npm run explain:ab                                   # 평가지 · 키 만들기(LLM 20회 호출)
 * npm run explain:ab -- --score <평가지>               # 채운 평가지를 키와 맞춰 집계
 * ```
 *
 * - 입력은 품질 테스트와 같은 픽스처(`explanationFixtures`) 앞 20건 — 판단 문장은 규칙이 만든 것, 가격 · 기사는 지어낸 값
 * - A/B 배정은 `sha256(번호)` 의 홀짝 — 결정적이라 다시 만들어도 같은 자리에 같은 쪽이 온다
 * - LLM 호출은 하나씩(무료 등급 분당 상한). 실패한 입력은 평가지에서 빼고 키에 사유를 남긴다 — 템플릿끼리 비교하지 않는다
 * - 사용량 원장에 남기지 않는다(`GeminiCoachExplainer(null)`) — 사용자 요청이 아니라 측정이다
 *
 * 출력: `requirements/reports/explain-ab/explain-ab-<날짜>.md`(평가지) · `explain-ab-<날짜>.key.json`(키 — 평가 뒤 연다)
 * 레이어: `scripts/**` 는 `composition.ts` 처럼 레이어 밖이다 — 운영 검증기 · 템플릿을 그대로 부른다.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CoachExplanation, CoachExplanationInput } from "../src/coach/domain";
import { templateExplanation, verifyExplanation } from "../src/coach/domain/policy/explanationTemplate";
import { explanationFixtures } from "../src/coach/domain/__tests__/fixtures/explanationFixtures";
import { GeminiCoachExplainer } from "../src/coach/infrastructure/GeminiCoachExplainer";

const COUNT = 20;
const OUT_DIR = join(__dirname, "..", "requirements", "reports", "explain-ab");
const PACE_MS = 4_500;

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

const facts = (input: CoachExplanationInput) =>
  [
    `- 종목 ${input.koreanName}(${input.symbol}) · ${input.mode === "scalp" ? "단타" : "장기"} · 현재가 ${input.currentPrice.toLocaleString("ko-KR")}원 · 24시간 ${input.change24h}%`,
    ...input.evidence.map((e) => `- ${e.label}: ${e.value}`),
    ...(input.news ?? []).map((n) => `- 기사: ${n.title}${n.source ? ` (${n.source})` : ""}`),
  ].join("\n");

const generate = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const explainer = new GeminiCoachExplainer(null);
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
    const row: KeyRow = { no, symbol: input.symbol, mode: input.mode, A, B: A === "template" ? "llm" : "template" };
    const now = new Date();
    const template = templateExplanation(input, now);
    try {
      const llm = await explainer.explain(input);
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
    if (i < inputs.length - 1) await new Promise((r) => setTimeout(r, PACE_MS));
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const sheetPath = join(OUT_DIR, `explain-ab-${today}.md`);
  writeFileSync(sheetPath, sheet.join("\n"));
  writeFileSync(join(OUT_DIR, `explain-ab-${today}.key.json`), JSON.stringify(key, null, 2) + "\n");
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
else void generate();
