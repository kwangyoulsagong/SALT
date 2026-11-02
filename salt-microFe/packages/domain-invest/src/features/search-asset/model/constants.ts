/** 입력 → 요청 간격 (`FE-REQ-010` FR-71 · `FE-REQ-011` FR-81) */
export const SEARCH_DEBOUNCE_MS = 300;
/** 검색어를 싣는 주소 키 — 뒤로 · 새로고침이 검색을 되살린다(`FE-REQ-011` FR-80) */
export const SEARCH_QUERY_PARAM = "q";
/** 서버 DTO 상한과 같다 — 넘는 글자는 입력에서 막는다 */
export const SEARCH_QUERY_MAX_LENGTH = 30;
/** 최근 검색 — 기기에만 둔다. 서버로 보내지 않는다(`FEATURE-000` 보안 행 · `FE-REQ-010` FR-76) */
export const RECENT_SEARCH_MAX = 10;
export const RECENT_SEARCH_STORAGE_KEY = "salt.recentAssetSearches";
