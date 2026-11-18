import { backendApi } from "./backend-api.service";
import { logger } from "../config/logger";
import {
  toPortfolioSummaryViewModel,
  type PortfolioSummaryVM,
  type ServerPortfolioSummary,
} from "./portfolio.viewmodel";
import {
  toPositionFlowViewModel,
  toPositionOverviewViewModel,
  type FlowRange,
  type PositionFlowVM,
  type PositionOverviewVM,
  type ServerPositionFlow,
  type ServerPositionOverview,
} from "./position.viewmodel";

export type { PortfolioSummaryVM };

/** 이름을 붙이려고 읽는 시세 목록 크기. 실시간 테이블과 같은 상한이다. */
const NAME_LOOKUP_LIMIT = 100;
/** 국내 주식 이름 조회 — 서버 저장값 읽기(`app-kr-stock.service` 와 같은 800ms) */
const KR_NAME_TIMEOUT_MS = 800;

class AppPortfolioService {
  async getPortfolio(token: string) {
    const [holdings, stats, performance] = await Promise.all([
      backendApi.proxyAuthRequest("GET", "/portfolio/holdings", token),
      backendApi.proxyAuthRequest("GET", "/portfolio/stats", token),
      backendApi.proxyAuthRequest("GET", "/portfolio/performance", token),
    ]);

    return {
      holdings: holdings.data,
      stats: stats.data,
      performance: performance.data,
    };
  }

  /**
   * 홈 "주식" 섹션 요약.
   *
   * 서버는 **심볼만** 안다(`portfolio_holdings` 에 이름 컬럼이 없다). 사람이 읽는
   * 이름은 시세 목록에 있으므로 **BFF 가 붙인다** — 그게 조합 레이어의 일이고,
   * 서버가 `portfolio` → `market` 크로스 컨텍스트 조회를 하나 더 갖는 것보다 싸다.
   *
   * 둘을 **`allSettled`** 로 부른다. 이름 조회가 실패해도 금액은 내려보낸다 —
   * 이름이 없다고 보유가 없는 것은 아니다. 그때는 심볼을 이름 자리에 쓰고
   * `namesDegraded: true` 로 알린다.
   */
  async getSummary(token: string): Promise<PortfolioSummaryVM> {
    const [summaryResult, marketResult] = await Promise.allSettled([
      backendApi.proxyAuthRequest("GET", "/portfolio/summary", token),
      backendApi.getMarketOverview({ page: 1, limit: NAME_LOOKUP_LIMIT }),
    ]);

    if (summaryResult.status === "rejected") throw summaryResult.reason;

    const summary: ServerPortfolioSummary | undefined =
      summaryResult.value.data?.data;
    const krResult = await this.krNames(token, summary);

    const nameBySymbol = new Map<string, string>();
    const logoBySymbol = new Map<string, string>();
    let namesDegraded = true;

    if (marketResult.status === "fulfilled") {
      namesDegraded = false;
      for (const asset of marketResult.value?.items ?? []) {
        if (asset?.symbol && asset?.koreanName) {
          nameBySymbol.set(String(asset.symbol).toUpperCase(), asset.koreanName);
        }
        if (asset?.symbol && typeof asset?.logoUrl === "string" && asset.logoUrl) {
          logoBySymbol.set(String(asset.symbol).toUpperCase(), asset.logoUrl);
        }
      }
    } else {
      logger.warn(
        "보유 요약에 종목명을 붙이지 못했다 — 심볼로 대체한다",
        marketResult.reason?.message
      );
    }

    // 국내 주식은 코인 시세 목록에 없다 — 국내 주식 목록(코드 필터)에서 붙인다. 6자리 코드라 코인 심볼과 겹치지 않는다
    if (krResult) {
      for (const [code, { name, logoUrl }] of krResult.found) {
        nameBySymbol.set(code, name);
        if (logoUrl) logoBySymbol.set(code, logoUrl);
      }
      if (krResult.degraded) namesDegraded = true;
    }

    return toPortfolioSummaryViewModel(summary, nameBySymbol, namesDegraded, logoBySymbol);
  }

  /**
   * 포지션 개요(F006 G절 FR-70 · 73) — 서버 계산을 그대로 옮기고 최대 비중 종목에만 이름 · 로고를 붙인다.
   * 이름 조회는 개요를 받은 **뒤** 한 종목만(최대 비중) — 실패하면 심볼을 이름 자리에 두고 `namesDegraded`(금액은 그대로)
   */
  async getPosition(token: string): Promise<PositionOverviewVM> {
    const response = await backendApi.proxyAuthRequest("GET", "/portfolio/position", token);
    const server = (response.data as { data: ServerPositionOverview }).data;
    const top = server.hero?.topWeight;
    if (!top) return toPositionOverviewViewModel(server, new Map(), false);
    const { names, degraded } = await this.namesFor(token, [{ symbol: top.symbol, assetType: top.assetType }]);
    return toPositionOverviewViewModel(server, names, degraded);
  }

