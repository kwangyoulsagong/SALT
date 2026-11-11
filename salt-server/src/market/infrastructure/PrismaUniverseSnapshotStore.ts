import prisma from "../../shared/infrastructure/prisma";
import type { MarketAssetType, UniverseSnapshotRow, UniverseSnapshotStore } from "../domain";

/** 추적 목록 일별 스냅샷(`DB-REQ-044` FR-1) — 불변 표(UPDATE 트리거). 재실행은 `ON CONFLICT DO NOTHING` — 한 문장 */
export class PrismaUniverseSnapshotStore implements UniverseSnapshotStore {
  async capture(asOfDate: string, rows: UniverseSnapshotRow[], capturedAt: Date) {
    if (rows.length === 0) return 0;
    return prisma.$executeRaw`
      INSERT INTO market_universe_snapshot (as_of_date, asset_type, symbol, source, rank, captured_at)
      SELECT ${asOfDate}::date, u.asset_type::"AssetType", u.symbol, u.source, u.rank, ${capturedAt}::timestamptz
      FROM unnest(
        ${rows.map((r) => r.assetType)}::text[], ${rows.map((r) => r.symbol)}::text[],
        ${rows.map((r) => r.source)}::text[], ${rows.map((r) => r.rank)}::int[]
      ) AS u(asset_type, symbol, source, rank)
      ON CONFLICT DO NOTHING`;
  }

  async latestBefore(assetType: MarketAssetType, asOfDate: string) {
    // 인덱스 (asset_type, as_of_date) — 날 하나를 고르고 그 날 행만
    const rows = await prisma.$queryRaw<Array<{ symbol: string }>>`
      SELECT symbol FROM market_universe_snapshot
      WHERE asset_type = ${assetType}::"AssetType" AND as_of_date = (
        SELECT max(as_of_date) FROM market_universe_snapshot
        WHERE asset_type = ${assetType}::"AssetType" AND as_of_date < ${asOfDate}::date)`;
    return rows.length === 0 ? null : rows.map((r) => r.symbol);
  }
}
