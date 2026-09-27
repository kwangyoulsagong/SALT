import "dotenv/config";
import { PrismaIndicatorRepository } from "./src/market/infrastructure/PrismaIndicatorRepository";
import { PrismaMarketAssetRepository } from "./src/market/infrastructure/PrismaMarketAssetRepository";
import { PrismaPriceHistoryRepository } from "./src/market/infrastructure/PrismaPriceHistoryRepository";
import { RefreshTechnicalIndicators } from "./src/market/application/RefreshTechnicalIndicators";
import prisma from "./src/shared/infrastructure/prisma";

(async () => {
  const t = Date.now();
  const r = await new RefreshTechnicalIndicators(
    new PrismaMarketAssetRepository(),
    new PrismaPriceHistoryRepository(),
    new PrismaIndicatorRepository()
  ).execute();
  console.log("refreshed", r, `${Date.now() - t}ms`);
  const rows = await prisma.$queryRaw<Array<{ timeframe: string; n: number; latest: Date }>>`
    SELECT timeframe::text, COUNT(*)::int AS n, MAX(timestamp) AS latest FROM technical_indicators GROUP BY 1 ORDER BY 1`;
  console.log(rows);
  const btc = await prisma.technicalIndicator.findMany({ where: { symbol: "BTC" }, select: { timeframe: true, rsi14: true, ma20: true, timestamp: true } });
  console.log(btc);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
