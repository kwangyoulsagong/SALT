"use client";

// 클라이언트 잎: 누르는 순간 zone 전환 계측 표지를 남긴다.
import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import type { AppTab } from "@repo/core/navigation";
import { ZONES } from "@repo/core/zones";

import { isCrossZonePath, ZONE_APP } from "../config";
import { CrossZoneLink, opensElsewhere } from "../ui";
import { PRERENDER_TAB_ATTRIBUTE } from "./prerenderRules";
import { recordZoneNavigationStart } from "./zoneNavigationMetrics";

type AppTabLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> & {
  tab: AppTab;
  children: ReactNode;
};

/**
 * 탭으로 가는 링크 한 벌 (`FE-REQ-054` · `FE-REQ-051` FR-2) — 하단 탭 · 레일과 머리 로고(→ 홈)가 같이 쓴다.
 *
 * 같은 앱이면 `next/link`. 다른 zone 이면 `CrossZoneLink` + prerender 표지(`prerenderRules.ts`) + 누른 시각 계측 표지,
 * 대기 문구는 끈다(탭 · 머리 칸이 흔들린다). 로고가 따로 링크를 짜면 이 셋이 빠진다 — 2026-11-04 로고 첫 판이 그랬다.
 */
export const AppTabLink = ({ tab, children, ...props }: AppTabLinkProps) => {
  if (!isCrossZonePath(tab.href, ZONE_APP)) {
    return (
      <Link {...props} href={tab.href}>
        {children}
      </Link>
    );
  }
  return (
    <CrossZoneLink
      {...props}
      href={tab.href}
      {...{ [PRERENDER_TAB_ATTRIBUTE]: "" }}
      showPending={false}
      onClick={(event) => {
        if (!opensElsewhere(event)) recordZoneNavigationStart(ZONE_APP, ZONES[tab.zone].hostedIn);
      }}
    >
      {children}
    </CrossZoneLink>
  );
};
