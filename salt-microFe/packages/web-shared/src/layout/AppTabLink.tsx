"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";

import type { AppTab } from "@repo/core/navigation";

import { ChromeLink } from "./ChromeLink";

type AppTabLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> & {
  tab: AppTab;
  children: ReactNode;
};

/**
 * 탭으로 가는 링크 한 벌 (`FE-REQ-054` · `FE-REQ-051` FR-2) — 머리 링크 · 하단 탭과 머리 로고(→ 홈)가 같이 쓴다.
 *
 * 같은 앱이면 `next/link`. 다른 zone 이면 prerender 표지 + 대기 문구 끔 + 누른 시각 계측 — 그 셋은 `ChromeLink` 한 곳
 * (2026-11-26 알림 벨도 같은 셋이 필요해 경로만 받는 링크로 내림). 로고가 따로 링크를 짜면 이 셋이 빠진다 — 2026-11-04 로고 첫 판이 그랬다.
 */
export const AppTabLink = ({ tab, children, ...props }: AppTabLinkProps) => (
  <ChromeLink {...props} href={tab.href}>
    {children}
  </ChromeLink>
);
