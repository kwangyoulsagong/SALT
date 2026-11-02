import type { KrQuote } from "@repo/core/marketKr";

import type { MarketOverviewItem } from "../model/types";

/**
 * 국내 주식 한 줄 → 코인 표의 행 모양(F011 `FE-REQ-041`). **화면은 하나고 데이터만 다르다** — 표 · 필터 · 미리보기 · 깜빡임이
 * 이 모양 하나를 읽는다. 값은 옮기기만 한다(계산 없음):
 *
 * - `change24h` = 전일 종가 대비 등락률 — 코인 `change24h` 도 업비트 전일 종가 대비라 뜻이 같다(`BFF-REQ-040` 결정 7)
 * - `high24h` · `low24h` = 당일 고가 · 저가. 아직 못 받은 행(`null`)은 `NaN` — 현재가나 0 으로 채우면 거짓 값이다.
 *   `PriceCell` 이 유한하지 않은 값을 "—" 로 그린다
 * - `logoUrl` 은 서버가 종목마다 판정한 logo.dev 주소(KIS 는 로고를 주지 않는다, FR-47). 없거나 못 불러오면 `AssetIcon` 이
 *   이니셜로 넘어간다
 */
export const krQuoteToOverviewItem = (quote: KrQuote): MarketOverviewItem => ({
  symbol: quote.code,
  market: quote.code,
  koreanName: quote.name,
  englishName: quote.market,
  currentPrice: quote.price,
  change24h: quote.changeRate,
  high24h: quote.highPrice ?? Number.NaN,
  low24h: quote.lowPrice ?? Number.NaN,
  volume24h: Number(quote.volume),
  tradeValue24h: quote.tradeValue,
  logoUrl: quote.logoUrl ?? "",
  priceUpdatedAt: quote.priceUpdatedAt,
  periodChange: quote.periodChange ?? null,
  kr: quote,
});
