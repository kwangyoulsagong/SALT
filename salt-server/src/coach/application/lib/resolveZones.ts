import {
  heldRuleZone,
  OBSERVATION_FRACTIONS,
  OBSERVATION_RULE,
  observationZone,
  type CoachHolding,
  type CoachMode,
  type CoachQuote,
  type MarketProbe,
  type Zone,
} from "../../domain";

const DAY_MS = 24 * 3600_000;

export interface ZoneInput {
  symbol: string;
  holding: CoachHolding | null;
  quote: CoachQuote | undefined;
  now: Date;
}

const observe = async (
  market: MarketProbe,
  mode: CoachMode,
  symbol: string,
  currentPrice: number,
  now: Date
): Promise<Zone> => {
  const rule = OBSERVATION_RULE[mode];
  const since = new Date(now.getTime() - rule.days * DAY_MS);
  const distribution = await market.closePercentiles(
    symbol,
    rule.timeframe,
    since,
    OBSERVATION_FRACTIONS
  );
  return observationZone(mode, currentPrice, distribution);
};

/**
 * 두 모드의 `zone` (F004 · `SRV-REQ-024` FR-110~116).
 *
 * | 조건 | zone |
 * |---|---|
 * | 보유 | `held_rule` — 두 모드가 **같다**. 규칙 가격은 보유의 것이지 관점의 것이 아니다 |
 * | 미보유 · 주식 | `unavailable(out_of_scope)` — D12 |
 * | 미보유 · 현재가 없음 | `unavailable(insufficient_price_history)` |
 * | 미보유 · 크립토 | `observation` — 모드마다 기간이 다르다(단타 24시간 · 장기 1년) |
 *
 * 자산군 enum 이 `crypto` · `stock` 둘뿐이라 **국내 주식(`excluded_asset`)을 따로 가리지
 * 못한다** — 미보유 주식은 전부 `out_of_scope` 다. `DB-REQ-003`(자산군 확장) 이후에 갈린다.
 */
export const resolveZones = async (
  market: MarketProbe,
  input: ZoneInput
): Promise<Record<CoachMode, Zone>> => {
  const { symbol, holding, quote, now } = input;

  if (holding) {
    const zone = heldRuleZone(holding);
    return { scalp: zone, long_term: zone };
  }

  if (quote?.assetType === "stock") {
    const zone: Zone = { kind: "unavailable", reasonCode: "out_of_scope" };
    return { scalp: zone, long_term: zone };
  }

  const currentPrice = quote?.currentPrice;
  if (!currentPrice) {
    const zone: Zone = {
      kind: "unavailable",
      reasonCode: "insufficient_price_history",
    };
    return { scalp: zone, long_term: zone };
  }

  const [scalp, longTerm] = await Promise.all([
    observe(market, "scalp", symbol, currentPrice, now),
    observe(market, "long_term", symbol, currentPrice, now),
  ]);
  return { scalp, long_term: longTerm };
};
