import type { MarketApi } from "../../market/application/api";
import type { PortfolioApi } from "../../portfolio/application/api";
import type { TrackedAssetProbe } from "../domain";

/**
 * `market` + `portfolio` → `coach` ACL. 추적 자산 = 관심 종목 ∪ 보유 (감사 문서 D8 · B25).
 *
 * **크립토만** 본다. 종목 판단의 재료(심리 · 대량 체결 · 5분봉)가 업비트에서만 오고,
 * `HoldingTradeAdapter` 도 같은 이유로 `crypto` 를 고정한다. 주식 판단은 `DB-REQ-003`
 * (자산군 확장 · 감사 문서 Q2) 이후다.
 */
export class TrackedAssetAdapter implements TrackedAssetProbe {
  constructor(
    private readonly market: MarketApi,
    private readonly portfolio: PortfolioApi
  ) {}

  async listTrackedSymbols(): Promise<string[]> {
    const [watched, held] = await Promise.all([
      this.market.watchedSymbols(),
      this.portfolio.heldSymbols("crypto"),
    ]);

    return Array.from(
      new Set([...watched, ...held].map((symbol) => symbol.toUpperCase()))
    ).sort();
  }
}
