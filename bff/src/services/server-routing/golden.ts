import fs from "node:fs";
import path from "node:path";

import { firstDifference, normalize } from "./normalize";

/**
 * 골든 JSON(`BFF-REQ-045` FR-2) — BFF 가 실제로 부른 서버 요청/응답을 **정규화해서** 녹화하고, 나중에 다른 서버(platform)에
 * 같은 요청을 보내 비교한다. 경로를 Kotlin 으로 옮기는 PR 의 합격선이 "골든 차이 0"이다(`msa-services.md` §7 ①②).
 *
 * - 녹화: `GOLDEN_RECORD_DIR` 를 주고 BFF 를 돌리면 서버 호출마다 파일 하나(같은 요청은 덮어쓴다 — 최신 응답이 기준)
 * - 재생: `npm run golden:replay -- <dir> <baseURL>` — 읽기(GET) 녹화만 다시 보낸다
 * - 토큰은 녹화하지 않는다. 재생 때 `GOLDEN_TOKEN` 으로 넣는다
 */
export interface GoldenRecord {
  method: string;
  url: string;
  status: number;
  body: unknown;
}

export const goldenFileName = (method: string, url: string): string =>
  `${method.toUpperCase()}${url.replace(/[^A-Za-z0-9._-]+/g, "_")}.json`.slice(0, 200);

export const recordGolden = (dir: string, method: string, url: string, status: number, data: unknown): string => {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, goldenFileName(method, url));
  const record: GoldenRecord = { method: method.toUpperCase(), url, status, body: normalize(data) };
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return file;
};

export const readGoldens = (dir: string): GoldenRecord[] =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as GoldenRecord);

/** null = 같다. 상태가 다르면 `$status`, 본문이 다르면 첫 차이 경로. */
export const compareGolden = (golden: GoldenRecord, status: number, data: unknown): string | null => {
  if (golden.status !== status) return "$status";
  return firstDifference(golden.body, normalize(data));
};
