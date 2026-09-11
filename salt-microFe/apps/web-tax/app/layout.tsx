import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/styles/globals.css";

/**
 * tax zone 의 루트 레이아웃 (FE-REQ-008 FR-5).
 *
 * 서버 컴포넌트다. 이 zone 은 아직 전역 컨텍스트가 없다 — 콕핏 본체가 F002 에서
 * 생길 때 `src/app/providers` 를 추가한다 (default zone 과 같은 모양).
 *
 * > 루트 `app/` 은 라우팅이고 `src/app/` 은 FSD 초기화다 (`fsd-app.md`).
 */
export const metadata: Metadata = {
  title: "세금 마감 콕핏",
};

export default function TaxRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
