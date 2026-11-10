import { Suspense, type ReactNode } from "react";

import { AppShell, EMBED_SCRIPT, FONT_VARIABLES, VIEW_TRANSITION_CSS, ZoneProviders } from "@repo/web-shared/layout";
import { InvestHeaderNav } from "@repo/domain-invest/pages/investments";
import { SearchLauncher } from "@repo/domain-invest/pages/search";
import "@repo/web-shared/layout/globals.css";

/**
 * 투자 zone 루트 레이아웃 (FE-REQ-052 FR-7 → FE-REQ-053).
 *
 * 셸과 같은 껍데기다 — 프레임 · 768 미만 안내 · 앱 웹뷰 표지 · 전역 스타일은 `@repo/web-shared/layout` 하나에서 온다.
 * 다른 점은 프로바이더: React Query · 모션만 갖고 Redux(셸의 `auth` · `goal`)는 없다 — 투자 화면은 store 를 쓰지 않는다.
 * `data-zone` 은 셸 rewrites 가 이 앱에 닿았는지 확인하는 표지다. 머리 메뉴(코인 · 주식 · 포트폴리오 · 리포트 · 코치 설정)와 검색칸은 **이 zone 만** 있다
 * (`FE-REQ-069` FR-2 · 3 — 다른 zone 머리는 로고 · 계정. 검색 모달 `FE-REQ-066`).
 */
export { rootMetadata as metadata } from "@repo/web-shared/layout";

export default function InvestZoneLayout({ children }: { children: ReactNode }) {
  return (
    // 앱 웹뷰 판단 스크립트가 <html> 속성을 단다 — 그 한 곳의 불일치만 허용(셸과 같다)
    <html lang="ko" data-zone="invest" className={FONT_VARIABLES} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EMBED_SCRIPT }} />
        {/* zone 간 문서 이동을 전환으로 잇는다 — 탭 · 머리는 제자리(FE-REQ-054 FR-4) */}
        <style dangerouslySetInnerHTML={{ __html: VIEW_TRANSITION_CSS }} />
      </head>
      <body>
        <ZoneProviders>
          <AppShell
            headerNav={
              // 메뉴가 `useSearchParams` 를 읽는다 — 레이아웃 전체가 클라이언트로 미뤄지지 않게 이 잎만 경계 안에
              <Suspense fallback={null}>
                <InvestHeaderNav />
              </Suspense>
            }
            headerSearch={<SearchLauncher />}
          >
            {children}
          </AppShell>
        </ZoneProviders>
      </body>
    </html>
  );
}
