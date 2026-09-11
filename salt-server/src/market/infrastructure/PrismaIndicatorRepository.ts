import { Timeframe } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type {
  IndicatorRepository,
  IndicatorSet,
  MarketAssetType,
  StoredIndicator,
} from "../domain";

/**
 * `timeframe` 은 DB enum(`Timeframe`)이다. 유스케이스는 문자열로 다루고 여기서 좁힌다 —
 * `domain` 이 `@prisma/client` 를 import 할 수 없기 때문이다 (`server-architecture.md` §3).
 */
const toTimeframe = (value: string): Timeframe => {
  if (!(value in Timeframe)) {
    throw new Error(`알 수 없는 타임프레임이다: ${value}`);
  }
  return Timeframe[value as keyof typeof Timeframe];
};

export class PrismaIndicatorRepository implements IndicatorRepository {
  async upsert(input: {
    symbol: string;
    assetType: MarketAssetType;
    timeframe: string;
    timestamp: Date;
    indicators: IndicatorSet;
  }) {
    const timeframe = toTimeframe(input.timeframe);

    await prisma.technicalIndicator.upsert({
      where: {
        symbol_timeframe_timestamp: {
          symbol: input.symbol,
          timeframe,
          timestamp: input.timestamp,
        },
      },
      create: {
        symbol: input.symbol,
        timeframe,
        assetType: input.assetType,
        timestamp: input.timestamp,
        rsi14: input.indicators.rsi14,
        ma20: input.indicators.ma20,
        ma50: input.indicators.ma50,
        volumeAvg20: input.indicators.volumeAvg20,
      },
      update: {
        rsi14: input.indicators.rsi14,
        ma20: input.indicators.ma20,
        ma50: input.indicators.ma50,
        volumeAvg20: input.indicators.volumeAvg20,
      },
    });
  }

  /**
   * 최신 지표.
   *
   * `rsi14`·`ma20` 등은 nullable 이다. **`null` 을 그대로 내보내지 않고 0 으로 바꾸지도
   * 않는다** — 둘 다 거짓말이다. 값이 없는 지표가 섞인 행은 소비처가 판단할 수 있게
   * `null` 을 유지하고, 타입에도 그대로 드러낸다.
   */
  async findLatest(symbol: string): Promise<StoredIndicator | null> {
    const row = await prisma.technicalIndicator.findFirst({
      where: { symbol },
      orderBy: { timestamp: "desc" },
    });
    if (!row) return null;

    return {
      symbol: row.symbol,
      timeframe: row.timeframe,
      timestamp: row.timestamp,
      rsi14: row.rsi14,
      ma20: row.ma20,
      ma50: row.ma50,
      volumeAvg20: row.volumeAvg20,
    };
  }
}
