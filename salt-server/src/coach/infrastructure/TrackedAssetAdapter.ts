import type { MarketApi } from "../../market/application/api";
import type { PortfolioApi } from "../../portfolio/application/api";
import type { TrackedAssetProbe } from "../domain";

/**
 * `market` + `portfolio` → `coach` ACL. 추적 자산 = 관심 종목 ∪ 보유 (감사 문서 D8 · B25) ∪ 국내 주식 유니버스.
 *
 * 코인은 관심 · 보유. 국내 주식은 **시세를 모으는 유니버스 전체**(보유 → 관심 → 시총 상위, F011 슬라이스 4) —
 * 재료(시세 · 일봉 · 지표)가 그 종목들에만 있고, 장기 판단은 종목당 30일에 1표본이라 관심 · 보유만 보면 판단 유형별
 * 표본 20 이 몇 년 걸린다. 국내 주식이 꺼져 있으면 빈 목록이다
 */
export class TrackedAssetAdapter implements TrackedAssetProbe {
  constructor(
    private readonly market: MarketApi,
    private readonly portfolio: PortfolioApi
  ) {}

  async listTrackedSymbols(): Promise<string[]> {
    const [watched, held, kr] = await Promise.all([
      this.market.watchedSymbols(),
      this.portfolio.heldSymbols("crypto"),
      this.market.krJudgmentUniverse(),
    ]);

    return Array.from(
      new Set([...watched, ...held, ...kr].map((symbol) => symbol.toUpperCase()))
    ).sort();
  }
}
