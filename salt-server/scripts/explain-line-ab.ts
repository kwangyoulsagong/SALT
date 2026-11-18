/**
 * 근거 줄 지시 블라인드 A/B — `SRV-REQ-060`. 지금 운영 해설(로컬 CLI 줄 형식) vs 같은 작성기 + 근거 줄 한 줄(`REASON_LINE`).
 *
 * O3 원인 분리(`SRV-REQ-059` 3회차)에서 "판단 근거 · 원인을 빼고 다른 사실로 채우지 않기" 한 줄이 해설을 낫게 한 것으로 보였지만,
 * 그 비교의 상대는 운영 해설이 아니었다. 여기서는 **변수 하나만** 다르다 — 같은 실행 · 같은 입력 · 같은 CLI · 같은 검증기, 프롬프트 한 줄만.
 *
 * ```bash
 * npx tsx scripts/explain-line-ab.ts                                   # 평가지 · 키(로컬 CLI 40회)
 * npx tsx scripts/explain-line-ab.ts --score <평가지> <ratings.json>   # 평가자 표 다수결
 * ```
 *
 * - 입력은 운영 배치와 같은 재료(`CompareAgentExplanation.prepareBase` — 판단 · 원인 · 회사 사정). 종목은 O3 평가와 같은 고정 목록
 * - 사용량 원장에 남기지 않는다(측정 — `explain-ab-sheet.ts` 와 같다)
 * 출력: `requirements/reports/explain-ab/explain-line-ab-<날짜>.md` · `.key.json` · `-trace.json`
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { verifyExplanation, type CoachExplanation, type CoachMode } from "../src/coach/domain";
import { lineFactsText } from "../src/coach/infrastructure/explanationPrompt";
import { detectLocalCli, LocalCliCoachExplainer } from "../src/coach/infrastructure/LocalCliCoachExplainer";

const OUT_DIR = join(__dirname, "..", "requirements", "reports", "explain-ab");
const SYMBOLS = ["005930", "000660", "035420", "005380", "068270", "BTC", "ETH", "XRP", "SOL", "DOGE"];
const MODES: CoachMode[] = ["scalp", "long_term"];

type Side = "current" | "line";
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

const sideA = (sheet: string, no: number): Side =>
  parseInt(createHash("sha256").update(`${sheet}:${no}`).digest("hex").slice(-1), 16) % 2 === 0 ? "current" : "line";

const generate = async () => {
  const { contextUseCases } = await import("../src/composition");
  const found = await detectLocalCli("claude");
  if (!found) throw new Error("로컬 Claude CLI 를 찾지 못했다");
  const current = new LocalCliCoachExplainer(found.provider, found.bin, null);
  const line = new LocalCliCoachExplainer(found.provider, found.bin, null, { reasonLine: true });
  const today = new Date().toISOString().slice(0, 10);
  const name = `explain-line-ab-${today}`;
  if (existsSync(join(OUT_DIR, `${name}.md`))) throw new Error(`이미 있다: ${name}.md — 앞 평가지를 덮지 않는다`);
  const sheet = [
    `# 해설 블라인드 A/B — ${today}`,
    "",
    "`SRV-REQ-060` · FEATURE-008 FR-49. 입력마다 A · B 중 **읽기 쉽고 사실과 맞고 판단을 더 잘 설명하는 쪽**을 고른다.",
    "어느 쪽이 무엇인지는 키 파일에 있다 — **평가가 끝날 때까지 열지 않는다.**",
    "",
    "- `선택:` 뒤에 `A` · `B` · `같음` 중 하나",
    "- `사실과 다른 문장:` 뒤에 입력 사실과 다른 문장이 있으면 옮겨 적는다(없으면 비워 둔다)",
    "",
  ];
  const key: KeyRow[] = [];
  const trace: unknown[] = [];
  let no = 0;
  for (const symbol of SYMBOLS) {
    for (const mode of MODES) {
      no += 1;
      const A = sideA(name, no);
      const row: KeyRow = { no, symbol, mode, A, B: A === "current" ? "line" : "current" };
      try {
        const base = await contextUseCases.coach.compareAgentExplanation.prepareBase(symbol, mode);
        if (!base) throw Object.assign(new Error("재료 없음"), { name: "NoFacts" });
        const now = new Date();
        const [c, l] = [await current.explain(base.input), await line.explain(base.input)];
        const bySide = { current: verifyExplanation(c, base.input, now), line: verifyExplanation(l, base.input, now) };
        sheet.push(
          `## ${no}. ${base.input.koreanName} ${mode === "scalp" ? "단타" : "장기"}`,
          "",
          "<details><summary>입력 사실</summary>",
          "",
          lineFactsText(base.input).filter((x) => x !== "").join("\n"),
          "",
          "</details>",
          "",
          block("A", bySide[row.A].explanation),
          block("B", bySide[row.B].explanation),
          "선택: ",
          "",
          "사실과 다른 문장: ",
          "",
          "---",
          ""
        );
        trace.push({ no, symbol, mode, currentDropped: bySide.current.dropped.length, lineDropped: bySide.line.dropped.length });
        console.log(`${no}/20 ${symbol} ${mode} — 버린 문장 지금 ${bySide.current.dropped.length} · 한 줄 ${bySide.line.dropped.length}`);
      } catch (error) {
        row.skipped = (error as Error).name || "error";
        console.log(`${no}/20 ${symbol} ${mode} — 실패(${row.skipped}: ${(error as Error).message}), 평가지에서 뺌`);
      }
      key.push(row);
    }
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${name}.md`), sheet.join("\n"));
  writeFileSync(join(OUT_DIR, `${name}.key.json`), JSON.stringify(key, null, 2) + "\n");
  writeFileSync(join(OUT_DIR, `${name}-trace.json`), JSON.stringify(trace, null, 2) + "\n");
  console.log(`평가지 ${join(OUT_DIR, `${name}.md`)}`);
};

/** 평가자 표 → 다수결(셋 중 둘 이상). 같음 · 갈림은 따로 */
const score = (sheetPath: string, ratingsPath: string) => {
  const key: KeyRow[] = JSON.parse(readFileSync(sheetPath.replace(/\.md$/, ".key.json"), "utf8"));
  const ratings: { raters: Record<string, Record<string, string>> } = JSON.parse(readFileSync(ratingsPath, "utf8"));
  const raters = Object.keys(ratings.raters);
  const perRater: Record<string, Record<string, number>> = {};
  const majority: Record<string, number> = { line: 0, current: 0, same: 0, split: 0 };
  for (const row of key.filter((r) => !r.skipped)) {
    const votes = raters.map((r) => {
      const p = ratings.raters[r]![String(row.no)];
      const v = p === "A" ? row.A : p === "B" ? row.B : "same";
      perRater[r] ??= { line: 0, current: 0, same: 0 };
      perRater[r]![v]! += 1;
      return v;
    });
    const win = ["line", "current", "same"].find((v) => votes.filter((x) => x === v).length * 2 > votes.length);
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
