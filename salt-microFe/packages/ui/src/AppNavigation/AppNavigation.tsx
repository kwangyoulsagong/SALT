import type { ReactNode } from "react";

import {
  bottom,
  column,
  content,
  frame,
  header,
  headerSpacer,
  icon as iconClass,
  item as itemStyle,
  label as labelClass,
  rail,
  srOnly,
} from "./AppNavigation.css";

/**
 * 앱 내비게이션 — 왼쪽 레일(1024 이상) · 하단 탭(768~1023) · 머리 52 (`FE-REQ-054` FR-1, `ADR-005` §2 규칙 6).
 *
 * 서버 컴포넌트로 그릴 수 있게 상태를 갖지 않는다. 무엇이 지금 탭인지 · 링크가 같은 zone 인지는 부르는 쪽(zone 레이아웃)이
 * 정해서 넘긴다 — 이 패키지는 라우팅 · 레지스트리를 모른다(`design-system.md`). 링크 모양만 `renderLink` 로 바꿀 수 있다
 * (같은 zone 이면 `next/link`, 다른 zone 이면 `<a>`).
 *
 * 레일과 하단 탭은 같은 항목을 두 번 그리고 폭에 따라 하나만 보인다(`display: none` 인 쪽은 화면 리더에도 없다).
 * 각 조각에 `data-app-navigation` 을 달아 앱 웹뷰처럼 네이티브 탭이 따로 있는 곳에서 부르는 쪽이 통째로 숨길 수 있다.
 */
export interface AppNavigationItem {
  id: string;
  label: string;
  /** 20×20 아이콘 — `aria-hidden` 으로 넘긴다(이름은 `label`) */
  icon: ReactNode;
  href: string;
  active?: boolean;
  /** 지금 탭일 때 아이콘 색(도메인 색 토큰) */
  accentColor?: string;
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
  /** 내비게이션 이름(화면 리더) */
  label?: string;
  children: ReactNode;
}

export type AppNavigationPlacement = "rail" | "bottom";

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
  const body = (
    <>
      {/* 도메인 색은 지금 탭 아이콘에만 — 항목마다 다른 동적 값이라 inline(`component-convention.md`) */}
      <span className={iconClass} style={item.active && item.accentColor ? { color: item.accentColor } : undefined}>
        {item.icon}
      </span>
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
  label = "주요 메뉴",
  children,
}: AppNavigationProps) => (
  <div className={frame}>
    <nav aria-label={label} className={rail} data-app-navigation="rail">
      {items.map((item) => (
        <NavItem key={item.id} item={item} placement="rail" renderLink={renderLink} />
      ))}
    </nav>
    <div className={column}>
      <header className={header} data-app-navigation="header">
        {brand}
        <span className={headerSpacer} />
        {headerEnd}
      </header>
      <div className={content}>{children}</div>
    </div>
    <nav aria-label={label} className={bottom} data-app-navigation="bottom">
      {items.map((item) => (
        <NavItem key={item.id} item={item} placement="bottom" renderLink={renderLink} />
      ))}
    </nav>
  </div>
);

export default AppNavigation;
