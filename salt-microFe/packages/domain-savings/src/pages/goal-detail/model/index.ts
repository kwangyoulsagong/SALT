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
  /** 가계부 챌린지에서 보탠 아낀 돈(F013 FR-19 · 가계부 S1d) — 실제 적립과 구분해 보인다 */
  savedByChallenge: "챌린지로 아낀 돈",
  /** 머리 첫 줄 — 뒤로 + 이동 경로(`FE-REQ-047` FR-10 · `BackNav`) */
  trailLabel: "위치",
  trailSavings: "저축",
  /** 알약 탭(`FE-REQ-060` FR-9 · `DetailTabs` `?view=`) */
  tabsLabel: "목표 보기",
  tabs: { progress: "진행", history: "기록", review: "회고" },
  /** 고정 열 360 — 1280 미만에선 마지막 탭 */
  aside: "넣기",
  statusTitle: "이번 달 · 도달 · 넣지 않은 달",
  balance: "목표 저울",
  balanceHint: "여러 목표의 월 계획을 옮겨 보기",
} as const;

export const metadata = privatePageMetadata("저축 목표");
