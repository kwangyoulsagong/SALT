import type { ReactNode } from "react";

import { AppShell, EMBED_SCRIPT, FONT_VARIABLES, VIEW_TRANSITION_CSS, ZoneProviders } from "@repo/web-shared/layout";
import "@repo/web-shared/layout/globals.css";

/**
 * 저축 zone 루트 레이아웃 (FE-REQ-052 FR-7 → FE-REQ-056). 투자 zone 과 같은 껍데기 — 프레임 · 앱 내비게이션 · 전환은 `@repo/web-shared/layout`.
 * `data-zone` 은 셸 rewrites 가 이 앱에 닿았는지 확인하는 표지다.
 */
export { rootMetadata as metadata } from "@repo/web-shared/layout";

export default function SavingsZoneLayout({ children }: { children: ReactNode }) {
  return (
    // 앱 웹뷰 판단 스크립트가 <html> 속성을 단다 — 그 한 곳의 불일치만 허용(셸과 같다)
    <html lang="ko" data-zone="savings" className={FONT_VARIABLES} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EMBED_SCRIPT }} />
        {/* zone 간 문서 이동을 전환으로 잇는다 — 탭 · 머리는 제자리(FE-REQ-054 FR-4) */}
        <style dangerouslySetInnerHTML={{ __html: VIEW_TRANSITION_CSS }} />
      </head>
      <body>
        <ZoneProviders>
          <AppShell>{children}</AppShell>
        </ZoneProviders>
      </body>
    </html>
  );
}
