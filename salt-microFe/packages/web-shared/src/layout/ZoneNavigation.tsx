"use client";

// 클라이언트 잎: 지금 경로(usePathname)로 탭을 고르고, 탭을 누른 시각을 계측 표지로 남긴다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { PUBLIC_PATHS } from "@repo/core/auth";
import {
  APP_TABS,
  APP_TAB_NOT_READY_LABEL,
  activeAppTab,
  type AppTab,
} from "@repo/core/navigation";
import { ZONES } from "@repo/core/zones";
import { AppNavigation, AppNavigationIcon, type AppNavigationItem } from "@repo/ui/app-navigation";

import { isCrossZonePath, ZONE_APP } from "../config";
import { CrossZoneLink, opensElsewhere } from "../ui";
import { NAVIGATION_FRAME_MESSAGES } from "./messages";
import { PRERENDER_TAB_ATTRIBUTE } from "./prerenderRules";
import { readZoneNavigationMetric, recordZoneNavigationStart } from "./zoneNavigationMetrics";

/** 로그인 · 온보딩 같은 공개 화면에는 탭 · 머리가 없다 — 아직 계정이 없거나 들어가는 중이다 */
const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.some((path) => (path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`)));

/**
 * 아이콘은 면을 채운 단색 글리프(`@repo/ui` `AppNavigationIcon`, 이름은 `APP_TABS` 의 것 그대로) — 선 아이콘은 탭 크기에서 흐렸다
 * (2026-11-03 사용자). 도메인 색은 탭에 쓰지 않는다 — 지금 탭은 진한 아이콘 + 옅은 판으로 가른다(기준 레일 실측).
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
 * zone 공용 내비게이션 (`FE-REQ-054`) — `@repo/ui` `AppNavigation` 에 레지스트리 판정을 입힌다.
 *
 * - 지금 탭: `activeAppTab`(레지스트리 zone 기준). 설정처럼 어느 탭도 아닌 화면은 선택 없음
 * - 링크: 같은 앱이면 `next/link`, 다른 zone 이면 `CrossZoneLink`(zone 을 넘는 링크를 바꾸는 자리는 그 파일 하나) + prerender 표지
 *   (`prerenderRules.ts`). 대기 문구는 끈다 — 탭 칸이 흔들린다. 판정은 실행 중인 앱 기준(`ZONE_APP`)
 * - 누르는 순간 계측 표지를 남기고(새 탭 · 수정키 클릭은 빼고), 도착한 문서가 마운트 뒤 한 건으로 읽는다(`zoneNavigationMetrics.ts`).
 *   단위는 앱 — 떠나는 앱 `ZONE_APP`, 가는 앱 = 탭 zone 의 `hostedIn`
 * - 공개 화면은 `bare` — 틀은 같고 조각만 없다(로그인 → 홈에서 본문 트리가 다시 만들어지지 않게)
 */
export const ZoneNavigation = ({ headerEnd, children }: { headerEnd?: ReactNode; children: ReactNode }) => {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    readZoneNavigationMetric(ZONE_APP);
    // 문서가 열릴 때 한 번만 — 같은 zone 안 이동은 zone 전환이 아니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bare = isPublicPath(pathname);
  const activeId = bare ? null : activeAppTab(pathname);
  const items = bare ? [] : APP_TABS.map((tab) => toItem(tab, tab.id === activeId));

  return (
    <AppNavigation
      bare={bare}
      items={items}
      label={NAVIGATION_FRAME_MESSAGES.navLabel}
      headerEnd={headerEnd}
      renderLink={(item, { children: body, ...props }) => {
        const tab = APP_TABS.find((candidate) => candidate.id === item.id);
        if (!isCrossZonePath(item.href, ZONE_APP)) {
          return (
            <Link key={item.id} {...props} href={item.href}>
              {body}
            </Link>
          );
        }
        return (
          <CrossZoneLink
            key={item.id}
            {...props}
            {...{ [PRERENDER_TAB_ATTRIBUTE]: "" }}
            showPending={false}
            onClick={(event) => {
              if (tab && !opensElsewhere(event)) recordZoneNavigationStart(ZONE_APP, ZONES[tab.zone].hostedIn);
            }}
          >
            {body}
          </CrossZoneLink>
        );
      }}
    >
      {children}
    </AppNavigation>
  );
};
