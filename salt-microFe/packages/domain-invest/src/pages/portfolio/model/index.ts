import { privatePageMetadata } from "@repo/web-shared/config";

/**
 * 포트폴리오(`/portfolio`, `FE-REQ-069` FR-4) — 내 보유. 스켈레톤은 실제 블록 높이(보유 요약 칸 + 매입가 숨김 한 줄).
 * 이름은 "내 계좌"가 아니다 — 계좌 연동이 없고 손으로 적는다(연동 문구 금지)
 */
export const PORTFOLIO_PAGE = {
  title: "포트폴리오",
  blockName: "포트폴리오",
  blockMinHeight: 360,
} as const;

/** 내 보유 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata(PORTFOLIO_PAGE.title);
