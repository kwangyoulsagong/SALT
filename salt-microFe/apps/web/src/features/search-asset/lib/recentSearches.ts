import { RECENT_SEARCH_MAX, RECENT_SEARCH_STORAGE_KEY } from "../model/constants";

/**
 * 최근 검색 읽기 · 쓰기 — **기기 `localStorage` 에만**(`FE-REQ-011` FR-83). 접근이 막혀도(사생활 모드 · 저장소 차단) 화면은 돈다 —
 * 그래서 전부 try/catch 이고 실패는 빈 목록이다. 렌더 중에 부르지 않는다(effect · 이벤트에서만, `ssr.md`)
 */
export const readRecentSearches = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string" && value !== "").slice(0, RECENT_SEARCH_MAX)
      : [];
  } catch {
    return [];
  }
};

/** 맨 앞에 넣고 같은 검색어는 하나만 — 최대 `RECENT_SEARCH_MAX`. 돌려준 목록이 새 상태다 */
export const pushRecentSearch = (current: readonly string[], query: string): string[] => {
  const trimmed = query.trim();
  if (trimmed === "") return [...current];
  const next = [trimmed, ...current.filter((value) => value !== trimmed)].slice(0, RECENT_SEARCH_MAX);
  try {
    window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장 실패는 이번 화면에서만 기억한다 — 검색은 계속된다
  }
  return next;
};
