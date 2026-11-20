"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppNavigationIcon } from "@repo/ui/app-navigation";

import { MOBILE_MESSAGES } from "./messages";
import { MOBILE_TABS, activeMobileTab } from "./mobileTabs";
import { tab, tabBar, tabIcon } from "./MobileShell.css";

/** 하단 탭 넷 — 링크(`<a>`)라 길게 눌러 새 창 · 화면 리더 "링크"가 맞다. 같은 zone 이라 `<Link>`(soft navigation) */
export const MobileTabBar = () => {
  const active = activeMobileTab(usePathname() ?? "");
  return (
    <nav className={tabBar} aria-label={MOBILE_MESSAGES.tabsLabel}>
      {MOBILE_TABS.map((item) => (
        <Link
          key={item.id}
          href={item.mobileHref}
          className={tab}
          aria-current={item.id === active ? "page" : undefined}
        >
          <span className={tabIcon}>
            <AppNavigationIcon name={item.icon} size={24} />
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
};
