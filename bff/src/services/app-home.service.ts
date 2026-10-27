import { logger } from "../config/logger";
import { appPortfolioService, type PortfolioSummaryVM } from "./app-portfolio.service";
import { backendApi } from "./backend-api.service";

/** 시장 개요 블록 크기 — 실시간 테이블 첫 페이지와 같다. */
const MARKET_OVERVIEW_LIMIT = 20;

export type HomeBlock = "portfolio" | "unreadNotifications" | "marketOverview";

export interface AppHomeVM {
  portfolio: PortfolioSummaryVM | null;
  unreadNotifications: number | null;
  marketOverview: unknown;
  /** 실패해 `null` 로 내려간 블록. 빈 배열이면 전부 받았다 */
  degradedBlocks: HomeBlock[];
}

/**
 * F000 최소 홈 (`BFF-REQ-007` B절 FR-10~15).
 *
 * 서버 `/dashboard` · `/investment-insight/top` 은 동면(410)이라 부르지 않는다 —
 * 부르면 `Promise.all` 하나가 홈 전체를 500 으로 만든다. 블록마다 따로 받아
 * (`allSettled`) 실패한 블록만 `null` + `degradedBlocks` 로 알린다.
 * 최종 형태는 F006 3블록(`BFF-REQ-027`)이다.
 */
class AppHomeService {
  async getHome(token: string): Promise<AppHomeVM> {
    const [portfolio, unread, market] = await Promise.allSettled([
      appPortfolioService.getSummary(token),
      backendApi.proxyAuthRequest("GET", "/investment-notifications/unread-count", token),
      backendApi.getMarketOverview({ page: 1, limit: MARKET_OVERVIEW_LIMIT }),
    ]);

    const degradedBlocks: HomeBlock[] = [];
    const settle = <T>(block: HomeBlock, result: PromiseSettledResult<T>): T | null => {
      if (result.status === "fulfilled") return result.value;
      degradedBlocks.push(block);
      logger.warn("홈 블록을 받지 못했다", { block, reason: result.reason?.message });
      return null;
    };

    const unreadCount = settle("unreadNotifications", unread)?.data?.data?.unreadCount;

    return {
      portfolio: settle("portfolio", portfolio),
      unreadNotifications: typeof unreadCount === "number" ? unreadCount : null,
      marketOverview: settle("marketOverview", market),
      degradedBlocks,
    };
  }
}

export const appHomeService = new AppHomeService();
