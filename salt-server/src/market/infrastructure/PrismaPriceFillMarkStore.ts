import prisma from "../../shared/infrastructure/prisma";
import type { MarketAssetType, PriceFillMarkStore, PriceTimeframe } from "../domain";

/**
 * 5분봉 채운 위치(`DB-REQ-044` FR-2). 쓰기는 한 문장 — 앞으로만(`WHERE filled_through < EXCLUDED`)이라 늦게 끝난 회차가
 * 위치를 뒤로 돌리지 못한다
 */
export class PrismaPriceFillMarkStore implements PriceFillMarkStore {
  async marks(assetType: MarketAssetType, timeframe: PriceTimeframe, symbols: string[]) {
    if (symbols.length === 0) return new Map<string, Date>();
    const rows = await prisma.priceFillMark.findMany({
      where: { assetType, timeframe, symbol: { in: symbols } },
      select: { symbol: true, filledThrough: true },
    });
    return new Map(rows.map((row) => [row.symbol, row.filledThrough]));
  }

  async advance(
    assetType: MarketAssetType,
    timeframe: PriceTimeframe,
    marks: Array<{ symbol: string; filledThrough: Date }>,
    at: Date
  ) {
    if (marks.length === 0) return;
    await prisma.$executeRaw`
      INSERT INTO price_fill_mark (asset_type, symbol, timeframe, filled_through, updated_at)
      SELECT ${assetType}::"AssetType", u.symbol, ${timeframe}, u.through, ${at}::timestamptz
      FROM unnest(${marks.map((m) => m.symbol)}::text[], ${marks.map((m) => m.filledThrough)}::timestamptz[]) AS u(symbol, through)
      ON CONFLICT (asset_type, symbol, timeframe) DO UPDATE SET
        filled_through = EXCLUDED.filled_through, updated_at = EXCLUDED.updated_at
      WHERE price_fill_mark.filled_through < EXCLUDED.filled_through`;
  }
}
