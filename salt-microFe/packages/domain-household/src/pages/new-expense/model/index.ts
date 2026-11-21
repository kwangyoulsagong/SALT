import { privatePageMetadata } from "@repo/web-shared/config";

export const NEW_EXPENSE_PAGE = {
  title: "지출 적기",
  back: "뒤로",
  trailLabel: "이동 경로",
  glanceTitle: "이번 달 지금까지",
  trailHousehold: "가계부",
  mode: "적는 방법",
  recent: "이 달 최근 쓴 내역",
  recentAll: "가계부에서 다 보기",
  /** 사이드 빈 목록 — 카드 판에서 머리만 있는 빈 카드가 되던 자리(`FE-REQ-076` 2단계) */
  recentEmpty: "이 달에 적은 지출이 아직 없어요. 여기서 적으면 바로 보여요",
} as const;

export const metadata = privatePageMetadata("지출 적기");
