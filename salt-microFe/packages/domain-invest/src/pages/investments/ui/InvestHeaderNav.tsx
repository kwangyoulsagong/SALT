"use client";

// 클라이언트 잎: 지금 주소(경로 · `?asset=`)로 지금 메뉴를 고르고, 국내 시세를 볼 수 있는지로 "주식"을 보인다.
import { activeInvestMenu, INVEST_ASSET_PARAM, INVEST_MENU, InvestMenuId } from "@repo/core/navigation";
import { AppNavigationHeaderNav, type AppNavigationItem } from "@repo/ui/app-navigation";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useKrMarketStatus } from "@/entities/market";

import { INVESTMENTS_PAGE_MESSAGES } from "../model";

/**
 * 투자 zone 머리 메뉴(`FE-REQ-069` FR-2) — 코인 · 주식 · 포트폴리오 · 리포트 · 코치 설정. 순서 · 주소 · 지금 메뉴 판정은 `@repo/core/navigation` 한 벌.
 *
 * - 주식은 국내 시세 소유자에게만(장 상태 응답이 `ok` — 시세 표 · 거래대금 상위와 같은 판정 · 같은 캐시). 모르는 동안은 숨긴다(비소유자에게 보였다 사라지지 않게)
 * - 링크는 같은 zone 이라 `next/link`(머리 · 레일이 다시 그려지지 않는다) · 모양은 `@repo/ui` 머리 링크
 * - zone 레이아웃이 `AppShell` `headerNav` 로 꽂는다 — `useSearchParams` 때문에 Suspense 안에서
 */
export const InvestHeaderNav = () => {
  const pathname = usePathname() ?? "/";
  const asset = useSearchParams()?.get(INVEST_ASSET_PARAM) ?? null;
  const krViewer = useKrMarketStatus().data?.status === "ok";
  const active = activeInvestMenu(pathname, asset);

  const items: AppNavigationItem[] = INVEST_MENU.filter((menu) => !menu.requiresKrViewer || krViewer).map((menu) => ({
    id: menu.id,
    label: menu.label,
    href: menu.href,
    icon: null,
    // 국내를 못 보는 사람이 `?asset=kr_stock` 으로 오면 보드가 코인을 그린다 — 메뉴도 코인
    active: menu.id === (active === InvestMenuId.Stock && !krViewer ? InvestMenuId.Crypto : active),
  }));

  return (
    <AppNavigationHeaderNav
      items={items}
      label={INVESTMENTS_PAGE_MESSAGES.headerNavLabel}
      renderLink={(item, { children, ...props }) => (
        <Link key={item.id} {...props} prefetch={false}>
          {children}
        </Link>
      )}
    />
  );
};
