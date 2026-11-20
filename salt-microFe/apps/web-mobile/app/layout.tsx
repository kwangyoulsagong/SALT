import type { ReactNode } from "react";

import { ZoneProviders } from "@repo/web-shared/layout";
import "@repo/web-shared/layout/globals.css";
import { SURFACE_MOBILE } from "@repo/core/mobile";
import { RegisterServiceWorker } from "@repo/web-shared/layout/mobile";

/**
 * 휴대폰 zone 루트 레이아웃(`FE-REQ-071`). 데스크톱 `AppShell`(레일 · 머리 · 768 미만 안내)을 쓰지 않는다 — 탭 틀은 `app/m/(tabs)`.
 * 매니페스트 링크 · iOS 설치 메타 · `viewport-fit=cover` 는 여기(`/m`)에만 있다. `data-zone` 은 셸 rewrites 가 닿았는지 보는 표지.
 * `data-surface="mobile"` 은 데스크톱 · 휴대폰이 같이 쓰는 조각이 휴대폰 값(글자 13 · 누름 44)을 고르는 표지(`@repo/core/mobile` `ON_MOBILE`, `FE-REQ-072`) —
 * 서버 HTML 에 고정이라 옛 웹뷰처럼 첫 스크립트 · 수화 경고 예외가 없다.
 */
export { mobileMetadata as metadata, mobileViewport as viewport } from "@repo/web-shared/layout/mobile";

export default function MobileZoneLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" data-zone="mobile" data-surface={SURFACE_MOBILE}>
      <body>
        <ZoneProviders>{children}</ZoneProviders>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
