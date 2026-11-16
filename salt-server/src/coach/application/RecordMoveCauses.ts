import { logger } from "../../shared/config/logger";

import {
  causeCaptureDate,
  causeMarketOf,
  toCauseSnapshot,
  type CauseMarket,
  type CauseSnapshotReader,
  type CauseSnapshotRecord,
  type CauseSnapshotStore,
  type PanelUniverseProbe,
} from "../domain";

/** 동시에 부르는 원인 조립 수 — 패널 실측과 같은 폭(종목마다 리더 넷 · 연결 풀 17, `workers-external.md`) */
const CAUSE_RECORD_CONCURRENCY = 2;

export interface CauseRecordSummary {
  capturedAt: string;
  /** 찍는 창이 열린 시장과 그 거래일 — 닫힌 시장은 빠진다 */
  markets: Partial<Record<CauseMarket, string>>;
  symbols: number;
  recorded: number;
  /** 같은 지문이 이미 있어 안 늘어난 행 */
  unchanged: number;
  skipped: number;
  failed: number;
}

/**
 * 원인 스냅샷 기록(F017 v4 순서 5a · `SRV-REQ-053` FR-18). 패널 실측과 같은 종목 목록(`PanelUniverseProbe`)마다 원인 칸과 같은 유스케이스로
 * 원인 → 근거 → 결과를 불러, **찍는 창이 열린 시장만**(`causeCaptureDate` — 국내 장 뒤 · 코인 하루 끝 직전) 그날 거래일로 남긴다.
 * 결과(다음 등락)가 나오기 전 기록이라 예측이 원인 설명을 채점할 수 있다(`FC-REQ-022` FR-15). 한 종목 실패는 그 종목만 빠진다
 */
export class RecordMoveCauses {
  constructor(
    private readonly deps: {
      causes: CauseSnapshotReader;
      universe: PanelUniverseProbe;
      store: CauseSnapshotStore;
      now?: () => Date;
    }
  ) {}

  async execute(): Promise<CauseRecordSummary> {
    const now = this.deps.now?.() ?? new Date();
    const dates: Partial<Record<CauseMarket, string>> = {};
    for (const m of ["kr", "crypto"] as const) {
      const d = causeCaptureDate(m, now);
      if (d) dates[m] = d;
    }
    const summary: CauseRecordSummary = { capturedAt: now.toISOString(), markets: dates, symbols: 0, recorded: 0, unchanged: 0, skipped: 0, failed: 0 };
    if (Object.keys(dates).length === 0) return summary;

    const symbols = (await this.deps.universe.symbols()).filter((s) => dates[causeMarketOf(s)] !== undefined);
    summary.symbols = symbols.length;
    const rows: CauseSnapshotRecord[] = [];
    const queue = [...symbols];
    const worker = async () => {
      for (let symbol = queue.shift(); symbol !== undefined; symbol = queue.shift()) {
        const market = causeMarketOf(symbol);
        const tradeDate = dates[market];
        if (!tradeDate) continue;
        try {
          const view = await this.deps.causes.snapshot(market, symbol);
          const row = view && toCauseSnapshot(market, symbol, tradeDate, now, { split: view.split, causes: view.cause.causes, changeRate: view.cause.result.changeRate });
          if (row) rows.push(row);
          else summary.skipped += 1;
        } catch (error) {
          summary.failed += 1;
          logger.warn(`원인 스냅샷 실패 — 그 종목만 빠짐: ${symbol} ${(error as Error).name}`);
        }
      }
    };
    await Promise.all(Array.from({ length: CAUSE_RECORD_CONCURRENCY }, worker));

    summary.recorded = await this.deps.store.saveMany(rows);
    summary.unchanged = rows.length - summary.recorded;
    return summary;
  }
}