  /** 평가금 흐름(기간 버튼) — 서버 그대로(BFF 계산 0) */
  async getPositionFlow(token: string, range: FlowRange): Promise<PositionFlowVM> {
    const response = await backendApi.proxyAuthRequest("GET", `/portfolio/position/flow?range=${range}`, token);
    return toPositionFlowViewModel((response.data as { data: ServerPositionFlow }).data);
  }

  /** 종목 이름 · 로고 — 코인은 시세 목록, 국내는 국내 목록(보유 요약과 같은 출처) */
  private async namesFor(
    token: string,
    items: Array<{ symbol: string; assetType: string }>,
  ): Promise<{ names: Map<string, { name: string; logoUrl: string | null }>; degraded: boolean }> {
    const names = new Map<string, { name: string; logoUrl: string | null }>();
    let degraded = false;
    const crypto = items.filter((i) => i.assetType === "crypto").map((i) => i.symbol.toUpperCase());
    const [marketResult, krResult] = await Promise.allSettled([
      crypto.length > 0 ? backendApi.getMarketOverview({ page: 1, limit: NAME_LOOKUP_LIMIT }) : Promise.resolve(null),
      this.krNames(token, { items: items.map((i) => ({ ...i, currentValue: 0, profitRate: 0 })) }),
    ]);
    if (marketResult.status === "fulfilled") {
      for (const asset of marketResult.value?.items ?? []) {
        const symbol = String(asset?.symbol ?? "").toUpperCase();
        if (crypto.includes(symbol) && asset?.koreanName) {
          names.set(symbol, { name: asset.koreanName, logoUrl: typeof asset.logoUrl === "string" && asset.logoUrl ? asset.logoUrl : null });
        }
      }
      if (crypto.some((symbol) => !names.has(symbol))) degraded = true;
    } else {
      degraded = true;
      logger.warn("포지션에 종목명을 붙이지 못했다 — 심볼로 대체한다", { reason: marketResult.reason?.message });
    }
    if (krResult.status === "fulfilled" && krResult.value) {
      for (const [code, value] of krResult.value.found) names.set(code, value);
      if (krResult.value.degraded) degraded = true;
    }
    return { names, degraded };
  }

  /**
   * 국내 주식 보유의 이름 · 로고(F011 슬라이스 3b). 보유가 없으면 부르지 않는다. 실패 · 꺼짐 · 없는 종목(404)면 코드를
   * 이름 자리에 두고 `namesDegraded` — 금액은 그대로 내려간다(코인 이름 조회와 같은 규칙)
   */
  private async krNames(
    token: string,
    summary: ServerPortfolioSummary | undefined,
  ): Promise<{ found: Map<string, { name: string; logoUrl: string | null }>; degraded: boolean } | null> {
    const codes = (summary?.items ?? []).filter((i) => i.assetType === "kr_stock").map((i) => i.symbol);
    if (codes.length === 0) return null;
    const found = new Map<string, { name: string; logoUrl: string | null }>();
    try {
      const response = await backendApi.proxyAuthRequest(
        "GET",
        `/market/kr/assets?limit=${Math.min(codes.length, NAME_LOOKUP_LIMIT)}&codes=${codes.slice(0, NAME_LOOKUP_LIMIT).join(",")}`,
        token,
        undefined,
        { timeout: KR_NAME_TIMEOUT_MS },
      );
      const items = (response.data as { data?: { items?: unknown } })?.data?.items;
      for (const item of Array.isArray(items) ? items : []) {
        const row = item as { code?: unknown; name?: unknown; logoUrl?: unknown };
        if (typeof row.code === "string" && typeof row.name === "string") {
          found.set(row.code, { name: row.name, logoUrl: typeof row.logoUrl === "string" && row.logoUrl ? row.logoUrl : null });
        }
      }
      return { found, degraded: codes.some((code) => !found.has(code)) };
    } catch (error) {
      logger.warn("보유 요약에 국내 주식 이름을 붙이지 못했다 — 코드로 대체한다", (error as Error)?.message);
      return { found, degraded: true };
    }
  }
}

export const appPortfolioService = new AppPortfolioService();
