import type { ReactNode } from "react";

import { ZoneProviders } from "@repo/web-shared/layout";
import "@repo/web-shared/layout/globals.css";
import { RegisterServiceWorker } from "@repo/web-shared/layout/mobile";

/**
 * 휴대폰 zone 루트 레이아웃(`FE-REQ-071`). 데스크톱 `AppShell`(레일 · 머리 · 768 미만 안내)을 쓰지 않는다 — 탭 틀은 `app/m/(tabs)`.
 * 매니페스트 링크 · iOS 설치 메타 · `viewport-fit=cover` 는 여기(`/m`)에만 있다. `data-zone` 은 셸 rewrites 가 닿았는지 보는 표지.
 */
export { mobileMetadata as metadata, mobileViewport as viewport } from "@repo/web-shared/layout/mobile";

export default function MobileZoneLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" data-zone="mobile">
      <body>
        <ZoneProviders>{children}</ZoneProviders>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
