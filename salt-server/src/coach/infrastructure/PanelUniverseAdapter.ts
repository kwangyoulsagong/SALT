import type { MarketApi } from "../../market/application/api";
import type { PanelUniverseProbe, TrackedAssetProbe } from "../domain";

/** 화면 시세 목록 행 수 — BFF 시장 개요 `limit=100`(`performance-bff.md` · 구독 정책)과 같다 */
const SCREEN_CRYPTO_TOP = 100;

/** `market` → `coach` ACL — 패널 칸 채움 실측의 대상(OPS-004). 추적 종목 ∪ 화면 시세 목록 */
export class PanelUniverseAdapter implements PanelUniverseProbe {
  constructor(
    private readonly market: Pick<MarketApi, "topCryptoByTradeValue">,
    private readonly tracked: TrackedAssetProbe
  ) {}

  async symbols(): Promise<string[]> {
    const [top, tracked] = await Promise.all([this.market.topCryptoByTradeValue(SCREEN_CRYPTO_TOP), this.tracked.listTrackedSymbols()]);
    return Array.from(new Set([...top, ...tracked].map((s) => s.toUpperCase()))).sort();
  }
}
