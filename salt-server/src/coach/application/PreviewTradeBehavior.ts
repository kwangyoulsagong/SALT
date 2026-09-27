import Decimal from "decimal.js";

import {
  CHASING_LOOKBACK_MS,
  edgeWarningsFor,
  previewBuyTags,
  replayLedger,
  sellFramingFor,
  SIZING_FEE_RATE_PER_SIDE,
  sortLedgerAscending,
  tagCosts,
  type AutoMistakeTag,
  type DecisionOutcomeStore,
  type MarketProbe,
  type PortfolioProbe,
  type SellFraming,
  type TagCost,
  type TradePlanStore,
} from "../domain";
import { TRADE_HISTORY_LIMIT } from "./lib/loadTradeHistory";

const OUTCOME_READ_LIMIT = 5000;
/** 매도 프레이밍이 보는 이 종목 계획 수. 남은 매수에 연결된 최신 하나만 쓴다 */
const SELL_PLAN_LIMIT = 50;

export interface PreviewTradeBehaviorCommand {
  symbol: string;
  side: "buy" | "sell";
  quantity: Decimal;
  price: Decimal;
  hasPlan: boolean;
}

export type TradeBehaviorPreview =
  | { status: "truncated" }
  | {
      status: "ok";
      /** 매수만. 이 거래가 저장되면 배치가 붙일 자동 태그 후보 */
      candidateTags: AutoMistakeTag[];
      chasingUnknown: boolean;
      /** 후보 중 엣지 없음(표본 ≥ 20 · 기대값 음수)만 — 폼이 한 줄씩 보인다(FR-19) */
      edgeWarnings: TagCost[];
      /** 매도만(시나리오 5) */
      sellFraming: SellFraming | null;
    };

/**
 * 거래 입력 중 행동 미리보기 — `POST /api/coach/size-check` 의 `behavior` (`SRV-REQ-038` FR-12).
 *
 * 사이즈 계산과 같이 불리지만 따로 실패한다 — 여기가 실패해도 사이즈 결과 줄은 나간다(`CheckTradeSize`).
 * 저장하지 않는다. 판정은 배치 몫이다.
 *
 * 쿼리: 거래 1 · (매수) 결과 1 · 5분봉 최고가 1 / (매도) 계획 1 · 현재가 1.
 */
export class PreviewTradeBehavior {
  constructor(
    private readonly portfolio: PortfolioProbe,
    private readonly tradePlans: TradePlanStore,
    private readonly outcomes: DecisionOutcomeStore,
    private readonly market: MarketProbe,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(userId: string, command: PreviewTradeBehaviorCommand): Promise<TradeBehaviorPreview> {
    const symbol = command.symbol.toUpperCase();
    const now = this.now();

    const ledger = await this.portfolio.listLedgerSince(userId, new Date(0), TRADE_HISTORY_LIMIT);
    if (ledger.truncated) return { status: "truncated" };
    const entries = ledger.entries.map((entry) => ({ ...entry, symbol: entry.symbol.toUpperCase() }));

    if (command.side === "sell") {
      const [plans, quotes] = await Promise.all([
        this.tradePlans.listOwned(userId, { symbol, limit: SELL_PLAN_LIMIT }),
        this.market.quotes([symbol]),
      ]);
      const current = quotes.get(symbol)?.currentPrice ?? null;
      return {
        status: "ok",
        candidateTags: [],
        chasingUnknown: false,
        edgeWarnings: [],
        sellFraming: sellFramingFor(
          symbol,
          replayLedger(sortLedgerAscending(entries)),
          plans,
          current === null ? null : new Decimal(current)
        ),
      };
    }

    const [outcomes, high] = await Promise.all([
      this.outcomes.listOwned(userId, OUTCOME_READ_LIMIT),
      this.market.highestCloseBetween(symbol, new Date(now.getTime() - CHASING_LOOKBACK_MS), now),
    ]);
    const preview = previewBuyTags({
      entries,
      symbol,
      quantity: command.quantity,
      price: command.price,
      fee: command.quantity.times(command.price).times(SIZING_FEE_RATE_PER_SIDE),
      at: now,
      highBefore: high === null ? null : new Decimal(high),
      hasPlan: command.hasPlan,
    });

    return {
      status: "ok",
      candidateTags: preview.tags,
      chasingUnknown: preview.chasingUnknown,
      edgeWarnings: edgeWarningsFor(
        preview.tags,
        tagCosts(outcomes.filter((outcome) => outcome.sampleOrigin === "live"))
      ),
      sellFraming: null,
    };
  }
}
