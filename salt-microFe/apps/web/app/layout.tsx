import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import AppProviders from "@/app/providers/AppProviders";
import Layout from "@/components/Layout";

/**
 * default zone 의 루트 레이아웃 (FE-REQ-008 FR-1 · FR-2).
 *
 * **이 파일은 서버 컴포넌트다.** `<html>`·`<body>` 껍데기와 전역 스타일만 두고,
 * 컨텍스트가 필요한 것은 전부 `AppProviders`(`"use client"`) 안으로 밀어 넣는다.
 * Pages Router 의 `_document.tsx` + `_app.tsx` 가 하던 일을 둘로 나눈 것이다.
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
          <Layout>{children}</Layout>
        </AppProviders>
      </body>
    </html>
  );
}
