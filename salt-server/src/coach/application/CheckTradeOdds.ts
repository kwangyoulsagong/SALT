import { logger } from "../../shared/config/logger";
import {
  BASE_RATE_KEY,
  CONDITION_PHRASE,
  HORIZON_PHRASE,
  SUMMARY_HORIZON,
  judgmentAssetClassFor,
  matchConditions,
  rangePhrase,
  tradeCheckSummary,
  type BaseRateReader,
  type BaseRateRow,
  type BaseRateTriggerRow,
  type MarketProbe,
  type PortfolioProbe,
  type TradeCheckLedger,
  type TradeCheckMarket,
  type TradeCheckNoConditionReason,
  type TradeCheckSide,
  type TradeCheckStatus,
} from "../domain";

export interface TradeCheckQuery {
  symbol: string;
  side: TradeCheckSide;
}

export interface TradeCheckDistribution {
  horizon: number;
  horizonLabel: string;
  status: "ok" | "below_min";
  sample: number;
  sampleDays: number;
  /** 사기 전 — 비용 뒤 로그수익 분포(비율). below_min 이면 null */
  upRate: number | null;
  mean: number | null;
  q10: number | null;
  q50: number | null;
  q90: number | null;
  rangeText: string | null;
  /** 팔기 전 — 같은 조건에서 더 들고 있었을 때(비용 전) */
  hold: { upRate: number | null; q10: number | null; q50: number | null; q90: number | null; rangeText: string | null };
}

export interface TradeCheckView {
  symbol: string;
  market: TradeCheckMarket;
  side: TradeCheckSide;
  status: TradeCheckStatus;
  /** 맨 위 한 줄 — 서버가 실제 숫자로 만든 문장. BFF · 화면은 고치지 않는다 */
  summary: string;
  /** 조건 없음의 이유 — status = no_condition 일 때만 */
  conditionReason: TradeCheckNoConditionReason | null;
  condition: { id: string; phrase: string; describeOnly: boolean } | null;
  /** 같이 성립한 다른 조건(우선순위 순) */
  alsoMatched: { id: string; phrase: string }[];
  horizon: number;
  horizonLabel: string;
  /** 요약 지평의 숫자 — 100칸 점의 근거. below_min · 조건 없음이면 평소 값(usual)만 */
  sample: number | null;
  sampleDays: number | null;
  sampleEffective: number | null;
  upRate: number | null;
  /** Wilson 95%(유효 n) */
  upRange: { low: number; high: number } | null;
  /** 예측이 Holm 을 통과시킨 행만 — 서술 조건 · 평소는 null */
  differsFromUsual: "higher" | "lower" | null;
  /** 최근 1년이 전체 범위 밖 — 숨기지 않고 표시만 */
  recentDiffers: boolean | null;
  usual: { upRate: number | null; holdUpRate: number | null; sample: number } | null;
  distributions: TradeCheckDistribution[];
  /** 팔기 전 + 보유 있을 때만 — 지금 팔면 확정되는 수익률(%). 요약 문장에는 넣지 않는다(펼침 칸) */
  holding: { realizedPct: number } | null;
  reference: { close: number | null; at: string | null; computedAt: string | null };
  disclaimer: string;
}

const DISCLAIMER =
  "과거 비슷한 상황 뒤 가격이 움직인 분포입니다. 이번에도 같다는 뜻이 아니며 투자 판단과 손실 책임은 본인에게 있습니다.";

const distribution = (market: TradeCheckMarket, r: BaseRateRow): TradeCheckDistribution => ({
  horizon: r.horizon,
  horizonLabel: HORIZON_PHRASE[market][r.horizon] ?? `${r.horizon}일 뒤`,
  status: r.status,
  sample: r.sample,
  sampleDays: r.sampleDays,
  upRate: r.upRate,
  mean: r.mean,
  q10: r.q10,
  q50: r.q50,
  q90: r.q90,
  rangeText: rangePhrase(r.q10, r.q50, r.q90),
  hold: {
    upRate: r.holdUpRate,
    q10: r.holdQ10,
    q50: r.holdQ50,
    q90: r.holdQ90,
    rangeText: rangePhrase(r.holdQ10, r.holdQ50, r.holdQ90),
  },
});

/**
 * 사기 전 · 팔기 전 점검(F017 v2 단계 2 · `SRV-REQ-053` FR-4) — 화면 맨 위 쉬운 한 줄.
 *
 * 요청 경로는 저장값만(외부 호출 · LLM 0): 저장 시세 1 + 예측 뷰 2 + (팔기 전) 보유 1 + 원장 쓰기 1.
 * 예측 뷰를 못 읽으면 500 이 아니라 `no_condition`(not_covered) — 칸은 늘 보인다(`ADR-010` v2 막지 않기).
 */
