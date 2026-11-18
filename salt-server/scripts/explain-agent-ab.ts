/**
 * 에이전트 해설 블라인드 A/B 평가지 — `FC-REQ-023` FR-6 · `SRV-REQ-059` FR-6 · FEATURE-008 FR-49.
 *
 * 같은 실데이터 입력 20건(국내 5종목 · 코인 5종목 × 단타 · 장기)에 세 해설을 만든다 — 템플릿 · 지금 운영 해설(도구 없이 같은 작성기) ·
 * 에이전트(고르기 → 도구 사실 → 같은 작성기 · 같은 검증기). 평가지 둘:
 *   ① 템플릿 vs 에이전트 — REQ 의 켜는 조건(FR-6)
 *   ② 지금 운영 해설 vs 에이전트 — 에이전트가 지금 화면보다 나은가(2026-11-02 로컬 Claude 가 이미 템플릿을 17:3 으로 이겼다 — ①만으론 약한 문턱)
 * A/B 배정은 `sha256(평가지 이름 + 번호)` 홀짝 — 결정적. 키는 평가가 끝날 때까지 열지 않는다.
 *
 * ```bash
 * npx tsx scripts/explain-agent-ab.ts [--round 2]           # 평가지 둘 · 키 둘(LLM 약 60회 — 고르기 ≤ 2 · 작성 2 × 20). 같은 날 다시 재면 회차
 * npx tsx scripts/explain-agent-ab.ts --score <평가지> <ratings.json>   # 평가자 표(raters → 번호 → A|B|같음)를 키와 맞춰 다수결 집계
 * ```
 *
 * - 입력은 운영 배치와 같은 재료 함수(`CompareAgentExplanation` — 판단 · 원인 · 회사 사정). 종목은 고정 목록(표본 선택: 시가총액 큰 국내 5 ·
 *   거래 많은 코인 5 — 도구 결과가 있는 종목이 많을수록 에이전트에 유리하다는 편향을 리포트에 적는다)
 * - 사용량 원장에 운영과 같이 남는다(`agent_plan` · `coach_explain`) — 24시간 상한을 같이 쓴다
 * - 평가자에게 보이는 입력 사실 = 에이전트 작성기가 받은 것 전부(도구 사실 포함). 템플릿 · 운영 해설은 도구 사실을 모른다 — 그것이 비교 대상이다
 *
 * 출력: `requirements/reports/explain-ab/explain-agent-ab-<날짜>-{template,current}.md` · `.key.json` · `-trace.json`(호출 · 인용 — 키와 같이 연다)
 * 레이어: `scripts/**` 는 `composition.ts` 처럼 레이어 밖이다.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CoachExplanation, CoachMode } from "../src/coach/domain";
import { lineFactsText } from "../src/coach/infrastructure/explanationPrompt";

const OUT_DIR = join(__dirname, "..", "requirements", "reports", "explain-ab");
const SYMBOLS = ["005930", "000660", "035420", "005380", "068270", "BTC", "ETH", "XRP", "SOL", "DOGE"];
const MODES: CoachMode[] = ["scalp", "long_term"];

type Side = "template" | "current" | "agent";
interface KeyRow {
  no: number;
  symbol: string;
  mode: CoachMode;
  A: Side;
  B: Side;
  skipped?: string;
}

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

const sideA = (sheet: string, no: number, other: Side): Side =>
  parseInt(createHash("sha256").update(`${sheet}:${no}`).digest("hex").slice(-1), 16) % 2 === 0 ? other : "agent";

const header = (title: string) => [
  `# ${title}`,
  "",
  "`FC-REQ-023` FR-6 · FEATURE-008 FR-49. 입력마다 A · B 중 **읽기 쉽고 사실과 맞고 판단을 더 잘 설명하는 쪽**을 고른다.",
  "어느 쪽이 무엇인지는 키 파일에 있다 — **평가가 끝날 때까지 열지 않는다.**",
  "",
  "- `선택:` 뒤에 `A` · `B` · `같음` 중 하나",
  "- `사실과 다른 문장:` 뒤에 입력 사실과 다른 문장이 있으면 옮겨 적는다(없으면 비워 둔다)",
  "",
];

const generate = async () => {
  // 조립은 생성 때만 — 집계(`--score`)가 DB · 로컬 CLI 감지를 열어 끝나지 않았다
  const { contextUseCases, localCliReady } = await import("../src/composition");
  await localCliReady;
  const today = new Date().toISOString().slice(0, 10);
  // 같은 날 다시 재면 `--round 2` — 앞 평가지(평가가 끝났을 수 있다)를 덮지 않는다
  // `--against rule` — 원인 분리(3회차): 대조군 = 지금 운영 해설 + 작성 프롬프트의 도구 줄(사실 0). 평가지 하나만 만든다
  const rule = process.argv.includes("--against") && process.argv[process.argv.indexOf("--against") + 1] === "rule";
  const roundAt = process.argv.indexOf("--round");
  const tag = roundAt >= 0 ? `-r${process.argv[roundAt + 1]}` : "";
  const names = {
    template: `explain-agent-ab-${today}${tag}-template`,
    current: `explain-agent-ab-${today}${tag}-${rule ? "rule" : "current"}`,
  };
  const written = rule ? (["current"] as const) : (["template", "current"] as const);
  for (const n of written.map((w) => names[w])) if (existsSync(join(OUT_DIR, `${n}.md`))) throw new Error(`이미 있다: ${n}.md — 앞 평가지를 덮지 않는다`);
  const sheets = {
    template: header(`에이전트 해설 블라인드 A/B ① — ${today}`),
    current: header(`에이전트 해설 블라인드 A/B ${rule ? "③" : "②"} — ${today}`),
  };
  const keys: Record<"template" | "current", KeyRow[]> = { template: [], current: [] };
  const trace: unknown[] = [];
  let no = 0;
  for (const symbol of SYMBOLS) {
    for (const mode of MODES) {
      no += 1;
      const started = Date.now();
      try {
        const c = await contextUseCases.coach.compareAgentExplanation.execute(symbol, mode, rule ? { plainRule: true } : { plain: true });
        if (!c || !c.plain) throw Object.assign(new Error("재료 없음"), { name: "NoFacts" });
        const facts = lineFactsText(c.input).filter((l) => l !== "").join("\n");
        const bySide = { template: c.template, current: c.plain.explanation, agent: c.agent.explanation };
        for (const other of ["template", "current"] as const) {
          const A = sideA(names[other], no, other);
          const row: KeyRow = { no, symbol, mode, A, B: A === "agent" ? other : "agent" };
          keys[other].push(row);
          sheets[other].push(
            `## ${no}. ${c.input.koreanName} ${mode === "scalp" ? "단타" : "장기"}`,
            "",
            "<details><summary>입력 사실</summary>",
            "",
            facts,
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
        }
        const toolCited = c.sentences.filter((s) => s.citations.some((x) => x.id.startsWith("tool-"))).length;
        trace.push({
          no,
          symbol,
          mode,
          provider: c.provider,
          plannedBy: c.trace.plannedBy,
          rounds: c.trace.rounds,
          calls: c.trace.calls,
          rejected: c.trace.rejected,
          failedCalls: c.trace.failedCalls,
          toolFacts: c.input.tools?.facts.length ?? 0,
          agentDropped: c.agent.dropped.length,
          currentDropped: c.plain.dropped.length,
          sentences: c.sentences.length,
          toolCited,
          ms: Date.now() - started,
        });
        console.log(
          `${no}/20 ${symbol} ${mode} — ${c.trace.plannedBy} 왕복 ${c.trace.rounds} · 호출 ${c.trace.calls.length} · 도구 사실 ${c.input.tools?.facts.length ?? 0} · ` +
            `도구 인용 문장 ${toolCited} · 버린 문장 ${c.agent.dropped.length} · ${Math.round((Date.now() - started) / 1000)}초`
        );
      } catch (error) {
        const skipped = (error as Error).name || "error";
        for (const other of ["template", "current"] as const) keys[other].push({ no, symbol, mode, A: "agent", B: other, skipped });
        console.log(`${no}/20 ${symbol} ${mode} — 실패(${skipped}: ${(error as Error).message}), 평가지에서 뺌`);
      }
    }
  }
  mkdirSync(OUT_DIR, { recursive: true });
  for (const other of written) {
    writeFileSync(join(OUT_DIR, `${names[other]}.md`), sheets[other].join("\n"));
    writeFileSync(join(OUT_DIR, `${names[other]}.key.json`), JSON.stringify(keys[other], null, 2) + "\n");
    console.log(`평가지 ${join(OUT_DIR, `${names[other]}.md`)}`);
  }
  writeFileSync(join(OUT_DIR, `explain-agent-ab-${today}${tag}-trace.json`), JSON.stringify(trace, null, 2) + "\n");
};

/** 평가자 표 → 다수결(평가자 셋 중 둘 이상). 같음 · 갈림은 따로 센다 */
const score = (sheetPath: string, ratingsPath: string) => {
  const key: KeyRow[] = JSON.parse(readFileSync(sheetPath.replace(/\.md$/, ".key.json"), "utf8"));
  const ratings: { raters: Record<string, Record<string, string>> } = JSON.parse(readFileSync(ratingsPath, "utf8"));
  const raters = Object.keys(ratings.raters);
  const perRater: Record<string, Record<string, number>> = {};
  const majority: Record<string, number> = { agent: 0, other: 0, same: 0, split: 0 };
  for (const row of key.filter((r) => !r.skipped)) {
    const votes = raters.map((r) => {
      const p = ratings.raters[r]![String(row.no)];
      const side = p === "A" ? row.A : p === "B" ? row.B : "same";
      const v = side === "agent" ? "agent" : side === "same" ? "same" : "other";
      perRater[r] ??= { agent: 0, other: 0, same: 0 };
      perRater[r]![v]! += 1;
      return v;
    });
    const count = (v: string) => votes.filter((x) => x === v).length;
    const win = ["agent", "other", "same"].find((v) => count(v) * 2 > votes.length);
    majority[win ?? "split"]! += 1;
  }
  console.log(JSON.stringify({ sheet: sheetPath, rated: key.filter((r) => !r.skipped).length, majority, perRater }, null, 2));
};

const at = process.argv.indexOf("--score");
if (at >= 0) score(process.argv[at + 1]!, process.argv[at + 2]!);
else
  void generate()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
