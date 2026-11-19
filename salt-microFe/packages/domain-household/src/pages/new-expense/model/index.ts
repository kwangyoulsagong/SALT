import { privatePageMetadata } from "@repo/web-shared/config";

export const NEW_EXPENSE_PAGE = {
  title: "지출 적기",
  back: "뒤로",
  trailLabel: "이동 경로",
  trailHousehold: "가계부",
  mode: "적는 방법",
  recent: "이 달 최근 쓴 내역",
  recentAll: "가계부에서 다 보기",
} as const;

export const metadata = privatePageMetadata("지출 적기");
