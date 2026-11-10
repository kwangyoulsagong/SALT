import type { ReactNode } from "react";

import { Container } from "./AppShell.css";
import { appContent } from "./NarrowScreenNotice.css";
import { NarrowScreenNotice } from "./NarrowScreenNotice";
import { ProfileMenu } from "./ProfileMenu";
import { SpeculationRules } from "./SpeculationRules";
import { ZoneNavigation } from "./ZoneNavigation";

/**
 * 모든 화면을 감싸는 폭·여백 프레임.
 *
 * **`app` 레이어에 있는 이유:** 루트 `app/layout.tsx` 하나만 쓰고, 라우팅 파일은
 * `@/app` 과 `@/pages` 외에는 import 하지 않는다 (FR-25). 화면이 아니라 앱 껍데기다.
 *
 * 폭이 768 미만이면 본문 대신 좁은 화면 안내를 보인다(`FE-REQ-043`) — CSS 로만 가르므로 본문도 렌더는 된다
 * (숨겨질 뿐). 휴대폰 화면은 앱이 맡는다.
 *
 * 본문 바깥은 앱 내비게이션(`FE-REQ-054` · `FE-REQ-069`) — 1024 이상 왼쪽 레일 · 768~1023 하단 탭(도메인) · 머리 52(로고 · zone 메뉴 · 검색칸 · 계정 메뉴).
 * 메뉴(`headerNav`) · 검색칸(`headerSearch`)은 zone 이 꽂는다 — **투자 zone 만**(`FE-REQ-069` FR-2 · 3). 다른 zone 머리는 로고 · 계정
 * (~~기본은 투자 zone `/search` 링크~~ 2026-11-10 — 사용자 "검색은 투자에서만").
 * 공개 화면(로그인 · 온보딩)에는 없다. 앱 웹뷰는 네이티브 탭이 따로 있어 숨긴다(`AppShell.css.ts`).
 * zone 간 탭 prerender 규칙도 여기서 단다(로그인 상태 · Chromium 만).
 */
export const AppShell = ({
  children,
  headerNav,
  headerSearch,
}: {
  children: ReactNode;
  /** zone 머리 메뉴(`@repo/ui` `AppNavigationHeaderNav`) — 투자 zone 만 */
  headerNav?: ReactNode;
  /** 머리 검색칸 — 투자 zone 만 */
  headerSearch?: ReactNode;
}) => {
  return (
    <div className={Container}>
      {/* 모든 라우트의 main 랜드마크는 여기 하나다 — 페이지는 <main> 을 두지 않는다(중첩 금지). 좁은 화면에서는
          숨고 안내가 main 이 된다(axe landmark-one-main) */}
      <ZoneNavigation headerEnd={<ProfileMenu />} headerNav={headerNav} headerSearch={headerSearch}>
        <main className={appContent}>{children}</main>
      </ZoneNavigation>
      <NarrowScreenNotice />
      <SpeculationRules />
    </div>
  );
};

export default AppShell;
