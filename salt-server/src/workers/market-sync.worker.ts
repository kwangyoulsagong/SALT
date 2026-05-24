import prisma from "../config/database";
import axios from "axios";

const UPBIT_API = "https://api.upbit.com/v1";

export class MarketSyncWorker {
  async sync() {
    const res = await axios.get(`${UPBIT_API}/market/all`);
    const markets = res.data.filter((m: any) => m.market.startsWith("KRW-"));

    for (const m of markets) {
      await prisma.marketAsset.upsert({
        where: { symbol: m.market.replace("KRW-", "") },
        update: {
          koreanName: m.korean_name,
          englishName: m.english_name,
          isActive: true,
        },
        create: {
          symbol: m.market.replace("KRW-", ""),
          market: m.market,
          koreanName: m.korean_name,
          englishName: m.english_name,
          listedAt: new Date(),
        },
      });
    }

    // 상폐 처리
    await prisma.marketAsset.updateMany({
      where: {
        symbol: {
          notIn: markets.map((m: any) => m.market.replace("KRW-", "")),
        },
      },
      data: { isActive: false, delistedAt: new Date() },
    });

    console.log("🔁 Market sync completed.");
  }
}

const worker = new MarketSyncWorker();
worker.sync();
