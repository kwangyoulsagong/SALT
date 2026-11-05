import type { Metadata } from "next";
import type { ReactNode } from "react";

import { EMBED_SCRIPT, FONT_VARIABLES, PublicShell, rootMetadata, ZoneProviders } from "@repo/web-shared/layout";
import "@repo/web-shared/layout/globals.css";

/**
 * 금융 팁 zone 루트 레이아웃 (FE-REQ-052 FR-7 → FE-REQ-058). **유일한 공개 zone** — 앱 내비게이션 · 768 미만 안내 · 탭 prerender 없이
 * `PublicShell`(휴대폰 폭이 본문, FR-7). 문서 간 전환 `<style>` 도 달지 않는다: 탭이 없어 제자리에 남을 크롬이 없다.
 *
 * 색인 기본값은 **꺼짐** — 페이지가 서버 공개 플래그(법무 확인 기록)를 보고 켠다(수용 기준 4). 레이아웃이 켜 두면 페이지가 잊은 자리가 색인된다.
 * `data-zone` 은 셸 rewrites 가 이 앱에 닿았는지 확인하는 표지다.
 */
export const metadata: Metadata = { ...rootMetadata, robots: { index: false, follow: false } };

export default function TipsZoneLayout({ children }: { children: ReactNode }) {
  return (
    // 앱 웹뷰 판단 스크립트가 <html> 속성을 단다 — 그 한 곳의 불일치만 허용(셸과 같다)
    <html lang="ko" data-zone="tips" className={FONT_VARIABLES} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EMBED_SCRIPT }} />
      </head>
      <body>
        <ZoneProviders>
          <PublicShell>{children}</PublicShell>
        </ZoneProviders>
      </body>
    </html>
  );
}
