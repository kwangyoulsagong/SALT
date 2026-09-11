import type { MarketApi } from "../../market/application/api";
import type { ClosePriceFact, PriceHistorySource } from "../domain";

/**
 * `market` 을 우리 언어로 번역하는 **ACL** (`ddd-infrastructure.md` §5).
 *
 * 이름이 `MarketContextAdapter` 가 아니다 — **무엇을 가져오는지**가 이름이다.
 * `portfolio` 가 `market` 을 아는 유일한 지점이고, `application` 은
 * `PriceHistorySource` 만 본다.
 */
export class PriceHistoryAdapter implements PriceHistorySource {
  constructor(private readonly market: MarketApi) {}

  closesSince(symbols: string[], since: Date): Promise<ClosePriceFact[]> {
    return this.market.closesSince(symbols, since);
  }
}
