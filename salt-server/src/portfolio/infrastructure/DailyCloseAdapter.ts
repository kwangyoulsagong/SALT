import type { MarketApi } from "../../market/application/api";
import type { DailyClose, DailyCloseSource, PortfolioAssetType } from "../domain";

/** `market` 일봉 종가를 우리 언어로(ACL) — 평가금 흐름 · 레이더(F006 G절) */
export class DailyCloseAdapter implements DailyCloseSource {
  constructor(private readonly market: MarketApi) {}

  dailyClosesSince(items: Array<{ symbol: string; assetType: PortfolioAssetType }>, since: Date): Promise<DailyClose[]> {
    return this.market.dailyClosesSince(items, since);
  }
}