export class CheckTradeOdds {
  constructor(
    private readonly market: MarketProbe,
    private readonly portfolio: PortfolioProbe,
    private readonly baseRates: BaseRateReader,
    private readonly ledger: TradeCheckLedger,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(userId: string, query: TradeCheckQuery): Promise<TradeCheckView> {
    const symbol = query.symbol.trim().toUpperCase();
    const now = this.now();
    const quote = (await this.market.quotes([symbol])).get(symbol);
    const assetClass = judgmentAssetClassFor(quote?.assetType);
    const market: TradeCheckMarket = assetClass === "kr_stock" ? "kr" : "crypto";

    const [read, holding] = await Promise.all([
      Promise.all([this.baseRates.stats(market), this.baseRates.triggers(symbol, market)]).catch((error: unknown) => {
        logger.warn("점검 기저율 읽기 실패 — not_covered 로", { symbol, error: String(error) });
        return null;
      }),
      query.side === "sell" ? this.portfolio.getHolding(userId, symbol, assetClass) : Promise.resolve(null),
    ]);
    const stats: BaseRateRow[] = read?.[0] ?? [];
    const triggers: BaseRateTriggerRow[] = read?.[1] ?? [];

    const match = matchConditions(
      market,
      triggers,
      {
        price: quote?.currentPrice ?? null,
        open: quote?.openPrice ?? null,
        tradeValue: quote?.tradeValue24h ?? null,
        updatedAt: quote?.priceUpdatedAt ?? null,
      },
      now
    );
    const primary = match.matched[0] ?? null;
    const rowsOf = (id: string) => stats.filter((r) => r.conditionId === id).sort((a, b) => a.horizon - b.horizon);
    const conditionRows = primary ? rowsOf(primary) : [];
    const usualRows = rowsOf("ALL");
    const conditionHead = conditionRows.find((r) => r.horizon === SUMMARY_HORIZON) ?? null;
    const usualHead = usualRows.find((r) => r.horizon === SUMMARY_HORIZON) ?? null;
    const head = conditionHead ?? usualHead;

    // 조건 행이 아직 없으면(예측이 이 조건을 못 냈다) 지어내지 않고 조건 없음으로
    const status: TradeCheckStatus = !conditionHead
      ? "no_condition"
      : conditionHead.status === "below_min"
        ? "below_min"
        : "ok";
    const summary = tradeCheckSummary({ market, side: query.side, condition: conditionHead, usual: usualHead });
    const rate = head ? (query.side === "buy" ? head.upRate : head.holdUpRate) : null;
    const refClose = triggers.find((t) => t.appliesTo === "next")?.refClose ?? triggers[0]?.refClose ?? null;

    if (match.refAt) {
      void this.ledger
        .record({
          symbol,
          market,
          side: query.side,
          conditionId: conditionHead ? conditionHead.conditionId : "NONE",
          horizon: SUMMARY_HORIZON,
          refAt: match.refAt,
          preregKey: BASE_RATE_KEY,
          status,
          upRate: rate,
          sampleEff: head?.sampleEff ?? null,
          priceAtCheck: quote?.currentPrice ?? null,
          checkedAt: now,
        })
        .catch((error: unknown) => logger.warn("점검 원장 쓰기 실패", { symbol, error: String(error) }));
    }

    return {
      symbol,
      market,
      side: query.side,
      status,
      summary,
      conditionReason: status === "no_condition" ? (match.reason ?? "none_matched") : null,
      condition: conditionHead
        ? {
            id: conditionHead.conditionId,
            phrase: CONDITION_PHRASE[conditionHead.conditionId] ?? conditionHead.conditionId,
            describeOnly: conditionHead.kind === "describe",
          }
        : null,
      alsoMatched: match.matched.slice(1).map((id) => ({ id, phrase: CONDITION_PHRASE[id] ?? id })),
      horizon: SUMMARY_HORIZON,
      horizonLabel: HORIZON_PHRASE[market][SUMMARY_HORIZON],
      sample: head?.sample ?? null,
      sampleDays: head?.sampleDays ?? null,
      sampleEffective: head ? Math.round(head.sampleEff) : null,
      upRate: status === "below_min" ? null : rate,
      upRange:
        status === "ok" && conditionHead?.upLow != null && conditionHead.upHigh != null && query.side === "buy"
          ? { low: conditionHead.upLow, high: conditionHead.upHigh }
          : null,
      differsFromUsual: query.side === "buy" && status === "ok" ? (conditionHead?.differs ?? null) : null,
      recentDiffers: head?.recentDiffers ?? null,
      usual: usualHead
        ? { upRate: usualHead.upRate, holdUpRate: usualHead.holdUpRate, sample: usualHead.sample }
        : null,
      distributions: (conditionRows.length > 0 ? conditionRows : usualRows).map((r) => distribution(market, r)),
      holding: holding ? { realizedPct: holding.unrealizedProfitRate } : null,
      reference: {
        close: refClose,
        at: match.refAt?.toISOString() ?? null,
        computedAt: head?.asOf.toISOString() ?? null,
      },
      disclaimer: DISCLAIMER,
    };
  }
}
