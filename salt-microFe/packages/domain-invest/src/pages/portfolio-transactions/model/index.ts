import { privatePageMetadata } from "@repo/web-shared/config";

/**
 * 보유 기록 관리(`/portfolio/transactions`, F006 G절 2단계 · `FE-REQ-030` FR-106) — 적은 거래 목록 · 고치기 · 지우기.
 * 스켈레톤은 실제 블록 높이(머리 + 설명 + 몇 줄)
 */
export const PORTFOLIO_TRANSACTIONS_PAGE = {
  title: "보유 기록 관리",
  blockName: "보유 기록 관리",
  blockMinHeight: 320,
} as const;

/** 내 거래 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata(PORTFOLIO_TRANSACTIONS_PAGE.title);
