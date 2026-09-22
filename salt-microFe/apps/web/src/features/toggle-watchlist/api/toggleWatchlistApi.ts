import {
  AddWatchlistRequest,
  MARKET_ENDPOINTS,
  MarketApiError,
} from "@/entities/market";
import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

const send = async (
  endpoint: string,
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> },
): Promise<void> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeader(), ...init.headers },
  });
  if (!response.ok) throw new MarketApiError(endpoint, response.status);
};

/**
 * 관심 종목 추가·제거.
 *
 * **mutation 은 feature 가 갖는다** — `entities/market/api` 는 조회만 둔다
 * (`fsd-entities.md`). 경로는 엔티티가 소유한 `MARKET_ENDPOINTS` 를 쓴다. 여기서
 * 문자열을 다시 쓰면 BFF 가 경로를 바꿀 때 고칠 자리가 둘이 된다.
 *
 * `axios` 가 아니라 `apiFetch` 다 — `axios.post` 가 알아서 붙이던 `Content-Type` 을
 * 직접 적는다. 빠뜨리면 BFF `express.json()` 이 본문을 비운다.
 */
export const toggleWatchlistApi = {
  add: (body: AddWatchlistRequest): Promise<void> =>
    send("watchlist.add", MARKET_ENDPOINTS.watchlist(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  remove: (id: string): Promise<void> =>
    send("watchlist.remove", MARKET_ENDPOINTS.watchlistItem(id), {
      method: "DELETE",
    }),
};
