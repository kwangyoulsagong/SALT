import { APP_TABS, type AppTab } from "@repo/core/navigation";

/**
 * 휴대폰 하단 탭 — 데스크톱과 **같은 한 벌**(`APP_TABS` 순서 · 이름 · 아이콘), 주소만 `/m` 아래(`FE-REQ-071` FR-5).
 * 탭 사이는 같은 zone 이라 soft navigation 이다(문서 이동 0).
 */
export const mobileTabHref = (tab: AppTab): string => `/m${tab.href}`;

export const MOBILE_TABS = APP_TABS.map((tab) => ({ ...tab, mobileHref: mobileTabHref(tab) }));

/** 탭 주소 밖이지만 그 탭 안 push 화면인 것 — 코치 리포트는 투자 탭(`FE-REQ-072` FR-3) */
const TAB_EXTRA_PREFIXES: Partial<Record<AppTab["id"], readonly string[]>> = { invest: ["/m/coach"] };

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** 지금 경로의 탭 — 탭 주소 자신이거나 그 아래, 또는 그 탭의 push 화면 */
export const activeMobileTab = (pathname: string): AppTab["id"] | null =>
  MOBILE_TABS.find((tab) => under(pathname, tab.mobileHref) || (TAB_EXTRA_PREFIXES[tab.id] ?? []).some((prefix) => under(pathname, prefix)))?.id ??
  null;
