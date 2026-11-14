import { createHash } from "node:crypto";

import {
  DART_BACKFILL_DAYS,
  DART_BACKFILL_STOCKS_PER_TICK,
  DART_BODY_BACKFILL_DAYS,
  DART_BODY_BACKFILL_PER_STOCK,
  DART_DOC_GAP_MS,
  DART_DOC_MAX_ATTEMPTS,
  DART_DOCS_PER_TICK,
  DART_TYPES,
  type AiBodyStore,
  type DartFiling,
  type DartFilingStore,
  type DartPort,
  type DartType,
  type KrUniverseSource,
  dartKey,
  dartPublishedAt,
  dartTitle,
  dartViewerUrl,
  isImportantFiling,
  kstYmd,
} from "../domain";
import { logger } from "../../shared/config/logger";

export interface DartTick {
  enabled: boolean;
  /** 어제 · 오늘 목록 */
  listed: number;
  universe: number;
  /** 1년 목록을 받은 종목 · 그 목록 수 */
  backfilledStocks: number;
  backfilledFilings: number;
  /** 원문 — 새 공시 + 과거 중요 공시 */
  fresh: number;
  saved: number;
  failed: number;
  /** 회차 상한으로 다음 회차(원문) */
  deferred: number;
}

/**
 * DART 공시 한 회차(F017 v4 2b — `SRV-REQ-058` 원천 ① · `FC-REQ-026` FR-3 · 11~13).
 *
 * 1. 어제 · 오늘 접수 목록(주요사항 B · 거래소 I) → 유니버스 종목 것을 목록 표(`dart_filing`)에
 * 2. **1년 백필** — 아직 안 한 유니버스 종목(회차마다 10)의 1년 목록을 고유번호로 받아 같은 표에. 회사 사정 칸은 목록 자체를 사실로 쓴다
 *    (사용자 2026-11-14 "국내는 적어도 다 나와야지" — 어제 · 오늘만 받으면 50 중 14 종목만 칸이 섰다)
 * 3. 원문 — 새 공시 먼저, 남은 몫은 과거 120일 중요 공시(종목마다 최근 2건) → AI 경로 본문(`via: dart`) → 사실 추출(`coach`)
 *
 * 키가 없으면 아무것도 하지 않는다. 실패는 그 종목 · 그 공시만. 원문 실패는 프로세스 안에서 세 번까지. 트랜잭션 없음
 */
export class CollectDartDisclosures {
  private readonly failures = new Map<string, number>();

  constructor(
    private readonly deps: { dart: DartPort | null; universe: KrUniverseSource; bodies: AiBodyStore; filings: DartFilingStore },
    private readonly now: () => Date = () => new Date(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  async execute(): Promise<DartTick> {
    const out: DartTick = {
      enabled: this.deps.dart !== null, listed: 0, universe: 0, backfilledStocks: 0, backfilledFilings: 0, fresh: 0, saved: 0, failed: 0, deferred: 0,
    };
    const dart = this.deps.dart;
    if (!dart) return out;
    const now = this.now();
    const codes = await this.deps.universe.codes();
    const universe = new Set(codes);

    // 1. 어제 · 오늘
    const today: Array<DartFiling & { type: DartType }> = [];
    for (const type of DART_TYPES) {
      for (let page = 1; ; page += 1) {
        const { items, totalPage } = await dart.list(type, kstYmd(now, 1), kstYmd(now), page);
        today.push(...items.map((f) => ({ ...f, type })));
        if (page >= totalPage) break;
      }
    }
    out.listed = today.length;
    const mine = today.filter((f) => universe.has(f.stockCode));
    out.universe = mine.length;
    await this.deps.filings.save(mine, now);

    // 2. 1년 백필 — 종목 하나의 실패는 그 종목만(다음 회차에 다시)
    await this.backfill(dart, codes, now, out);

    // 3. 원문 — 새 공시 먼저, 그다음 과거 중요 공시
    const known = await this.deps.bodies.statuses(mine.map((f) => dartKey(f.rceptNo)));
    const fresh = mine.filter((f) => !known.has(dartKey(f.rceptNo)));
    const past = this.pickPast(await this.deps.filings.withoutBody(codes, new Date(now.getTime() - DART_BODY_BACKFILL_DAYS * 86_400_000)));
    const queue = [...fresh, ...past.filter((p) => !fresh.some((f) => f.rceptNo === p.rceptNo))].filter(
      (f) => (this.failures.get(f.rceptNo) ?? 0) < DART_DOC_MAX_ATTEMPTS,
    );
    out.fresh = queue.length;
    const batch = queue.slice(0, DART_DOCS_PER_TICK);
    out.deferred = queue.length - batch.length;
    for (const [i, f] of batch.entries()) {
      if (i > 0) await this.sleep(DART_DOC_GAP_MS);
      await this.fetchBody(dart, f, out);
    }
    return out;
  }

  private async backfill(dart: DartPort, codes: string[], now: Date, out: DartTick) {
    const done = await this.deps.filings.backfilled(codes);
    const todo = codes.filter((c) => !done.has(c)).slice(0, DART_BACKFILL_STOCKS_PER_TICK);
    if (todo.length === 0) return;
    const corp = await dart.corpCodes();
    for (const code of todo) {
      const corpCode = corp.get(code);
      try {
        const filings: Array<DartFiling & { type: DartType }> = [];
        if (corpCode) {
          for (const type of DART_TYPES) {
            for (let page = 1; ; page += 1) {
              const { items, totalPage } = await dart.listByCorp(corpCode, type, kstYmd(now, DART_BACKFILL_DAYS), kstYmd(now), page);
              filings.push(...items.map((f) => ({ ...f, type })));
              if (page >= totalPage) break;
            }
          }
        }
        await this.deps.filings.save(filings, now);
        // 고유번호가 없는 종목(ETF · 리츠 일부)도 표시한다 — 매 회차 다시 묻지 않게(목록 0 · 회사 사정은 "공시 없음")
        await this.deps.filings.markBackfilled(code, filings.length, now);
        out.backfilledStocks += 1;
        out.backfilledFilings += filings.length;
      } catch (error) {
        logger.warn("[news] dart backfill failed", { code, err: (error as { code?: string }).code ?? null, message: String((error as Error).message ?? "").slice(0, 120) });
      }
    }
  }

  /** 과거 원문 후보 — 중요 공시만 · 종목마다 최근 `DART_BODY_BACKFILL_PER_STOCK` 건 · 최신순(받은 목록이 이미 최신순) */
  private pickPast(rows: DartFiling[]): DartFiling[] {
    const perStock = new Map<string, number>();
    return rows.filter((f) => {
      if (!isImportantFiling(f.reportName)) return false;
      const n = perStock.get(f.stockCode) ?? 0;
      if (n >= DART_BODY_BACKFILL_PER_STOCK) return false;
      perStock.set(f.stockCode, n + 1);
      return true;
    });
  }

  private async fetchBody(dart: DartPort, f: DartFiling, out: DartTick) {
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
}
