import fs from "node:fs";
import path from "node:path";

import { firstDifference, normalize } from "./normalize";

/**
 * 그림자 실행 기록(`BFF-REQ-045` FR-3 · 4). `shadow` 경로는 legacy 응답을 돌려주고, 같은 요청을 platform 에 보내 **차이만** 남긴다.
 *
 * - **읽기만** — GET · HEAD 이외는 그림자로 보내지 않는다(쓰기를 두 번 하면 데이터가 두 벌이 된다). 스트림(SSE)도 제외
 * - 기록에는 경로 · 상태 · 첫 차이 **경로**만. 본문 · 값 · 토큰 0(금액이 파일에 남지 않게)
 * - 날짜별 JSONL(`<dir>/shadow-YYYY-MM-DD.jsonl`). 1주 무차이가 스위치 조건 — `npm run shadow:report` 가 경로별로 센다
 */
export interface ShadowRecord {
  at: string;
  method: string;
  path: string;
  legacyStatus: number;
  platformStatus: number | null;
  match: boolean;
  firstDiff: string | null;
  platformMs: number;
  error?: string;
}

export const isShadowable = (method: string | undefined, responseType: string | undefined): boolean =>
  ["GET", "HEAD"].includes((method ?? "get").toUpperCase()) && responseType !== "stream";

export const compareResponses = (
  legacy: { status: number; data: unknown },
  platform: { status: number; data: unknown },
): { match: boolean; firstDiff: string | null } => {
  if (legacy.status !== platform.status) return { match: false, firstDiff: "$status" };
  const firstDiff = firstDifference(normalize(legacy.data), normalize(platform.data));
  return { match: firstDiff === null, firstDiff };
};

/** 기록 쓰기는 비동기 · 순서대로(한 줄씩 이어 쓴다) — 이벤트 루프에서 동기 디스크 I/O 를 하지 않는다 */
export class ShadowLog {
  private ready: Promise<unknown> | null = null;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly dir: string) {}

  append(record: ShadowRecord): Promise<void> {
    this.ready ??= fs.promises.mkdir(this.dir, { recursive: true });
    const file = path.join(this.dir, `shadow-${record.at.slice(0, 10)}.jsonl`);
    const next = this.tail.then(() => this.ready).then(() => fs.promises.appendFile(file, `${JSON.stringify(record)}\n`));
    this.tail = next.catch(() => undefined);
    return next;
  }
}

/**
 * 그림자 요청 허용 판단 — 동시 상한 · 표본 비율. 넘치면 비교를 건너뛴다(센다). 자주 폴링하는 경로를 shadow 로 돌려도
 * 서버 호출이 두 배로 무한히 쌓이지 않게.
 */
export class ShadowGate {
  private inFlight = 0;
  skipped = 0;

  constructor(
    private readonly maxInFlight: number,
    private readonly sampleRate: number,
    private readonly random: () => number = Math.random,
  ) {}

  tryEnter(): boolean {
    if (this.inFlight >= this.maxInFlight || this.random() >= this.sampleRate) {
      this.skipped += 1;
      return false;
    }
    this.inFlight += 1;
    return true;
  }

  leave(): void {
    this.inFlight = Math.max(0, this.inFlight - 1);
  }
}

export interface ShadowSummaryRow {
  method: string;
  path: string;
  calls: number;
  matched: number;
  matchRate: number;
  firstDiffs: Record<string, number>;
}

/** 경로별 일치율 · 첫 차이 필드 빈도. 경로 안의 ID 조각은 `:id` 로 묶는다. */
export const summarize = (records: ShadowRecord[]): ShadowSummaryRow[] => {
  const rows = new Map<string, ShadowSummaryRow>();
  for (const r of records) {
    const pattern = r.path.replace(/\/[0-9a-f-]{20,}|\/c[a-z0-9]{24}|\/\d+(?=\/|$)/gi, "/:id");
    const key = `${r.method} ${pattern}`;
    const row = rows.get(key) ?? { method: r.method, path: pattern, calls: 0, matched: 0, matchRate: 0, firstDiffs: {} };
    row.calls += 1;
    if (r.match) row.matched += 1;
    else if (r.firstDiff) row.firstDiffs[r.firstDiff] = (row.firstDiffs[r.firstDiff] ?? 0) + 1;
    row.matchRate = row.matched / row.calls;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => a.matchRate - b.matchRate || b.calls - a.calls);
};
