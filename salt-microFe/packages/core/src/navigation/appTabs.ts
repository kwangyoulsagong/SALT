/**
 * 앱 탭 — 홈 · 저축 · 가계부 · 투자 (`FE-REQ-054` FR-1 · FR-2, `FEATURE-015` FR-8, `ADR-005` §2 규칙 6).
 *
 * 웹 `AppNavigation`(왼쪽 레일 · 하단 탭)과 앱(`RN-REQ-032` FR-2 — 같은 순서 · 이름 · 아이콘 이름)이 **이 한 벌**을 읽는다.
 * 그래서 플랫폼 무관 패키지에 둔다. 금융 팁은 탭이 아니다(공개 화면 — 홈 카드 · 링크로 들어간다).
 *
 * 탭이 가리키는 zone 은 레지스트리(`zones/registry.json`)의 도메인이다. 탭 경로는 그 zone 의 첫 화면이고,
 * 아직 첫 화면이 없는 도메인은 `readyBy` 에 그 화면을 만드는 REQ 를 적는다 — 그동안 탭은 보이되 눌리지 않는다
 * (없는 경로로 보내 404 를 보이지 않는다). 그 REQ 가 화면을 만들면 `readyBy` 를 `null` 로 바꾼다.
 */
import { zoneOfPath, type ZoneId } from "../zones/registry";

export const APP_TAB_IDS = ["home", "savings", "household", "invest"] as const;
export type AppTabId = (typeof APP_TAB_IDS)[number];

/** 아이콘 이름 — 웹은 `@repo/ui` `AppNavigationIcon`(면 채운 단색 글리프), 앱은 같은 이름의 네이티브 그림(그림은 플랫폼 몫, 이름은 한 벌). 저축 = 동전(`coin`) */
export type AppTabIcon = "home" | "coin" | "wallet" | "chart";

export interface AppTab {
  readonly id: AppTabId;
  readonly label: string;
  readonly icon: AppTabIcon;
  /** 이 탭이 가리키는 레지스트리 zone */
  readonly zone: ZoneId;
  /** 탭을 누르면 가는 첫 화면 */
  readonly href: string;
  /** 첫 화면이 아직 없으면 그 화면을 만드는 REQ. `null` 이면 누를 수 있다 */
  readonly readyBy: string | null;
}

export const APP_TABS: readonly AppTab[] = [
  { id: "home", label: "홈", icon: "home", zone: "shell", href: "/home", readyBy: null },
  // 저축 zone 첫 화면 `/goals`(2026-11-03 `FE-REQ-056`)
  { id: "savings", label: "저축", icon: "coin", zone: "savings", href: "/goals", readyBy: null },
  // 가계부 zone 은 빈 골격이다(`FE-REQ-052` FR-7)
  { id: "household", label: "가계부", icon: "wallet", zone: "household", href: "/household", readyBy: "FE-REQ-057" },
  { id: "invest", label: "투자", icon: "chart", zone: "invest", href: "/investments", readyBy: null },
];

/** 비활성 탭에 붙이는 말 — 화면 리더 · 툴팁이 같이 읽는다 */
export const APP_TAB_NOT_READY_LABEL = "준비 중";

/**
 * 지금 경로가 어느 탭에 속하나. 도메인 zone 은 zone 전체가 그 탭이다(`/coach` · `/search` → 투자).
 * 셸은 홈 탭이 `/home` 만 갖는다 — 설정 · 온보딩은 어느 탭도 아니다.
 */
export const activeAppTab = (pathname: string): AppTabId | null => {
  const path = pathname.split(/[?#]/)[0] ?? pathname;
  const zone = zoneOfPath(path);
  if (zone === "shell") {
    return path === "/home" || path.startsWith("/home/") ? "home" : null;
  }
  return APP_TABS.find((tab) => tab.zone === zone)?.id ?? null;
};
