import { privatePageMetadata } from "@repo/web-shared/config";

export const BUDGET_PAGE = {
  title: "예산",
  back: "뒤로",
  trailLabel: "이동 경로",
  trailHousehold: "가계부",
  side: "예산 도구",
  categories: "내 분류",
} as const;

export const metadata = privatePageMetadata("예산");
