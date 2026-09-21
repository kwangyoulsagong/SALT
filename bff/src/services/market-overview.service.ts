import { backendApi } from "./backend-api.service";

class MarketOverviewService {
  /**
   * 서버 응답을 **그대로** 넘긴다.
   *
   * 원래는 `upbitWSService.getPriceCache()` 로 현재가·변동률을 덧씌웠다. 그 캐시는 **이
   * 프로세스(REST)에서 늘 비어 있었다** — Upbit 구독은 워커 프로세스만 하고, REST 는
   * 연결만 열고 구독하지 않는다. 2026-09-21 실측: 100행 중 덧씌워진 행 0 (히트율 0%).
   * 화면은 첫 WS 틱에 어차피 값을 덮어쓰므로 살리지 않고 걷어냈다
   * (`BFF-REQ-010` FR-4 · FR-40 — 새 캐시를 만들지 않는다).
   *
   * 덧씌우기가 남아 있었으면 `periodChange`(기간 변동률)와 `change24h` 가 서로 다른
   * 시점의 값이 됐을 것이다.
   */
  async getOverview(query: Record<string, unknown>) {
    return backendApi.getMarketOverview(query);
  }

  async getSymbols() {
    const response = await backendApi.getMarketSymbols(); // BFF → Backend 요청
    return response;
  }
}

export const marketOverviewService = new MarketOverviewService();
