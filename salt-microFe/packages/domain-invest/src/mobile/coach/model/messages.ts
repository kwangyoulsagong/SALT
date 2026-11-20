import { privatePageMetadata } from "@repo/web-shared/config";

/** 휴대폰 코치 리포트 문구(`FE-REQ-072` FR-3) */
export const COACH_REPORT_MOBILE = {
  title: "코치 리포트",
  backTo: "투자",
} as const;

/** 내 보유 · 판단 리포트 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata(COACH_REPORT_MOBILE.title);
