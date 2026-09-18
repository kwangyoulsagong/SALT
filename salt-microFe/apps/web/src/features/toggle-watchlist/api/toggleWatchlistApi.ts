import axios from "axios";

import { AddWatchlistRequest, MARKET_ENDPOINTS } from "@/entities/market";
import { authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

/**
 * 관심 종목 추가·제거.
 *
 * **mutation 은 feature 가 갖는다** — `entities/market/api` 는 조회만 둔다
 * (`fsd-entities.md`). 경로는 엔티티가 소유한 `MARKET_ENDPOINTS` 를 쓴다. 여기서
 * 문자열을 다시 쓰면 BFF 가 경로를 바꿀 때 고칠 자리가 둘이 된다.
 */
export const toggleWatchlistApi = {
  add: async (body: AddWatchlistRequest): Promise<void> => {
    await axios.post(
      `${INVESTMENTS_BASE_URL}${MARKET_ENDPOINTS.watchlist()}`,
      body,
      { headers: authHeader() },
    );
  },
  remove: async (id: string): Promise<void> => {
    await axios.delete(
      `${INVESTMENTS_BASE_URL}${MARKET_ENDPOINTS.watchlistItem(id)}`,
      { headers: authHeader() },
    );
  },
};
