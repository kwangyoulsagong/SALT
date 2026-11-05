import type { ReactNode } from "react";

import { HeaderBrand } from "./HeaderBrand";
import { header, main, shell } from "./PublicShell.css";

/**
 * 공개 zone 껍데기(`FE-REQ-058` FR-7) — 금융 팁처럼 **검색으로 들어오는 화면** 하나.
 *
 * `AppShell` 과 다른 점 셋: 앱 내비게이션(레일 · 하단 탭 · 계정 메뉴)이 없고, **768 미만 안내를 띄우지 않으며**(휴대폰 폭이 본문 — `FE-REQ-043` 제외),
 * 탭 prerender 규칙을 달지 않는다(로그아웃 방문자가 대부분). 로고는 홈으로 — 로그인 전이면 셸이 로그인으로 보낸다.
 */
export const PublicShell = ({ children }: { children: ReactNode }) => (
  <div className={shell}>
    <header className={header}>
      <HeaderBrand />
    </header>
    <main className={main}>{children}</main>
  </div>
);

export default PublicShell;
