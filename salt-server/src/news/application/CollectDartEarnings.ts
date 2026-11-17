import {
  DART_DOC_GAP_MS,
  DART_EARNINGS_DOC_DAYS,
  DART_EARNINGS_DOC_MAX_ATTEMPTS,
  DART_EARNINGS_DOCS_PER_TICK,
  DART_EARNINGS_REFRESH_DAYS,
  DART_EARNINGS_REFRESH_MS,
  DART_EARNINGS_SINCE,
  DART_EARNINGS_STOCKS_PER_TICK,
  DART_EARNINGS_TYPES,
  type DartEarningsFilingRow,
  type DartEarningsStore,
  type DartFiling,
  type DartPort,
  type EarningsSchedule,
  type KrUniverseSource,
  classifyEarningsFiling,
  isPermanentDartMiss,
  kstYmd,
  parseIrSchedule,
  parsePreviewSchedule,
  periodEndFromName,
} from "../domain";
import { logger } from "../../shared/config/logger";

export interface DartEarningsTick {
  enabled: boolean;
  /** 이번 회차에 맞춘 종목(처음 10년 · 다시 14일) */
  fullStocks: number;
  refreshStocks: number;
  filings: number;
  /** IR · 예고 본문 */
  docs: number;
  parsed: number;
  unparsed: number;
  failed: number;
}

/** 목록 한 줄 → 실적 표 행(실적과 무관하면 null). 공시 목록 회차(`CollectDartDisclosures`)도 같은 함수로 넣는다 */
export const toEarningsRow = (f: DartFiling, type: string): (DartEarningsFilingRow & { type: string }) | null => {
  const kind = classifyEarningsFiling(f.reportName);
  if (!kind) return null;
  return { rceptNo: f.rceptNo, stockCode: f.stockCode, reportName: f.reportName, rceptDate: f.rceptDate, kind, periodEnd: periodEndFromName(f.reportName), type };
};

/**
 * DART 실적 공시 · 실적 일정 한 회차(F008 슬라이스 24 2단계 — `SRV-REQ-041` FR-8~10 · `FC-REQ-021` FR-11~15).
 *
 * 1. 유니버스 종목마다 실적 이력 — 처음은 2016 년부터(정기 A · 거래소 I), 그 뒤 20시간마다 최근 14일. 정기보고서는 5분 목록에 없어서다.
 *    잠정실적 · IR · 예고(I)는 5분 공시 회차가 처음 본 시각으로 먼저 넣는다(`CollectDartDisclosures`)
 * 2. IR · 예고 본문에서 일정만 읽는다(원문 저장 0 · LLM 0). 실적 IR 이 아니면(콘퍼런스 · NDR) `about_earnings = false`
 *
 * 키가 없으면 아무것도 하지 않는다. 실패는 그 종목 · 그 공시만(다음 회차). 트랜잭션 없음
 */
export class CollectDartEarnings {
  constructor(
    private readonly deps: { dart: DartPort | null; universe: KrUniverseSource; earnings: DartEarningsStore },
    private readonly now: () => Date = () => new Date(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  async execute(): Promise<DartEarningsTick> {
    const out: DartEarningsTick = { enabled: this.deps.dart !== null, fullStocks: 0, refreshStocks: 0, filings: 0, docs: 0, parsed: 0, unparsed: 0, failed: 0 };
    const dart = this.deps.dart;
    if (!dart) return out;
    await this.sync(dart, out);
    await this.readDocs(dart, out);
    return out;
  }

  private async sync(dart: DartPort, out: DartEarningsTick) {
    const now = this.now();
    const codes = await this.deps.universe.codes();
    const synced = await this.deps.earnings.synced(codes);
    const fresh = codes.filter((c) => !synced.has(c));
    const stale = codes.filter((c) => {
      const at = synced.get(c);
      return at !== undefined && now.getTime() - at.getTime() >= DART_EARNINGS_REFRESH_MS;
    });
    const todo = [...fresh, ...stale].slice(0, DART_EARNINGS_STOCKS_PER_TICK);
    if (todo.length === 0) return;
    const corp = await dart.corpCodes();
    for (const code of todo) {
      const full = !synced.has(code);
      const corpCode = corp.get(code);
      try {
        const rows: Array<DartEarningsFilingRow & { type: string }> = [];
        if (corpCode) {
          for (const type of DART_EARNINGS_TYPES) {
            for (let page = 1; ; page += 1) {
              const { items, totalPage } = await dart.listByCorp(corpCode, type, full ? DART_EARNINGS_SINCE : kstYmd(now, DART_EARNINGS_REFRESH_DAYS), kstYmd(now), page);
              for (const f of items) {
                const row = toEarningsRow(f, type);
                if (row) rows.push(row);
              }
              if (page >= totalPage) break;
            }
          }
        }
        const saved = await this.deps.earnings.save(rows, now);
        // 고유번호가 없는 종목(ETF · 리츠 일부)도 표시한다 — 매 회차 다시 묻지 않게
        await this.deps.earnings.markSynced(code, saved, now);
        out.filings += saved;
        if (full) out.fullStocks += 1;
        else out.refreshStocks += 1;
      } catch (error) {
        logger.warn("[news] dart earnings sync failed", { code, err: (error as { code?: string }).code ?? null, message: String((error as Error).message ?? "").slice(0, 120) });
      }
    }
  }

  private async readDocs(dart: DartPort, out: DartEarningsTick) {
    const pending = await this.deps.earnings.pendingDocs(DART_EARNINGS_DOCS_PER_TICK, new Date(this.now().getTime() - DART_EARNINGS_DOC_DAYS * 86_400_000));
    const results: Array<{ rceptNo: string; status: "ok" | "unparsed" | "failed" | null; schedule: EarningsSchedule | null }> = [];
    for (const [i, doc] of pending.entries()) {
      if (i > 0) await this.sleep(DART_DOC_GAP_MS);
      out.docs += 1;
      try {
        const paragraphs = await dart.document(doc.rceptNo);
        const schedule = doc.kind === "ir" ? parseIrSchedule(paragraphs) : parsePreviewSchedule(paragraphs);
        results.push({ rceptNo: doc.rceptNo, status: schedule ? "ok" : "unparsed", schedule });
        if (schedule) out.parsed += 1;
        else out.unparsed += 1;
      } catch (error) {
        // 원문이 영구히 없으면(013 · 014) 바로 끝 — 다시 불러도 같은 답
        const last = doc.attempts + 1 >= DART_EARNINGS_DOC_MAX_ATTEMPTS || isPermanentDartMiss((error as { code?: string }).code);
        results.push({ rceptNo: doc.rceptNo, status: last ? "failed" : null, schedule: null });
        out.failed += 1;
        logger.warn("[news] dart earnings document failed", { rceptNo: doc.rceptNo, code: (error as { code?: string }).code ?? null, message: String((error as Error).message ?? "").slice(0, 120) });
      }
    }
    await this.deps.earnings.saveDocs(results);
  }
}
