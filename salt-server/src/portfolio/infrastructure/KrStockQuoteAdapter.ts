import type { MarketApi } from "../../market/application/api";
import type { KrStockQuoteSource } from "../domain";

/**
 * 국내 주식 종목 확인 · 현재가 — `market` 을 우리 언어로 번역하는 **ACL**(F011 슬라이스 3b).
 *
 * 꺼짐 · 비소유자 · 없는 코드의 예외는 `market` 이 던진 그대로 올린다 — `DomainError` 라 전역 미들웨어가
 * 503 · 404 로 옮기고, 관심 종목 추가와 같은 응답이 된다.
 */
export class KrStockQuoteAdapter implements KrStockQuoteSource {
  constructor(private readonly market: MarketApi) {}

  async assertTradable(email: string | undefined, code: string): Promise<void> {
    await this.market.krStockListing(email, code);
  }

  async prices(codes: string[]) {
    const rows = await this.market.krStockPrices(codes);
    return rows.map((row) => ({ symbol: row.code, currentPrice: row.price }));
  }
}
