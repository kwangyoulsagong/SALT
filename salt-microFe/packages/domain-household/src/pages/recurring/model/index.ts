import { privatePageMetadata } from "@repo/web-shared/config";

export const RECURRING_PAGE = {
  back: "가계부로",
} as const;

/** 내 고정 지출이 보이는 화면 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata("매달 나가는 돈");
