import { privatePageMetadata } from "@repo/web-shared/config";

export const NEW_EXPENSE_PAGE = {
  title: "지출 적기",
  back: "가계부로",
  mode: "적는 방법",
} as const;

export const metadata = privatePageMetadata("지출 적기");
