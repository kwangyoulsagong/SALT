import { logger } from "../../shared/config/logger";
import {
  isForecastOwner,
  judgmentAssetClassFor,
  matchConditions,
  toScenarioCells,
  toScenarioHorizons,
  type BaseRateReader,
  type MarketProbe,
  type ScenarioCellView,
  type ScenarioHorizonView,
  type ScenarioMarket,
  type ShortHorizonReader,
} from "../domain";

export interface SymbolScenarioView {
  symbol: string;
  market: ScenarioMarket;
  /** 늘 넷(1h · 4h · 1d · 5d) · 칸이 비지 않는다 — 모델이 화면 허가를 못 받은 칸은 과거 실제 결과 */
  horizons: ScenarioCellView[];
  /** 화면 하단 고정 문구 */
  disclaimer: string;
}

const DISCLAIMER =
  "과거에 실제로 그랬던 비율입니다. 이번에도 같다는 뜻이 아니며, 시험(사전등록 · 비용 차감 · 보정도)을 넘은 칸만 모델 확률로 바뀝니다. 투자 판단과 손실 책임은 본인에게 있습니다.";

/**
 * 시나리오 — 모든 종목 · 지평 넷에 늘(F017 v4 순서 1 · `SRV-REQ-053` FR-10 · `ADR-010` v4).
 *
 * 로그인한 누구나 본다. 칸마다 출처가 실린다: 모델 확률은 **소유자 + 시험을 넘은 칸**만(`ADR-003` — 소유자가 아니면 모델 뷰를
 * 읽지도 않는다), 나머지는 과거 실제 결과(`base-rate@1` — 점검 한 줄과 같은 뷰 · 같은 조건 판정).
 * 요청 경로는 저장값만: 저장 시세 1 + 기저율 뷰 2 (+ 소유자면 모델 뷰 2). 읽기가 실패해도 500 이 아니라 그 칸이 결함 단으로 내려간다.
 */
export class GetSymbolScenario {
  constructor(
    private readonly reader: ShortHorizonReader,
    private readonly baseRates: BaseRateReader,
    private readonly market: MarketProbe,
    private readonly ownerEmails: readonly string[],
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(user: { userId: string; email?: string }, symbol: string): Promise<SymbolScenarioView> {
    const normalized = symbol.trim().toUpperCase();
    const now = this.now();
    const quote = (await this.market.quotes([normalized])).get(normalized);
    const market: ScenarioMarket = judgmentAssetClassFor(quote?.assetType) === "kr_stock" ? "kr" : "crypto";

    const [models, rates] = await Promise.all([
      isForecastOwner(user.email, this.ownerEmails) ? this.models(normalized, market, now) : Promise.resolve(null),
      Promise.all([this.baseRates.stats(market), this.baseRates.triggers(normalized, market)]).catch((error: unknown) => {
        logger.warn("시나리오 기저율 읽기 실패 — 결함 단으로", { symbol: normalized, error: String(error) });
        return null;
      }),
    ]);
    const [stats, triggers] = rates ?? [[], []];
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
    return {
      symbol: normalized,
      market,
      horizons: toScenarioCells(market, models, { stats, matched: match.matched, price: quote?.currentPrice ?? null }),
      disclaimer: DISCLAIMER,
    };
  }

  /** 모델 칸 — 소유자만. 뷰 읽기가 실패하면 지평 셋 전부 `not_tested`(과거 실제 결과가 그 자리를 채운다) */
  private async models(symbol: string, market: ScenarioMarket, now: Date): Promise<ScenarioHorizonView[]> {
    const read = await Promise.all([this.reader.cells(market), this.reader.predictions(symbol, market)]).catch(
      (error: unknown) => {
        logger.warn("시나리오 모델 뷰 읽기 실패 — not_tested 로", { symbol, error: String(error) });
        return null;
      }
    );
    const [cells, predictions] = read ?? [[], []];
    return toScenarioHorizons(market, cells, predictions, now);
  }
}
