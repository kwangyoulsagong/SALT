import type { CoachIndicator, CoachSentiment, MarketRegime } from "../model";

/**
 * 시장 국면 판정 — `market-regime.service` 에서 옮겨온 **순수 판정**.
 *
 * 원문은 이 다섯 줄의 `if` 를 위해 `prisma.technicalIndicator` 와
 * `prisma.marketSentiment` 를 직접 조회했다. 조회는 `MarketProbe` 가 하고,
 * 여기는 **값만 받는다**.
 *
 * ## 기본값 50 을 그대로 둔다
 *
 * 지표가 없으면 RSI 를 50(중립), 공포지수를 50 으로 본다. "없음"과 "중립"을 같게
 * 보는 것이라 판단이 섞이지만, 바꾸면 국면이 달라진다 — 이관에서 하지 않는다.
 */
export const detectMarketRegime = (
  indicator: CoachIndicator | null | undefined,
  sentiment: CoachSentiment | null | undefined
): MarketRegime => {
  if (!indicator && !sentiment) return "sideways";

  const rsi = indicator?.rsi14 ?? 50;
  const fearGreed = sentiment?.fearGreedIndex ?? 50;

  if (fearGreed < 25 && rsi < 30) return "panic";
  if (fearGreed > 75 && rsi > 70) return "euphoric";
  if (rsi >= 60) return "bullish";
  if (rsi <= 40) return "bearish";

  return "sideways";
};
