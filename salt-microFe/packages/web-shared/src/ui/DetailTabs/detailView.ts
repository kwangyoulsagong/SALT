/**
 * 상세 탭 고르기 규칙(`FE-REQ-049` FR-2 · 11) — 주소 `?view=` 값이 어느 탭을 여는지. 화면과 떼어 시험한다.
 *
 * - 주소 값이 지금 있는 탭 id 면 그 탭, 아니면(없음 · 옛 링크 · 소유자 아님으로 빠진 탭) 첫 탭(개요)
 * - 오른쪽 고정 열 id 는 고정 열이 탭일 때(1280 미만)만 탭이다 — 넓은 폭에서 `?view=trade` 는 개요
 */
export const resolveDetailView = (
  fromUrl: string | null,
  tabIds: readonly string[],
  asideId: string,
  asideIsTab: boolean,
): string => {
  const ids = asideIsTab ? [...tabIds, asideId] : tabIds;
  return fromUrl !== null && ids.includes(fromUrl) ? fromUrl : (tabIds[0] ?? asideId);
};

/** 탭을 고른 뒤의 주소 — 첫 탭(개요)은 `view` 를 지워 기본 주소와 같게, 나머지는 `view=<id>`. 다른 검색어 · 해시는 그대로 */
export const detailViewHref = (href: string, next: string, firstTabId: string, param: string): string => {
  const url = new URL(href);
  if (next === firstTabId) url.searchParams.delete(param);
  else url.searchParams.set(param, next);
  return url.toString();
};
