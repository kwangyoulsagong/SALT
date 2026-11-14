import { createHash } from "node:crypto";

import {
  DART_DOC_GAP_MS,
  DART_DOC_MAX_ATTEMPTS,
  DART_DOCS_PER_TICK,
  DART_TYPES,
  type AiBodyStore,
  type DartFiling,
  type DartPort,
  type KrUniverseSource,
  dartKey,
  dartPublishedAt,
  dartTitle,
  dartViewerUrl,
  kstYmd,
} from "../domain";
import { logger } from "../../shared/config/logger";

export interface DartTick {
  enabled: boolean;
  listed: number;
  universe: number;
  fresh: number;
  saved: number;
  failed: number;
  /** 회차 상한으로 다음 회차 */
  deferred: number;
}

/**
 * DART 공시 한 회차(F017 v4 2b) — 어제 · 오늘 접수 목록(주요사항 · 거래소 공시) → 유니버스 종목 중 처음 본 것 → 원문 받기 → AI 경로 본문(`via: dart`).
 * 사실 추출(`coach` 2c)이 같은 길로 읽는다(`source_kind = disclosure`). 키가 없으면 아무것도 하지 않는다(`enabled: false`).
 * 원문 실패는 그 공시만 · 프로세스 안에서 세 번까지 다시. 트랜잭션 없음
 */
export class CollectDartDisclosures {
  private readonly failures = new Map<string, number>();

  constructor(
    private readonly deps: { dart: DartPort | null; universe: KrUniverseSource; bodies: AiBodyStore },
    private readonly now: () => Date = () => new Date(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  async execute(): Promise<DartTick> {
    const out: DartTick = { enabled: this.deps.dart !== null, listed: 0, universe: 0, fresh: 0, saved: 0, failed: 0, deferred: 0 };
    const dart = this.deps.dart;
    if (!dart) return out;
    const now = this.now();
    const [bgn, end] = [kstYmd(now, 1), kstYmd(now)];
    const universe = new Set(await this.deps.universe.codes());
    const filings: DartFiling[] = [];
    for (const type of DART_TYPES) {
      for (let page = 1; ; page += 1) {
        const { items, totalPage } = await dart.list(type, bgn, end, page);
        filings.push(...items);
        if (page >= totalPage) break;
      }
    }
    out.listed = filings.length;
    const mine = filings.filter((f) => universe.has(f.stockCode));
    out.universe = mine.length;
    const known = await this.deps.bodies.statuses(mine.map((f) => dartKey(f.rceptNo)));
    const fresh = mine.filter((f) => !known.has(dartKey(f.rceptNo)) && (this.failures.get(f.rceptNo) ?? 0) < DART_DOC_MAX_ATTEMPTS);
    out.fresh = fresh.length;
    const batch = fresh.slice(0, DART_DOCS_PER_TICK);
    out.deferred = fresh.length - batch.length;
    for (const [i, f] of batch.entries()) {
      if (i > 0) await this.sleep(DART_DOC_GAP_MS);
      const publishedAt = dartPublishedAt(f.rceptDate);
      try {
        const paragraphs = await dart.document(f.rceptNo);
        if (!publishedAt || paragraphs.length === 0) throw new Error("empty document");
        const joined = paragraphs.join("\n");
        out.saved += await this.deps.bodies.saveDisclosures(
          [{
            key: dartKey(f.rceptNo),
            title: dartTitle(f),
            publishedAt,
            symbols: [f.stockCode],
            url: dartViewerUrl(f.rceptNo),
            paragraphs,
            hash: createHash("sha256").update(joined).digest("hex"),
            chars: joined.length,
          }],
          this.now(),
        );
      } catch (error) {
        out.failed += 1;
        this.failures.set(f.rceptNo, (this.failures.get(f.rceptNo) ?? 0) + 1);
        logger.warn("[news] dart document failed", { rceptNo: f.rceptNo, code: (error as { code?: string }).code ?? null, message: String((error as Error).message ?? "").slice(0, 120) });
      }
    }
    return out;
  }
}
