"use client";

// 클라이언트 잎: 지금 경로(usePathname)로 탭을 고르고, 탭을 누른 시각을 계측 표지로 남긴다.
import { ChartLine, House, PiggyBank, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { PUBLIC_PATHS } from "@repo/core/auth";
import {
  APP_TABS,
  APP_TAB_NOT_READY_LABEL,
  activeAppTab,
  type AppTab,
  type AppTabIcon,
} from "@repo/core/navigation";
import { zoneOfPath, type ZoneId } from "@repo/core/zones";
import { AppNavigation, type AppNavigationItem } from "@repo/ui/app-navigation";
import { vars as ds } from "@repo/ui/tokens";

import { isCrossZonePath, ZONE_APP } from "../config";
import { NAVIGATION_FRAME_MESSAGES } from "./messages";
import { PRERENDER_TAB_ATTRIBUTE } from "./prerenderRules";
import { readZoneNavigationMetric, recordZoneNavigationStart } from "./zoneNavigationMetrics";

const ICONS: Record<AppTabIcon, LucideIcon> = {
  home: House,
  "piggy-bank": PiggyBank,
  wallet: Wallet,
  chart: ChartLine,
};

/** 탭 zone → 도메인 색 토큰(`FE-REQ-054` FR-7). 셸 탭은 홈 색 */
const accentOf = (zone: ZoneId): string => {
  const key = zone === "shell" ? "home" : zone;
  return ds.colors.domain[key];
};

/** 로그인 · 온보딩 같은 공개 화면에는 탭 · 머리가 없다 — 아직 계정이 없거나 들어가는 중이다 */
const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.some((path) => (path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`)));

const toItem = (tab: AppTab, active: boolean): AppNavigationItem => {
  const Icon = ICONS[tab.icon];
  return {
    id: tab.id,
    label: tab.label,
    href: tab.href,
    icon: <Icon size={20} aria-hidden="true" />,
    active,
    accentColor: accentOf(tab.zone),
    disabledReason: tab.readyBy ? APP_TAB_NOT_READY_LABEL : undefined,
  };
};

/**
 * zone 공용 내비게이션 (`FE-REQ-054`) — `@repo/ui` `AppNavigation` 에 레지스트리 판정을 입힌다.
 *
 * - 지금 탭: `activeAppTab`(레지스트리 zone 기준). 설정처럼 어느 탭도 아닌 화면은 선택 없음
 * - 링크: 같은 앱이면 `next/link`, 다른 zone 이면 `<a>` + prerender 표지(`speculationRules.ts`). 판정은 실행 중인 앱 기준(`ZONE_APP`)
 * - 누르는 순간 계측 표지를 남기고, 도착한 문서가 마운트 뒤 한 건으로 읽는다(`zoneNavigationMetrics.ts`)
 */
export const ZoneNavigation = ({ headerEnd, children }: { headerEnd?: ReactNode; children: ReactNode }) => {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    readZoneNavigationMetric(zoneOfPath(pathname));
    // 문서가 열릴 때 한 번만 — 같은 zone 안 이동은 zone 전환이 아니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isPublicPath(pathname)) return <>{children}</>;

  const activeId = activeAppTab(pathname);
  const fromZone = zoneOfPath(pathname);
  const items = APP_TABS.map((tab) => toItem(tab, tab.id === activeId));

  return (
    <AppNavigation
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
          <a
            key={item.id}
            {...props}
            {...{ [PRERENDER_TAB_ATTRIBUTE]: "" }}
            onClick={() => {
              if (tab) recordZoneNavigationStart(fromZone, tab.zone);
            }}
          >
            {body}
          </a>
        );
      }}
    >
      {children}
    </AppNavigation>
  );
};
