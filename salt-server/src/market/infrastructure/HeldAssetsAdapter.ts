import type { PortfolioApi } from "../../portfolio/application/api";
import type { HoldingProbe, MarketAssetType } from "../domain";

/**
 * `portfolio` 보유를 추적 자산 열쇠로 번역하는 **ACL**(`SRV-REQ-008` FR-83). `market` 이 `PortfolioHolding` 을 직접 읽지 않는다.
 *
 * `portfolio` 가 `market` **뒤에** 조립된다(종가를 받는다) — 그래서 공개 API 를 **부를 때** 찾는다(국내 유니버스의 `held` 와
 * 같은 이유, `composition.ts`). 요청 경로에서만 부르므로 조립이 끝난 뒤다.
 *
 * 수량 0 인 보유 행(전량 매도)은 보유가 아니다 — 남겨 두면 판 종목이 상한에서 빠지지 않는다
 */
export class HeldAssetsAdapter implements HoldingProbe {
  constructor(private readonly portfolio: () => PortfolioApi) {}

  async heldAssets(userId: string) {
    const holdings = await this.portfolio().listHoldings(userId);
    return holdings
      .filter((holding) => holding.totalQuantity > 0)
      .map((holding) => ({ assetType: holding.assetType as MarketAssetType, symbol: holding.symbol.toUpperCase() }));
  }
}
