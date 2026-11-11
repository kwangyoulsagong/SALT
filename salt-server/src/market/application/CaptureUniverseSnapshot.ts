import { logger } from "../../shared/config/logger";
import {
  kstDateOf,
  universeSnapshotRows,
  type KrStockStore,
  type MarketAssetRepository,
  type UniverseSnapshotStore,
} from "../domain";

/**
 * 추적 목록 일별 스냅샷(`SRV-REQ-057` FR-7) — 과거 검산이 "그날 추적하던 종목"으로 표본을 고르게(`FC-REQ-028` FR-5).
 * 하루 한 번 · 재실행 멱등(이미 있는 행은 그대로 — 표가 불변이다). 국내가 꺼져 있으면(`kr` 없음) 코인만
 */
export class CaptureUniverseSnapshot {
  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly store: UniverseSnapshotStore,
    private readonly kr: { store: KrStockStore; held: { heldCodes(): Promise<string[]> }; topN: number } | null,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const at = this.now();
    const [cryptoActive, kr] = await Promise.all([
      this.assets.activeSymbols("crypto"),
      this.kr
        ? Promise.all([this.kr.held.heldCodes(), this.kr.store.watchedCodes(), this.kr.store.topByMarketCap(this.kr.topN)]).then(
            ([held, watched, topByMarketCap]) => ({ held, watched, topByMarketCap })
          )
        : null,
    ]);
    const rows = universeSnapshotRows({ cryptoActive, kr });
    const asOfDate = kstDateOf(at);
    const written = await this.store.capture(asOfDate, rows, at);
    logger.info(`📸 추적 목록 스냅샷 ${asOfDate}: ${rows.length}행 (새로 ${written})`);
    return { asOfDate, rows: rows.length, written };
  }
}
