import { WatchlistItem } from "../model/types";

/**
 * 심볼 → 관심 목록 항목.
 *
 * 별 아이콘은 두 가지를 알아야 한다 — **이미 담겨 있는가**(채울지 말지)와 **어느
 * 항목인가**(제거하려면 `id` 가 필요하다). 실시간 테이블은 100행이므로 행마다
 * `items.find(...)` 를 돌리면 100 × N 비교가 매 렌더 일어난다. 한 번 만들어 공유한다.
 *
 * 심볼은 **대문자로 맞춘다** — 서버는 대문자로 저장하지만 목록 응답과 시세 응답이
 * 같은 표기를 보장한다는 약속은 어디에도 없다.
 */
export const indexWatchlistBySymbol = (
  items: readonly WatchlistItem[],
): ReadonlyMap<string, WatchlistItem> =>
  new Map(items.map((item) => [item.symbol.toUpperCase(), item]));
