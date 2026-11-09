import type { ReactNode } from "react";

import {
  bottom,
  column,
  columnBare,
  content,
  frame,
  header,
  headerNav,
  headerSearch as headerSearchClass,
  headerSpacer,
  item as itemStyle,
  label as labelClass,
  srOnly,
  tile,
} from "./AppNavigation.css";

/**
 * 앱 내비게이션 — **머리 52 안 글자 내비**(1024 이상) · 하단 탭(768~1023) (`FE-REQ-067` — ~~왼쪽 레일~~ 2026-11-09 사용자 "참고 화면처럼 머리로",
 * `FE-REQ-054` FR-1 정정, `ADR-005` §2 규칙 6). 머리 = 로고 · 도메인 링크 · (여백) · 검색칸 · 계정.
 *
 * 서버 컴포넌트로 그릴 수 있게 상태를 갖지 않는다. 무엇이 지금 탭인지 · 링크가 같은 zone 인지는 부르는 쪽(zone 레이아웃)이
 * 정해서 넘긴다 — 이 패키지는 라우팅 · 레지스트리를 모른다(`design-system.md`). 링크 모양만 `renderLink` 로 바꿀 수 있다
 * (같은 zone 이면 `next/link`, 다른 zone 이면 `<a>`).
 *
 * 머리 링크 줄과 하단 탭은 같은 항목을 두 번 그리고 폭에 따라 하나만 보인다(`display: none` 인 쪽은 화면 리더에도 없다).
 * 각 조각에 `data-app-navigation` 을 달아 앱 웹뷰처럼 네이티브 탭이 따로 있는 곳에서 부르는 쪽이 통째로 숨길 수 있다.
 */
export interface AppNavigationItem {
  id: string;
  label: string;
  /** 아이콘 — `AppNavigationIcon` 을 넘긴다(하단 탭만 그린다 — 20, `aria-hidden`. 머리 링크는 글자만) */
  icon: ReactNode;
  href: string;
  active?: boolean;
  /** 눌리지 않는 탭 — 화면 리더 · 툴팁이 이 말을 같이 읽는다 */
  disabledReason?: string;
}

export interface AppNavigationLinkProps {
  href: string;
  className: string;
  "aria-current"?: "page";
  children: ReactNode;
}

export interface AppNavigationProps {
  items: readonly AppNavigationItem[];
  /** 링크 그리기 — 기본은 `<a>` */
  renderLink?: (item: AppNavigationItem, props: AppNavigationLinkProps) => ReactNode;
  /** 머리 왼쪽(로고) */
  brand?: ReactNode;
  /** 머리 오른쪽(계정 메뉴) */
  headerEnd?: ReactNode;
  /** 머리 오른쪽 계정 앞 검색칸(`FE-REQ-067` FR-2) — zone 이 꽂는다(투자 = 모달 열기 · 다른 zone = `/search` 로) */
  headerSearch?: ReactNode;
  /** 내비게이션 이름(화면 리더) — 문구는 부르는 쪽 몫(`i18n-policy.md`) */
  label: string;
  /**
   * 내비 없이 틀만 — 로그인 · 온보딩처럼 탭이 없는 화면. 틀(div 층)은 그대로 두고 조각만 비워,
   * 내비 있는 화면과 오갈 때 본문 트리가 다시 만들어지지 않게 한다(2026-11-03 리뷰)
   */
  bare?: boolean;
  children: ReactNode;
}

export type AppNavigationPlacement = "header" | "bottom";

const defaultRenderLink = (_item: AppNavigationItem, { children, ...props }: AppNavigationLinkProps) => (
  <a {...props}>{children}</a>
);

const NavItem = ({
  item,
  placement,
  renderLink,
}: {
  item: AppNavigationItem;
  placement: AppNavigationPlacement;
  renderLink: NonNullable<AppNavigationProps["renderLink"]>;
}) => {
  // 머리 링크는 글자만(실측 — 진하기로만 선택) · 하단 탭은 아이콘 + 라벨
  const body =
    placement === "header" ? (
      <>{item.label}</>
    ) : (
      <>
        <span className={tile}>{item.icon}</span>
        <span className={labelClass}>{item.label}</span>
      </>
    );

  if (item.disabledReason) {
    return (
      <span className={itemStyle({ placement, state: "disabled" })} aria-disabled="true" title={item.disabledReason}>
        {body}
        <span className={srOnly}>{item.disabledReason}</span>
      </span>
    );
  }

  return (
    <>
      {renderLink(item, {
        href: item.href,
        className: itemStyle({ placement, state: item.active ? "active" : "idle" }),
        "aria-current": item.active ? "page" : undefined,
        children: body,
      })}
    </>
  );
};

export const AppNavigation = ({
  items,
  renderLink = defaultRenderLink,
  brand,
  headerEnd,
  headerSearch,
  label,
  bare = false,
  children,
}: AppNavigationProps) => (
  // 자리(null 포함)는 bare 여부와 상관없이 같다 — 본문(`content`)이 늘 같은 위치라 다시 마운트되지 않는다
  <div className={frame}>
    <div className={bare ? columnBare : column} data-app-navigation-column="">
      {bare ? null : (
        <header className={header} data-app-navigation="header">
          {brand}
          <nav aria-label={label} className={headerNav}>
            {items.map((item) => (
              <NavItem key={item.id} item={item} placement="header" renderLink={renderLink} />
            ))}
          </nav>
          <span className={headerSpacer} />
          {headerSearch ? <div className={headerSearchClass}>{headerSearch}</div> : null}
          {headerEnd}
        </header>
      )}
      <div className={content}>{children}</div>
    </div>
    {bare ? null : (
      <nav aria-label={label} className={bottom} data-app-navigation="bottom">
        {items.map((item) => (
          <NavItem key={item.id} item={item} placement="bottom" renderLink={renderLink} />
        ))}
      </nav>
    )}
  </div>
);

export { AppNavigationIcon, type AppNavigationIconName } from "./AppNavigationIcon";
export {
  AppNavigationSearch,
  APP_NAVIGATION_SEARCH_KEY,
  type AppNavigationSearchProps,
} from "./AppNavigationSearch";
export { isTypingTarget } from "./isTypingTarget";

export default AppNavigation;
