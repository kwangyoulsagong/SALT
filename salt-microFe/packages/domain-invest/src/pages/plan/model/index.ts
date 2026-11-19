import { privatePageMetadata } from "@repo/web-shared/config";

/**
 * 밴드 적립(`/plan`, F003 v2 순서 3 · `FE-REQ-022` 개정) — 이번 주 금액 · 근거 · 과거 성적 · 빗나간 때.
 * 스켈레톤은 실제 블록 높이(큰 숫자 + 자산 둘 한 줄 + 체크 칸)
 */
export const PLAN_PAGE_META = {
  title: "적립",
  blockName: "이번 주 적립",
  blockMinHeight: 360,
} as const;

/** 내 적립 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata(PLAN_PAGE_META.title);
