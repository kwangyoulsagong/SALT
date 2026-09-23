import type { CoachInsight, MarketProbe, PerformanceSample } from "../../domain";

export interface SampleSource {
  insight: CoachInsight;
  identity: { symbol: string; signalKey: string };
}

/**
 * 판단 행 → 성적 표본. 진입가는 판단 시각 이후 첫 종가, 비교가는 **최신** 종가다.
 *
 * `signal-performance` 와 코치 상세가 **같은 함수**로 센다 — 두 화면이 같은 판단에
 * 다른 승률을 말하지 않게. 최신가는 심볼 단위라 한 번에 받고, 진입가는 판단 시각마다
 * 달라 아직 건별이다(`GetSignalPerformance` 주석).
 */
export const collectPerformanceSamples = async (
  market: MarketProbe,
  rows: SampleSource[]
): Promise<PerformanceSample[]> => {
  const latestCloses = await market.latestCloses(
    Array.from(new Set(rows.map((row) => row.identity.symbol)))
  );

  const samples: PerformanceSample[] = [];

  for (const { insight, identity } of rows) {
    const latestPrice = latestCloses.get(identity.symbol);
    if (!latestPrice) continue;

    const entryPrice = await market.closeAtOrAfter(
      identity.symbol,
      insight.createdAt
    );
    // 진입가가 0 이면 수익률의 분모가 없다 — 표본에서 뺀다 (원문과 같다).
    if (!entryPrice) continue;

    const returnRate = (latestPrice - entryPrice) / entryPrice;

    samples.push({
      insightId: insight.id,
      symbol: identity.symbol,
      signalKey: identity.signalKey,
      createdAt: insight.createdAt,
      entryPrice,
      latestPrice,
      returnRate,
      win: returnRate > 0,
    });
  }

  return samples;
};
