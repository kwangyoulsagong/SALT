import type { ReactNode } from "react";

import { RouteMain } from "../RouteMain";
import { MobileTabBar } from "./MobileTabBar";
import { content, frame } from "./MobileShell.css";

/**
 * 휴대폰 탭 화면 틀(`FE-REQ-071` FR-5) — 본문 한 열 + 하단 탭 넷. 서버 컴포넌트, 탭만 클라이언트 잎.
 * 데스크톱 `AppShell`(레일 · 머리 · 768 미만 안내)을 쓰지 않는다 — 휴대폰 분기를 데스크톱 화면에 넣지 않는다(`ADR-012`).
 */
export const MobileShell = ({ children }: { children: ReactNode }) => (
  <div className={frame}>
    <RouteMain className={content}>{children}</RouteMain>
    <MobileTabBar />
  </div>
);
