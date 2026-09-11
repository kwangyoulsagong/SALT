import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders, AppShell } from "@/app";
import "@/app/styles/globals.css";

/**
 * default zone 의 루트 레이아웃 (FE-REQ-008 FR-1 · FR-2).
 *
 * **이 파일은 서버 컴포넌트다.** `<html>`·`<body>` 껍데기와 전역 스타일만 두고,
 * 컨텍스트가 필요한 것은 전부 `AppProviders`(`"use client"`) 안으로 밀어 넣는다.
 *
 * > 루트 `app/` 은 라우팅이고 `src/app/` 은 FSD 초기화다 (`fsd-app.md`).
 * > `layout.tsx` 는 라우팅 파일 중 유일하게 껍데기를 갖는다 — 그 외 파일은 re-export 만 한다.
 */
export const metadata: Metadata = {
  title: "SALT",
  description: "투자 코치",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
