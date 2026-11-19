"use client";

// 클라이언트 잎: 주간 계획 조회 · 체크 · 저장이 브라우저 쪽이다(포트폴리오 본문과 같은 이유 — `PortfolioBody`).
import dynamic from "next/dynamic";

import { SignInRequired } from "@repo/web-shared/ui";

import { PLAN_PAGE_META } from "../model";

const Board = dynamic(() => import("@/widgets/weekly-plan").then((mod) => mod.WeeklyPlanBoard), {
  ssr: false,
  loading: () => null,
});

/** 로그인 없이 오면 유리막(`FE-REQ-070` FR-7) — 적립은 사람 칸 */
export const PlanBody = () => (
  <SignInRequired what={PLAN_PAGE_META.title} minHeight={PLAN_PAGE_META.blockMinHeight}>
    <Board />
  </SignInRequired>
);
