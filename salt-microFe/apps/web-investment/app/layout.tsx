import type { ReactNode } from "react";

/**
 * 투자 zone 루트 레이아웃 — 빈 골격 (FE-REQ-052 FR-7).
 *
 * `data-zone` 은 셸 rewrites 가 이 앱에 닿았는지 확인하는 표지다(셸 경유 404 문서에 남는다).
 * 크롬(`AppChrome`)과 화면은 `@repo/domain-invest` 가 생길 때 붙는다.
 */
export default function InvestZoneLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" data-zone="invest">
      <body>{children}</body>
    </html>
  );
}
