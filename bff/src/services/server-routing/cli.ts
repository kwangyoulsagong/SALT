import fs from "node:fs";
import path from "node:path";

import axios from "axios";

import { compareGolden, readGoldens } from "./golden";
import { ShadowRecord, summarize } from "./shadow";

/**
 * 운영 도구 두 개(`BFF-REQ-045` FR-2 · 4).
 *
 *   npm run shadow:report [dir]              — 그림자 기록 경로별 일치율 · 첫 차이(기본 var/shadow)
 *   npm run golden:replay <dir> <baseURL>    — 녹화한 GET 을 다시 보내 비교. 토큰은 GOLDEN_TOKEN
 *
 * 차이가 하나라도 있으면 exit 1 — 경로 이전 PR 의 게이트로 쓴다.
 */
const [command, ...args] = process.argv.slice(2);

const shadowReport = (dir = "var/shadow"): number => {
  const records: ShadowRecord[] = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl")).flatMap((f) =>
        fs.readFileSync(path.join(dir, f), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as ShadowRecord),
      )
    : [];
  if (records.length === 0) {
    console.error(`그림자 기록 0건 — ${dir}. 비교한 것이 없으면 통과가 아니다`);
    return 1;
  }
  const rows = summarize(records);
  console.table(rows.map((r) => ({ ...r, matchRate: `${(r.matchRate * 100).toFixed(1)}%`, firstDiffs: JSON.stringify(r.firstDiffs) })));
  return rows.some((r) => r.matchRate < 1) ? 1 : 0;
};

const goldenReplay = async (dir: string, baseURL: string): Promise<number> => {
  const token = process.env.GOLDEN_TOKEN;
  let failed = 0;
  const gets = readGoldens(dir).filter((g) => g.method === "GET");
  if (gets.length === 0) {
    console.error(`GET 골든 0건 — ${dir}. 비교한 것이 없으면 통과가 아니다`);
    return 1;
  }
  for (const golden of gets) {
    const response = await axios.get(golden.url, {
      baseURL,
      validateStatus: () => true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const diff = compareGolden(golden, response.status, response.data);
    console.log(`${diff === null ? "same" : "DIFF"} ${golden.method} ${golden.url}${diff ? ` → ${diff}` : ""}`);
    if (diff !== null) failed++;
  }
  return failed > 0 ? 1 : 0;
};

const main = async (): Promise<number> => {
  if (command === "shadow-report") return shadowReport(args[0]);
  if (command === "golden-replay" && args[0] && args[1]) return goldenReplay(args[0], args[1]);
  console.error("usage: shadow-report [dir] | golden-replay <dir> <baseURL>");
  return 2;
};

void main().then((code) => process.exit(code));
