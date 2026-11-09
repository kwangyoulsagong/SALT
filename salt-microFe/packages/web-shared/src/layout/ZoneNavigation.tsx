"use client";

// 클라이언트 잎: 지금 경로(usePathname)로 탭을 고르고, 탭을 누른 시각을 계측 표지로 남긴다.
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { isPublicPath } from "@repo/core/auth";
import {
  APP_TABS,
  APP_TAB_NOT_READY_LABEL,
  activeAppTab,
  type AppTab,
} from "@repo/core/navigation";
import { AppNavigation, AppNavigationIcon, type AppNavigationItem } from "@repo/ui/app-navigation";

import { ZONE_APP } from "../config";
import { AppTabLink } from "./AppTabLink";
import { HeaderBrand } from "./HeaderBrand";
import { NAVIGATION_FRAME_MESSAGES } from "./messages";
import { readZoneNavigationMetric } from "./zoneNavigationMetrics";


/**
 * 아이콘은 면을 채운 단색 글리프(`@repo/ui` `AppNavigationIcon`, 이름은 `APP_TABS` 의 것 그대로) — 선 아이콘은 탭 크기에서 흐렸다
 * (2026-11-03 사용자) — 하단 탭(768~1023)만 쓴다. 머리 링크(1024 이상)는 글자만, 진하기로 가른다(`FE-REQ-067`).
 * 도메인 색은 탭에 쓰지 않는다 — 하단 탭의 지금 탭은 진한 아이콘 + 옅은 판으로 가른다(기준 레일 실측).
 */
const toItem = (tab: AppTab, active: boolean): AppNavigationItem => ({
  id: tab.id,
  label: tab.label,
  href: tab.href,
  icon: <AppNavigationIcon name={tab.icon} />,
  active,
  disabledReason: tab.readyBy ? APP_TAB_NOT_READY_LABEL : undefined,
});

/**
 * zone 공용 내비게이션 (`FE-REQ-054` · `FE-REQ-067`) — `@repo/ui` `AppNavigation` 에 레지스트리 판정을 입힌다.
 *
 * - 지금 탭: `activeAppTab`(레지스트리 zone 기준). 설정처럼 어느 탭도 아닌 화면은 선택 없음
 * - 링크: `AppTabLink` 한 벌 — 같은 앱이면 `next/link`, 다른 zone 이면 `CrossZoneLink` + prerender 표지 + 누른 시각 계측 표지,
 *   대기 문구 끔. 도착한 문서가 마운트 뒤 한 건으로 읽는다(`zoneNavigationMetrics.ts`)
 * - 머리 첫 칸은 로고(`HeaderBrand` → 홈, `FE-REQ-051` FR-2) — 같은 `AppTabLink` 를 쓴다
 * - 공개 화면은 `bare` — 틀은 같고 조각만 없다(로그인 → 홈에서 본문 트리가 다시 만들어지지 않게)
 */
export const ZoneNavigation = ({
  headerEnd,
  headerSearch,
  children,
}: {
  headerEnd?: ReactNode;
  /** 머리 검색칸(`FE-REQ-067` FR-2) — `AppShell` 이 zone 몫을 넘긴다 */
  headerSearch?: ReactNode;
  children: ReactNode;
}) => {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    readZoneNavigationMetric(ZONE_APP);
    // 문서가 열릴 때 한 번만 — 같은 zone 안 이동은 zone 전환이 아니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로그인 · 온보딩 같은 공개 화면에는 탭 · 머리가 없다 — 아직 계정이 없거나 들어가는 중이다(판정은 `@repo/core/auth` 하나)
  const bare = isPublicPath(pathname);
  const activeId = bare ? null : activeAppTab(pathname);
  const items = bare ? [] : APP_TABS.map((tab) => toItem(tab, tab.id === activeId));

  return (
    <AppNavigation
      bare={bare}
      items={items}
      label={NAVIGATION_FRAME_MESSAGES.navLabel}
      brand={<HeaderBrand />}
      headerEnd={headerEnd}
      headerSearch={headerSearch}
      renderLink={(item, { children: body, className, "aria-current": current }) => {
        const tab = APP_TABS.find((candidate) => candidate.id === item.id);
        return tab ? (
          <AppTabLink key={item.id} tab={tab} className={className} aria-current={current}>
            {body}
          </AppTabLink>
        ) : null;
      }}
    >
      {children}
    </AppNavigation>
  );
};
