import { privatePageMetadata } from "@repo/web-shared/config";

/** 휴대폰 목표 상세 문구(`FE-REQ-072`) — 데스크톱 상세(`pages/goal-detail`)와 같은 말, 화면이 달라 따로 둔다 */
export const GOAL_DETAIL_MOBILE = {
  fallbackTitle: "목표",
  backTo: "저축",
  blockName: "저축 목표 상세",
  notFound: "이 목표를 찾을 수 없어요",
  signedOut: "로그인하면 목표를 볼 수 있어요",
  signIn: "로그인",
  planTitle: "지금 기준 계획",
  planMonthly: "매달 넣을 돈",
  planReach: "계획대로면",
  statusTitle: "이번 달 · 도달 · 넣지 않은 달",
  deposits: "최근 적립",
  noDeposits: "아직 적립 기록이 없어요",
  importedBalance: "옮겨 온 잔액",
  savedByChallenge: "챌린지로 아낀 돈",
  more: "더 보기",
  /** 하단 고정 버튼 · 시트 제목 — 누른 뒤 일이 보이게 */
  deposit: "넣기",
} as const;

export const metadata = privatePageMetadata("저축 목표");
