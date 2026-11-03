import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { firstDifference, normalize } from "./normalize";

/**
 * 골든 JSON(`BFF-REQ-045` FR-2) — BFF 가 실제로 부른 서버 요청/응답을 **정규화해서** 녹화하고, 나중에 다른 서버(platform)에
 * 같은 요청을 보내 비교한다. 경로를 Kotlin 으로 옮기는 PR 의 합격선이 "골든 차이 0"이다(`msa-services.md` §7 ①②).
 *
 * - 녹화: `GOLDEN_RECORD_DIR` 를 주고 BFF 를 돌리면 서버 호출마다 파일 하나(같은 요청은 덮어쓴다 — 최신 응답이 기준)
 * - 재생: `npm run golden:replay -- <dir> <baseURL>` — 읽기(GET) 녹화만 다시 보낸다
 * - 토큰은 녹화하지 않는다 — 요청 헤더는 원래 없고, **응답 본문**도 인증 경로(`/auth/*`)는 녹화하지 않으며 다른 경로의
 *   토큰 · 비밀 같은 키(`token` · `password` · `secret` 을 이름에 가진 키) 값은 `<redacted>`. 재생 때 `GOLDEN_TOKEN` 으로 넣는다
 */
const UNRECORDED = /^\/auth(\/|$|\?)/;
const SECRET_KEY = /token|password|secret/i;

const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET_KEY.test(k) && v !== null ? "<redacted>" : redact(v)]),
    );
  }
  return value;
};

export const isRecordable = (url: string): boolean => !UNRECORDED.test(url);
export interface GoldenRecord {
  method: string;
  url: string;
  status: number;
  body: unknown;
}

/** 읽을 수 있는 앞부분(잘라도 됨) + 원래 주소 해시 — 긴 주소가 `.json` 을 잃거나 다른 주소가 같은 이름이 되지 않게 */
export const goldenFileName = (method: string, url: string): string => {
  const readable = `${method.toUpperCase()}${url.replace(/[^A-Za-z0-9._-]+/g, "_")}`.slice(0, 120);
  const hash = createHash("sha256").update(`${method.toUpperCase()} ${url}`).digest("hex").slice(0, 12);
  return `${readable}-${hash}.json`;
};

/** @return 쓴 파일, 녹화하지 않는 경로면 null */
export const recordGolden = (dir: string, method: string, url: string, status: number, data: unknown): string | null => {
  if (!isRecordable(url)) return null;
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, goldenFileName(method, url));
  const record: GoldenRecord = { method: method.toUpperCase(), url, status, body: normalize(redact(data)) };
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
  return firstDifference(golden.body, normalize(redact(data)));
};
