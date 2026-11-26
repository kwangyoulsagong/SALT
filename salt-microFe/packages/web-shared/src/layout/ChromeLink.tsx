"use client";

// 클라이언트 잎: 누르는 순간 zone 전환 계측 표지를 남긴다.
import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import { ZONES, zoneOfPath } from "@repo/core/zones";

import { isCrossZonePath, ZONE_APP } from "../config";
import { CrossZoneLink, opensElsewhere } from "../ui";
import { PRERENDER_TAB_ATTRIBUTE } from "./prerenderRules";
import { recordZoneNavigationStart } from "./zoneNavigationMetrics";

type ChromeLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> & {
  href: string;
  children: ReactNode;
};

/**
 * 공용 크롬(머리 · 하단 탭 · 로고 · 알림 벨)의 링크 한 벌 — **경로만 받는다**(`FE-REQ-054` · 2026-11-26 알림 벨 결함).
 *
 * 같은 앱이면 `next/link`. 다른 zone 이면 `CrossZoneLink` + **세 가지를 늘 같이**: prerender 표지(`prerenderRules.ts`) ·
 * 대기 문구 끔(고정 크기 칸에 "이동 중" 글자가 붙어 머리가 깨진다) · 누른 시각 계측. 알림 벨이 일반 `ZoneLink` 를 써서 셋이 다 빠졌다 —
 * 투자 zone 에서 누르면 벨 칸에 대기 문구가 붙어 머리가 깨지고, 미리 그린 화면이 없어 흰 화면으로 새로 떴다(2026-11-26 사용자).
 * 크롬에 zone 을 넘는 링크를 새로 놓으면 이것을 쓴다(`AppTabLink` 도 이것으로 그린다)
 */
export const ChromeLink = ({ href, children, ...props }: ChromeLinkProps) => {
  if (!isCrossZonePath(href, ZONE_APP)) {
    return (
      <Link {...props} href={href}>
        {children}
      </Link>
    );
  }
  return (
    <CrossZoneLink
      {...props}
      href={href}
      {...{ [PRERENDER_TAB_ATTRIBUTE]: "" }}
      showPending={false}
      onClick={(event) => {
        if (!opensElsewhere(event)) recordZoneNavigationStart(ZONE_APP, ZONES[zoneOfPath(href)].hostedIn);
      }}
    >
      {children}
    </CrossZoneLink>
  );
};
