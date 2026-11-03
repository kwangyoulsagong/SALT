import { privatePageMetadata } from "@repo/web-shared/config";

/** 목표 상세 문구 — 사실만 */
export const GOAL_DETAIL_PAGE = {
  back: "목표 목록",
  blockName: "저축 목표 상세",
  notFound: "이 목표를 찾을 수 없어요",
  signedOut: "로그인하면 목표를 볼 수 있어요",
  planTitle: "지금 기준 계획",
  planMonthly: "매달 넣을 돈",
  planReach: "계획대로면",
  deposits: "최근 적립",
  noDeposits: "아직 적립 기록이 없어요",
  importedBalance: "옮겨 온 잔액",
} as const;

export const metadata = privatePageMetadata("저축 목표");
