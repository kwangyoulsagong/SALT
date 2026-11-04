import { privatePageMetadata } from "@repo/web-shared/config";

export const BUDGET_PAGE = {
  title: "예산",
  back: "가계부로",
  categories: "내 분류",
} as const;

export const metadata = privatePageMetadata("예산");
