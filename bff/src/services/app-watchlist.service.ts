import { backendApi } from "./backend-api.service";
import { upbitWSService } from "./upbit-ws.service";
import {
  toWatchlistViewModels,
  type CachedPrice,
  type ServerWatchlistItem,
  type WatchlistItemVM,
} from "./watchlist.viewmodel";
import { AppError } from "../utils/error.util";
import { logger } from "../config/logger";

export type { WatchlistItemVM };

/** 서버가 받는 한 페이지 크기. 실시간 테이블과 같은 상한이다. */
const PAGE_SIZE = 100;

/**
 * 순회 상한.
 *
 * 무한 루프를 막는 것이 목적이다 — 서버 `pagination` 이 잘못된 값을 주면(총계가 줄지
 * 않는다든가) 루프가 끝나지 않는다. 1,000건은 사용자 ≤10명 제품에서 도달할 일이 없는
 * 수이고, 도달했다면 그것 자체가 조사할 일이다.
 */
const MAX_PAGES = 10;

interface ServerWatchlistPage {
  items: ServerWatchlistItem[];
  pagination?: { totalPages?: number };
}

class AppWatchlistService {
  /**
   * 관심 목록 + 실시간 보정.
   *
   * **페이지를 끝까지 읽는다.** 실시간 탭의 별 아이콘이 "이 종목이 관심 목록에 있나"를
   * 이 응답 하나로 판정하기 때문에, 한 페이지만 읽으면 101번째 종목부터 별이 빈 채로
   * 남는다 — 그건 틀린 화면이지 잘린 목록이 아니다.
   */
  async list(
    token: string,
    now: Date = new Date(),
  ): Promise<{ items: WatchlistItemVM[] }> {
    const serverItems: ServerWatchlistItem[] = [];

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const response = await backendApi.proxyAuthRequest(
        "GET",
        `/investment/watchlist?page=${page}&limit=${PAGE_SIZE}`,
        token,
      );

      const body: ServerWatchlistPage | undefined = response.data?.data;
      const items = body?.items ?? [];
      serverItems.push(...items);

      const totalPages = body?.pagination?.totalPages ?? 1;
      if (page >= totalPages || items.length === 0) break;

      if (page === MAX_PAGES) {
        logger.warn(
          `관심 목록이 ${MAX_PAGES}페이지를 넘는다 — 뒤쪽이 잘린다. totalPages=${totalPages}`,
        );
      }
    }

    // 0건은 빈 배열이다. 더미를 만들지 않는다 (FR-43)
    if (serverItems.length === 0) return { items: [] };

    const priceCache = upbitWSService.getPriceCache() as Map<
      string,
      CachedPrice
    >;

    return { items: toWatchlistViewModels(serverItems, priceCache, now) };
  }

  /** 추가. 서버의 중복(409)·검증(400) 상태를 그대로 올린다. */
  async add(
    token: string,
    body: { assetType: string; symbol: string; name: string },
  ): Promise<void> {
    await backendApi.proxyAuthRequest(
      "POST",
      "/investment/watchlist",
      token,
      body,
    );
  }

  /** 제거. 본문을 돌려주지 않는다 — 화면은 목록을 다시 읽는다 */
  async remove(token: string, id: string): Promise<void> {
    if (!id) throw new AppError("watchlist id is required", 400);

    await backendApi.proxyAuthRequest(
      "DELETE",
      `/investment/watchlist/${id}`,
      token,
    );

    logger.debug(`Watchlist item removed: ${id}`);
  }
}

export const appWatchlistService = new AppWatchlistService();
